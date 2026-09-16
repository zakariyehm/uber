import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  /** Waafi PreAuthorization — set WAAFI_MOCK=true for local testing without live keys. */
  WAAFI_API_URL: z.string().default('https://api.waafipay.net/asm'),
  WAAFI_MERCHANT_UID: z.string().optional(),
  WAAFI_API_USER_ID: z.string().optional(),
  WAAFI_API_KEY: z.string().optional(),
  WAAFI_CURRENCY: z.string().default('USD'),
  WAAFI_MOCK: z
    .string()
    .optional()
    .transform((v) => v === '1' || v?.toLowerCase() === 'true'),
});

export const env = envSchema.parse(process.env);
