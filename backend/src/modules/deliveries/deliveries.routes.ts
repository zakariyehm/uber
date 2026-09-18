import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.ts';
import { authenticate, requireDriver } from '../../middleware/authenticate.ts';
import {
  clearDriverPresence,
  getDriverPresence,
  upsertDriverPresence,
} from '../../lib/driver-presence.ts';
import { persistDriverLocation } from '../../lib/driver-locations.ts';
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
import {
  createDeliverySchema,
  deliveryActionSchema,
  driverLocationSchema,
} from './deliveries.schemas.ts';

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

  app.put('/drivers/me/online', { preHandler: requireDriver }, async (request, reply) => {
    const body = (request.body as {
      isOnline?: boolean;
      latitude?: number;
      longitude?: number;
    }) ?? {};
    const isOnline = Boolean(body.isOnline);
    const profile = await prisma.driverProfile.update({
      where: { userId: request.user.sub },
      data: { isOnline },
    });

    if (!isOnline) {
      await clearDriverPresence(request.user.sub);
      return { isOnline: false };
    }

    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return reply.code(400).send({
        error: 'latitude and longitude are required to go online',
        code: 'driver/location_required',
      });
    }

    await upsertDriverPresence({
      driverUserId: request.user.sub,
      latitude: lat,
      longitude: lng,
      vehicleType: profile.vehicleType,
      status: 'AVAILABLE',
      offerId: null,
    });
    await persistDriverLocation({
      driverUserId: request.user.sub,
      latitude: lat,
      longitude: lng,
      status: 'AVAILABLE',
      vehicleType: profile.vehicleType,
    });

    return { isOnline: true };
  });

  app.get('/drivers/me/online', { preHandler: requireDriver }, async (request) => {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: request.user.sub },
    });
    return { isOnline: Boolean(profile?.isOnline) };
  });

  /** Heartbeat while online — keeps Redis H3 + PostGIS fresh. */
  app.put('/drivers/me/location', { preHandler: requireDriver }, async (request, reply) => {
    const body = driverLocationSchema.parse(request.body);
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: request.user.sub },
    });
    if (!profile) {
      return reply.code(404).send({ error: 'Driver profile not found' });
    }
    if (!profile.isOnline) {
      return reply.code(409).send({
        error: 'Go online before sending location',
        code: 'driver/offline',
      });
    }

    const previous = await getDriverPresence(request.user.sub);
    const keepStatus =
      previous?.status === 'OFFERED' || previous?.status === 'BUSY'
        ? previous.status
        : 'AVAILABLE';

    const presence = await upsertDriverPresence({
      driverUserId: request.user.sub,
      latitude: body.latitude,
      longitude: body.longitude,
      vehicleType: profile.vehicleType,
      status: keepStatus,
      offerId: keepStatus === 'OFFERED' ? previous?.offerId ?? null : null,
    });

    await persistDriverLocation({
      driverUserId: request.user.sub,
      latitude: body.latitude,
      longitude: body.longitude,
      status: presence?.status || keepStatus,
      vehicleType: profile.vehicleType,
    });

    return {
      ok: true,
      h3Index: presence?.h3Index,
      status: presence?.status || keepStatus,
    };
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
