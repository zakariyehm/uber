import { z } from 'zod';

export const registerSchema = z.object({
  phone: z.string().min(7),
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['RIDER']).default('RIDER'),
});

export const loginSchema = z
  .object({
    phone: z.string().min(7).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6),
  })
  .refine((data) => Boolean(data.phone || data.email), {
    message: 'Phone or email is required',
  });

export const requestOtpSchema = z.object({
  phone: z.string().min(7),
  purpose: z.enum(['LOGIN', 'REGISTER']).default('LOGIN'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(4),
  purpose: z.enum(['LOGIN', 'REGISTER']).default('LOGIN'),
});

export const completeProfileSchema = z.object({
  verificationToken: z.string().min(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  state: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE']),
  role: z.enum(['RIDER']).default('RIDER'),
});
