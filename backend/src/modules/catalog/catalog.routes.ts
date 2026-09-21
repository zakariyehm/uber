import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { listPublicMethods, listPublicStores } from './catalog.service.ts';

const querySchema = z.object({
  category: z.enum(['MOTO', 'DELIVERY_STATE']).optional(),
});

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/methods', async (request) => {
    const query = querySchema.parse(request.query);
    return { methods: await listPublicMethods(query.category) };
  });

  app.get('/stores', async () => {
    return { stores: await listPublicStores() };
  });
}
