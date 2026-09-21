import { z } from 'zod';

export const createDeliverySchema = z
  .object({
    orderId: z.string().min(3).optional(),
    pickupLocation: z.string().min(1),
    pickupLat: z.number().finite().optional(),
    pickupLng: z.number().finite().optional(),
    destinationLocation: z.string().min(1),
    recipientName: z.string().min(1),
    recipientNumber: z.string().min(1),
    itemType: z.string().min(1),
    deliveryMethod: z.string().min(1),
    deliveryPrice: z.string().min(1),
    senderName: z.string().optional(),
    senderPhone: z.string().min(7).optional(),
    /** Personal name+phone, or a registered store. */
    senderKind: z.enum(['PERSONAL', 'STORE']).optional().default('PERSONAL'),
    storeId: z.string().uuid().optional(),
    storeOrderCode: z.string().min(1).optional(),
    storeBranchLocation: z.string().min(1).optional(),
    /** Who Waafi charges: sender at checkout, or recipient at dropoff. */
    payerType: z.enum(['SENDER', 'RECIPIENT']).optional().default('SENDER'),
    referenceId: z.string().optional(),
    deliveryTimeLabel: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.senderKind === 'STORE') {
      if (!data.storeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select a store',
          path: ['storeId'],
        });
      }
      if (!data.storeOrderCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Store order ID is required',
          path: ['storeOrderCode'],
        });
      }
      if (!data.storeBranchLocation?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Store branch location is required',
          path: ['storeBranchLocation'],
        });
      }
    } else if (!data.senderName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sender name is required',
        path: ['senderName'],
      });
    }

    if (data.payerType === 'SENDER' && data.senderKind !== 'STORE' && !data.senderPhone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sender phone required for Waafi',
        path: ['senderPhone'],
      });
    }
  });

export const driverLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  isOnline: z.boolean().optional(),
});

export const deliveryActionSchema = z.object({
  action: z.enum([
    'accept',
    'picked_up',
    'start',
    'complete',
    'request_payment',
    'mark_arrived',
    'confirm_arrival',
    'confirm_pickup',
    'confirm_store_handoff',
    'confirm_received',
    'cancel',
  ]),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  cancelledBy: z.enum(['driver', 'rider', 'system']).optional(),
  cancelReason: z.string().max(120).optional(),
});
