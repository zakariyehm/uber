import { z } from 'zod';

export const createDeliverySchema = z.object({
  orderId: z.string().min(3),
  pickupLocation: z.string().min(1),
  destinationLocation: z.string().min(1),
  recipientName: z.string().min(1),
  recipientNumber: z.string().min(1),
  itemType: z.string().min(1),
  deliveryMethod: z.string().min(1),
  deliveryPrice: z.string().min(1),
  senderName: z.string().optional(),
  senderPhone: z.string().min(7, 'Sender phone required for Waafi'),
  referenceId: z.string().optional(),
  deliveryTimeLabel: z.string().optional(),
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
    'confirm_received',
    'cancel',
  ]),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  cancelledBy: z.enum(['driver', 'rider', 'system']).optional(),
  cancelReason: z.string().max(120).optional(),
});
