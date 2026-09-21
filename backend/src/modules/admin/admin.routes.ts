import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/authenticate.ts';
import {
  cancelTrip,
  createDriver,
  createStore,
  createStoreRider,
  creditStoreBalance,
  deleteDriver,
  deleteStore,
  getLiveOps,
  getOverview,
  getStore,
  getTrip,
  listPayments,
  listStores,
  listTrips,
  listUsers,
  listWallets,
  patchStore,
  patchUser,
  resetUserPassword,
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
  category: z.enum(['LOCAL', 'STATE', 'MOTO', 'DELIVERY_STATE']).optional(),
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

const createStoreRiderSchema = z.object({
  phone: z.string().min(7),
  password: z.string().min(6).max(64),
  firstName: z.string().min(1).max(40).optional(),
  lastName: z.string().min(1).max(40).optional(),
  storeId: z.string().uuid(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6).max(64),
});

const STORE_CATEGORIES = [
  'GROCERY',
  'MINI_MART',
  'PRODUCE',
  'BUTCHER',
  'FISH',
  'BAKERY',
  'COFFEE',
  'RESTAURANT',
  'JUICE',
  'PHARMACY',
  'COSMETICS',
  'ELECTRONICS',
  'FASHION',
  'HARDWARE',
  'WATER_GAS',
  'FLOWERS',
  'OTHER',
] as const;

const storeListQuery = z.object({
  q: z.string().optional(),
  category: z.enum(STORE_CATEGORIES).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === true || v === 'true')),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

const createStoreSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.enum(STORE_CATEGORIES),
  phone: z.string().min(7).max(20).optional(),
  ownerName: z.string().min(1).max(60).optional(),
  address: z.string().min(1).max(160).optional(),
  district: z.string().min(1).max(60).optional(),
  description: z.string().max(300).optional(),
});

const patchStoreSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.enum(STORE_CATEGORIES).optional(),
  phone: z.string().min(7).max(20).nullable().optional(),
  ownerName: z.string().max(60).nullable().optional(),
  address: z.string().max(160).nullable().optional(),
  district: z.string().max(60).nullable().optional(),
  description: z.string().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
});

const creditStoreSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().max(160).optional(),
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

  app.post('/riders', async (request, reply) => {
    try {
      const body = createStoreRiderSchema.parse(request.body ?? {});
      const rider = await createStoreRider(body);
      return reply.code(201).send(rider);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Select a store and enter phone + password',
          details: error.issues,
        });
      }
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not create store rider', code: error.code });
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

  app.post('/users/:id/password', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = resetPasswordSchema.parse(request.body ?? {});
      return await resetUserPassword(id, body.password);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Password must be at least 6 characters',
          details: error.issues,
        });
      }
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not reset password', code: error.code });
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

  app.get('/wallets', async (request, reply) => {
    try {
      return await listWallets();
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message || 'Could not load wallets' });
    }
  });

  app.get('/settings', async () => getPlatformSettings());

  app.patch('/settings', async (request, reply) => {
    try {
      const body = z
        .object({
          driverFeePercent: z.coerce.number().min(0).max(30).optional(),
          stateDriverPayout: z.coerce.number().min(0).max(50).optional(),
        })
        .refine((value) => value.driverFeePercent != null || value.stateDriverPayout != null, {
          message: 'Enter a Moto fee or a Delivery State driver payout',
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

  app.get('/stores', async (request) => {
    const query = storeListQuery.parse(request.query);
    return listStores(query);
  });

  app.get('/stores/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await getStore(id);
    } catch (error: any) {
      return reply
        .code(error.statusCode || 404)
        .send({ error: error.message || 'Store not found', code: error.code });
    }
  });

  app.post('/stores/:id/credit', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = creditStoreSchema.parse(request.body ?? {});
      return await creditStoreBalance(id, body);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Enter a positive amount',
          details: error.issues,
        });
      }
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not credit store', code: error.code });
    }
  });

  app.post('/stores', async (request, reply) => {
    try {
      const body = createStoreSchema.parse(request.body ?? {});
      const store = await createStore(body);
      return reply.code(201).send(store);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Enter store name and type',
          details: error.issues,
        });
      }
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not create store', code: error.code });
    }
  });

  app.patch('/stores/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = patchStoreSchema.parse(request.body ?? {});
      return await patchStore(id, body);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.code(400).send({
          error: error.issues?.[0]?.message || 'Invalid store fields',
          details: error.issues,
        });
      }
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not update store', code: error.code });
    }
  });

  app.delete('/stores/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await deleteStore(id);
    } catch (error: any) {
      return reply
        .code(error.statusCode || 400)
        .send({ error: error.message || 'Could not delete store', code: error.code });
    }
  });
}
