import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.ts';
import { AuthError, loginUser, registerUser, toPublicUser } from './auth.service.ts';
import { completeOtpProfile, requestOtp, verifyOtp } from './otp.service.ts';
import {
  completeProfileSchema,
  loginSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from './auth.schemas.ts';
import { authenticate } from '../../middleware/authenticate.ts';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const raw = request.body as { role?: string };
    if (raw?.role === 'DRIVER') {
      return reply.code(403).send({
        error: 'Driver accounts are created by Raac operations',
        code: 'auth/driver-invite-only',
      });
    }
    const body = registerSchema.parse(request.body);
    try {
      const user = await registerUser({
        ...body,
        password: body.password ?? `otp-${Date.now()}`,
        role: 'RIDER',
      });
      const token = await reply.jwtSign({ sub: user.id, role: user.role, phone: user.phone });
      return reply.code(201).send({ token, user: toPublicUser(user) });
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    try {
      const user = await loginUser({
        phone: body.phone,
        email: body.email,
        password: body.password,
      });
      const token = await reply.jwtSign({ sub: user.id, role: user.role, phone: user.phone });
      return { token, user: toPublicUser(user) };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({
          error: error.message,
          code: error.code,
          ...(error.driverName ? { driverName: error.driverName } : {}),
        });
      }
      throw error;
    }
  });

  app.post('/otp/request', async (request, reply) => {
    const body = requestOtpSchema.parse(request.body);
    try {
      const result = await requestOtp(body.phone, body.purpose);
      return result;
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({
          error: error.message,
          code: error.code,
          ...(error.driverName ? { driverName: error.driverName, riderName: error.driverName } : {}),
        });
      }
      throw error;
    }
  });

  app.post('/otp/verify', async (request, reply) => {
    const body = verifyOtpSchema.parse(request.body);
    try {
      const result = await verifyOtp(body.phone, body.code, body.purpose);
      const existing = result.user;
      if (existing && existing.firstName) {
        const token = await reply.jwtSign({
          sub: existing.id,
          role: existing.role,
          phone: existing.phone,
        });
        return { isNewUser: false, token, user: toPublicUser(existing) };
      }

      const verificationToken = await reply.jwtSign(
        {
          sub: 'otp',
          role: 'RIDER',
          phone: result.phone,
          typ: 'otp',
          purpose: body.purpose,
        },
        { expiresIn: '15m' }
      );
      return {
        isNewUser: !existing,
        verificationToken,
        phone: result.phone,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({
          error: error.message,
          code: error.code,
          ...(error.driverName ? { driverName: error.driverName, riderName: error.driverName } : {}),
        });
      }
      throw error;
    }
  });

  app.post('/otp/complete', async (request, reply) => {
    const body = completeProfileSchema.parse(request.body);
    try {
      const payload = app.jwt.verify<{ phone: string; typ?: string }>(body.verificationToken);
      if (payload.typ !== 'otp' || !payload.phone) {
        throw new AuthError('Invalid verification token', 'auth/otp-invalid', 401);
      }
      const user = await completeOtpProfile({
        phone: payload.phone,
        firstName: body.firstName,
        lastName: body.lastName,
        state: body.state,
        gender: body.gender,
        role: 'RIDER',
      });
      const token = await reply.jwtSign({
        sub: user.id,
        role: user.role,
        phone: user.phone,
      });
      return { token, user };
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      throw error;
    }
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        driverProfile: true,
        riderProfile: { include: { store: true } },
      },
    });
    if (!user) {
      return reply.code(401).send({
        error: 'Account not found.',
        code: 'auth/user-not-found',
      });
    }
    if (!user.isActive) {
      const accountName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        (user.role === 'DRIVER' ? 'Driver' : user.role === 'RIDER' ? 'Rider' : 'User');
      const kind = user.role === 'DRIVER' ? 'driver' : user.role === 'RIDER' ? 'rider' : 'account';
      return reply.code(403).send({
        error: `This ${kind} account is disabled.`,
        code: 'auth/user-disabled',
        driverName: accountName,
        riderName: accountName,
      });
    }
    return { user: toPublicUser(user) };
  });
}
