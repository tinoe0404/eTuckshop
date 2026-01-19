import { z } from 'zod';

export const updateProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must not exceed 50 characters'),

    email: z
        .string()
        .trim()
        .email('Enter a valid email address')
        .transform((val) => val.toLowerCase()),

    image: z
        .string()
        .url('Image must be a valid URL')
        .optional()
        .nullable(),
});

export const changePasswordSchema = z.object({
    currentPassword: z
        .string()
        .min(1, 'Current password is required'),

    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[0-9]/, 'Password must contain a number'),
});


