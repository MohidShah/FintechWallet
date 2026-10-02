/**
 * Fund Transfer DTO Schema
 * Addresses W2 (Server-Derived Sender Identity).
 * Sender ID is strictly derived from server JWT claim (req.user.sub), NEVER accepted from request body.
 */
import { z } from 'zod';

export const TransferSchema = z.object({
  receiverEmail: z.string().email('Valid receiver email address required'),
  amount: z.number().positive('Transfer amount must be greater than 0'),
  note: z.string().max(250, 'Note cannot exceed 250 characters').optional(),
  stepUpPassword: z.string().optional(),
  // W2 Defense: If client attempts to inject a senderId in request body, Zod validation strips/ignores it!
  senderId: z.string().optional().transform(() => undefined),
});

export type TransferDto = z.infer<typeof TransferSchema>;
