import { z } from 'zod';

export const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(50).optional(),
    email: z.string().trim().email().optional(),
    image: z.string().url().optional().nullable(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128)
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
