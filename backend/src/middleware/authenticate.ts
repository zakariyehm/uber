import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.ts';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized', code: 'auth/unauthorized' });
  }
}

export async function requireDriver(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.user.role !== 'DRIVER') {
    return reply.code(403).send({ error: 'Driver account required', code: 'auth/forbidden' });
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { isActive: true, firstName: true, lastName: true },
  });

  if (!user) {
    return reply.code(401).send({
      error: 'Account not found.',
      code: 'auth/user-not-found',
    });
  }

  if (!user.isActive) {
    const driverName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Driver';
    return reply.code(403).send({
      error: 'This driver account is disabled.',
      code: 'auth/user-disabled',
      driverName,
    });
  }
}

export async function requireRider(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.user.role !== 'RIDER') {
    return reply.code(403).send({ error: 'Rider account required', code: 'auth/forbidden' });
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { isActive: true, firstName: true, lastName: true },
  });

  if (!user) {
    return reply.code(401).send({
      error: 'Account not found.',
      code: 'auth/user-not-found',
    });
  }

  if (!user.isActive) {
    const riderName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Rider';
    return reply.code(403).send({
      error: 'This rider account is disabled.',
      code: 'auth/user-disabled',
      riderName,
      driverName: riderName,
    });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Admin account required', code: 'auth/forbidden' });
  }
}
