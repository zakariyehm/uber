import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.ts';
import { authenticate, requireDriver } from '../../middleware/authenticate.ts';
import {
  applyDeliveryAction,
  createDelivery,
  declineDeliveryForDriver,
  getById,
  getByOrderId,
  listForDriver,
  listForRider,
  listPending,
  listPendingForDriver,
} from './deliveries.service.ts';
import { createDeliverySchema, deliveryActionSchema } from './deliveries.schemas.ts';

export async function deliveryRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    try {
      const body = createDeliverySchema.parse(request.body);
      let riderUserId: string | undefined;
      try {
        await request.jwtVerify();
        riderUserId = request.user.sub;
      } catch {
        riderUserId = undefined;
      }
      const created = await createDelivery(body, riderUserId);
      return reply.code(201).send(created);
    } catch (error: any) {
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not create delivery', code: 'delivery/create_failed' });
    }
  });

  /** Authenticated drivers get Uber-filtered offers; others get raw pending list. */
  app.get('/pending', async (request) => {
    try {
      await request.jwtVerify();
      if (request.user.role === 'DRIVER') {
        return listPendingForDriver(request.user.sub);
      }
    } catch {
      // public pending fallback
    }
    return listPending();
  });

  app.get('/mine', { preHandler: authenticate }, async (request) => {
    return listForRider(request.user.sub);
  });

  app.get('/driver/mine', { preHandler: requireDriver }, async (request) => {
    return listForDriver(request.user.sub);
  });

  app.post('/:id/decline', { preHandler: requireDriver }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await declineDeliveryForDriver(id, request.user.sub);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ error: error.message || 'Decline failed' });
    }
  });

  app.get('/order/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const row = await getByOrderId(orderId);
    if (!row) return reply.code(404).send({ error: 'Delivery not found' });
    return row;
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await getById(id);
    if (!row) return reply.code(404).send({ error: 'Delivery not found' });
    return row;
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = deliveryActionSchema.parse(request.body);
    let actor: { id: string; name?: string } | undefined;

    try {
      await request.jwtVerify();
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
        include: { driverProfile: true },
      });
      if (user) {
        actor = {
          id: user.id,
          name:
            user.driverProfile?.displayName ||
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            'Driver',
        };
      }
    } catch {
      if (body.driverId) {
        actor = { id: body.driverId, name: body.driverName };
      }
    }

    try {
      return await applyDeliveryAction(id, body.action, actor, {
        cancelledBy: body.cancelledBy,
        cancelReason: body.cancelReason,
      });
    } catch (error: any) {
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Action failed', code: 'delivery/action_failed' });
    }
  });

  app.put('/drivers/me/online', { preHandler: requireDriver }, async (request) => {
    const body = (request.body as { isOnline?: boolean }) ?? {};
    const profile = await prisma.driverProfile.update({
      where: { userId: request.user.sub },
      data: { isOnline: Boolean(body.isOnline) },
    });
    return { isOnline: profile.isOnline };
  });

  app.get('/drivers/me/online', { preHandler: requireDriver }, async (request) => {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: request.user.sub },
    });
    return { isOnline: Boolean(profile?.isOnline) };
  });

  app.put('/drivers/me/active', { preHandler: authenticate }, async (request) => {
    const body = (request.body as { requestId?: string | null }) ?? {};
    const row = await prisma.driverActiveDelivery.upsert({
      where: { driverUserId: request.user.sub },
      update: { requestId: body.requestId || null },
      create: { driverUserId: request.user.sub, requestId: body.requestId || null },
    });
    return { requestId: row.requestId };
  });

  app.get('/drivers/me/active', { preHandler: authenticate }, async (request) => {
    const row = await prisma.driverActiveDelivery.findUnique({
      where: { driverUserId: request.user.sub },
    });
    return { requestId: row?.requestId ?? null };
  });
}
