/**
 * Registration DTO Schema
 * Validates new customer registration payloads using Zod schema verifiers.
 */
import { z } from 'zod';

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  cnic: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
