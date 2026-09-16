import type { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireDriver(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.user.role !== 'DRIVER') {
    return reply.code(403).send({ error: 'Driver account required' });
  }
}

export async function requireRider(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.user.role !== 'RIDER') {
    return reply.code(403).send({ error: 'Rider account required' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Admin account required' });
  }
}
