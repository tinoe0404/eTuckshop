import { z } from 'zod';

/**
 * Schema for user signup/registration
 * Validates name, email, password with comprehensive rules
 */
export const signupSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must not exceed 50 characters')
        .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

    email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .max(100, 'Email must not exceed 100 characters')
        .email('Enter a valid email address')
        .refine((val) => !val.includes(' '), 'Email must not contain spaces')
        .transform((val) => val.toLowerCase()),

    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),

    role: z
        .enum(['CUSTOMER', 'ADMIN'])
        .optional()
        .default('CUSTOMER'),
});

/**
 * Schema for forgot password request
 * Validates email address for password reset
 */
export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .email('Enter a valid email address')
        .transform((val) => val.toLowerCase()),
});

/**
 * Schema for password reset with token
 * Validates reset token and new password
 */
export const resetPasswordSchema = z.object({
    token: z
        .string()
        .min(1, 'Reset token is required'),

    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

/**
 * Schema for login credentials
 * Used with NextAuth credentials provider
 */
export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Email is required')
        .email('Enter a valid email address')
        .transform((val) => val.toLowerCase()),

    password: z
        .string()
        .min(1, 'Password is required'),
});
