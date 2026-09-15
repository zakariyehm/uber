import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
});

export const env = envSchema.parse(process.env);
