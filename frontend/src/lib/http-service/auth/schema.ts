import { z } from 'zod';

/**
 * Schema for user signup/registration
 * Validates name, email, password with comprehensive rules
 */
export const signupSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(2, { message: 'Name must be at least 2 characters' })
        .max(50, { message: 'Name must not exceed 50 characters' })
        .regex(/^[a-zA-Z\s'-]+$/, {
            message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
        }),

    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .min(1, { message: 'Email is required' })
        .max(100, { message: 'Email must not exceed 100 characters' })
        .email({ message: 'Enter a valid email address' })
        .refine((val) => !val.includes(' '), {
            message: 'Email must not contain spaces',
        })
        .transform((val) => val.toLowerCase()),

    password: z
        .string({ required_error: 'Password is required' })
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(128, { message: 'Password must not exceed 128 characters' })
        .regex(/[A-Z]/, {
            message: 'Password must contain at least one uppercase letter',
        })
        .regex(/[a-z]/, {
            message: 'Password must contain at least one lowercase letter',
        })
        .regex(/[0-9]/, {
            message: 'Password must contain at least one number',
        }),

    role: z
        .enum(['CUSTOMER', 'ADMIN'], {
            errorMap: () => ({ message: 'Role must be CUSTOMER or ADMIN' }),
        })
        .optional()
        .default('CUSTOMER'),
});

/**
 * Schema for forgot password request
 * Validates email address for password reset
 */
export const forgotPasswordSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .min(1, { message: 'Email is required' })
        .email({ message: 'Enter a valid email address' })
        .transform((val) => val.toLowerCase()),
});

/**
 * Schema for password reset with token
 * Validates reset token and new password
 */
export const resetPasswordSchema = z.object({
    token: z
        .string({ required_error: 'Reset token is required' })
        .min(1, { message: 'Reset token is required' }),

    newPassword: z
        .string({ required_error: 'New password is required' })
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(128, { message: 'Password must not exceed 128 characters' })
        .regex(/[A-Z]/, {
            message: 'Password must contain at least one uppercase letter',
        })
        .regex(/[a-z]/, {
            message: 'Password must contain at least one lowercase letter',
        })
        .regex(/[0-9]/, {
            message: 'Password must contain at least one number',
        }),
});

/**
 * Schema for login credentials
 * Used with NextAuth credentials provider
 */
export const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .min(1, { message: 'Email is required' })
        .email({ message: 'Enter a valid email address' })
        .transform((val) => val.toLowerCase()),

    password: z
        .string({ required_error: 'Password is required' })
        .min(1, { message: 'Password is required' }),
});
