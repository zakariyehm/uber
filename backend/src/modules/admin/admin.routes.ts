import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/authenticate.ts';
import {
  cancelTrip,
  createDriver,
  deleteDriver,
  getLiveOps,
  getOverview,
  getTrip,
  listPayments,
  listTrips,
  listUsers,
  listWallets,
  patchUser,
} from './admin.service.ts';
import { getPlatformSettings, patchPlatformSettings } from './settings.service.ts';
import {
  createServiceMethod,
  deleteServiceMethod,
  listAdminMethods,
  patchServiceMethod,
} from '../catalog/catalog.service.ts';

const listQuery = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  method: z.string().optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'BICYCLE']).optional(),
  role: z.enum(['RIDER', 'DRIVER']).optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

const patchUserSchema = z.object({
  isActive: z.boolean().optional(),
  forceOffline: z.boolean().optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'BICYCLE']).optional(),
});

const cancelSchema = z.object({
  reason: z.string().min(2).max(80).optional(),
});

const createDriverSchema = z.object({
  phone: z.string().min(7),
  password: z.string().min(6).max(64),
  firstName: z.string().min(1).max(40).optional(),
  lastName: z.string().min(1).max(40).optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'BICYCLE']),
});

const methodQuery = z.object({
  category: z.enum(['MOTO', 'DELIVERY_STATE']).optional(),
});

function parseMoney(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return Number.NaN;
}

const priceSchema = z
  .union([z.number(), z.string()])
  .transform(parseMoney)
  .pipe(z.number().gt(0, 'Price must be greater than 0').max(999));

const createMethodSchema = z.object({
  category: z.enum(['MOTO', 'DELIVERY_STATE']).optional(),
  name: z.string().min(2).max(60),
  timeLabel: z.string().min(2).max(60),
  price: priceSchema,
  icon: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'BICYCLE']).optional(),
});

const patchMethodSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  timeLabel: z.string().min(2).max(60).optional(),
  price: priceSchema.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  vehicleType: z.enum(['MOTORCYCLE', 'BICYCLE']).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    await requireAdmin(request, reply);
  });

  app.get('/overview', async () => getOverview());
  app.get('/live', async () => getLiveOps());

  app.get('/trips', async (request) => {
    const query = listQuery.parse(request.query);
    return listTrips(query);
  });

  app.get('/trips/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await getTrip(id);
    if (!row) return reply.code(404).send({ error: 'Trip not found' });
    return row;
  });

  app.post('/trips/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = cancelSchema.parse(request.body ?? {});
    try {
      return await cancelTrip(id, body.reason);
    } catch (error: any) {
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not cancel trip' });
    }
  });

  app.get('/users', async (request) => {
    const query = listQuery.parse(request.query);
    return listUsers(query);
  });

  app.post('/drivers', async (request, reply) => {
    try {
      const body = createDriverSchema.parse(request.body ?? {});
      const driver = await createDriver(body);
      return reply.code(201).send(driver);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Choose motorcycle or bicycle',
          details: error.issues,
        });
      }
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not create driver', code: error.code });
    }
  });

  app.patch('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = patchUserSchema.parse(request.body ?? {});
    try {
      return await patchUser(id, body);
    } catch (error: any) {
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not update user' });
    }
  });

  app.delete('/drivers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteDriver(id);
    } catch (error: any) {
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not delete driver' });
    }
  });

  app.get('/payments', async (request) => {
    const query = listQuery.parse(request.query);
    return listPayments(query);
  });

  app.get('/wallets', async () => listWallets());

  app.get('/settings', async () => getPlatformSettings());

  app.patch('/settings', async (request, reply) => {
    try {
      const body = z
        .object({
          driverFeePercent: z.coerce.number().min(0).max(30),
        })
        .parse(request.body ?? {});
      return await patchPlatformSettings(body);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Enter a fee between 0 and 30',
          details: error.issues,
        });
      }
      return reply.code(error.statusCode || 400).send({ error: error.message || 'Could not save fee' });
    }
  });

  app.get('/methods', async (request) => {
    const query = methodQuery.parse(request.query);
    return listAdminMethods(query.category);
  });

  app.post('/methods', async (request, reply) => {
    try {
      const body = createMethodSchema.parse(request.body ?? {});
      const method = await createServiceMethod(body);
      return reply.code(201).send(method);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Enter a valid name, time, and price',
          details: error.issues,
        });
      }
      return reply.code(error.statusCode || 400).send({ error: error.message || 'Could not create method' });
    }
  });

  app.patch('/methods/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = patchMethodSchema.parse(request.body ?? {});
      return await patchServiceMethod(id, body);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Invalid price or time',
          details: error.issues,
        });
      }
      return reply.code(error.statusCode || 400).send({ error: error.message || 'Could not update method' });
    }
  });

  app.delete('/methods/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteServiceMethod(id);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ error: error.message || 'Could not delete method' });
    }
  });
}
