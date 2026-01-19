import { z } from 'zod';

export const updateProfileSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(2, { message: 'Name must be at least 2 characters' })
        .max(50, { message: 'Name must not exceed 50 characters' }),

    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .email({ message: 'Enter a valid email address' })
        .transform((val) => val.toLowerCase()),

    image: z
        .string()
        .url({ message: 'Image must be a valid URL' })
        .optional()
        .nullable(),
});

export const changePasswordSchema = z.object({
    currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, { message: 'Current password is required' }),

    newPassword: z
        .string({ required_error: 'New password is required' })
        .min(8, { message: 'Password must be at least 8 characters' })
        .regex(/[A-Z]/, { message: 'Password must contain an uppercase letter' })
        .regex(/[a-z]/, { message: 'Password must contain a lowercase letter' })
        .regex(/[0-9]/, { message: 'Password must contain a number' }),
});
