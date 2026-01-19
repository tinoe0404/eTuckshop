import { z } from 'zod';
import {
    signupSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    loginSchema,
} from './auth.schemas';

// ============================================
// BRANDED TYPES
// ============================================

/**
 * Branded type for User IDs to prevent mixing with other ID types
 */
export type UserId = number & { readonly __brand: 'UserId' };

// ============================================
// PAYLOAD TYPES (Inferred from Schemas)
// ============================================

/**
 * Payload for user signup/registration
 * Inferred from signupSchema for type-schema alignment
 * 
 * @example
 * ```typescript
 * const payload: SignupPayload = {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   password: 'SecurePass123',
 *   role: 'CUSTOMER'
 * };
 * ```
 */
export type SignupPayload = z.infer<typeof signupSchema>;

/**
 * Payload for forgot password request
 * 
 * @example
 * ```typescript
 * const payload: ForgotPasswordPayload = {
 *   email: 'john@example.com'
 * };
 * ```
 */
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>;

/**
 * Payload for password reset with token
 * 
 * @example
 * ```typescript
 * const payload: ResetPasswordPayload = {
 *   token: 'abc123...',
 *   newPassword: 'NewSecurePass123'
 * };
 * ```
 */
export type ResetPasswordPayload = z.infer<typeof resetPasswordSchema>;

/**
 * Payload for login credentials
 */
export type LoginPayload = z.infer<typeof loginSchema>;

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * User object returned from authentication endpoints
 * 
 * @property id - Unique identifier for the user
 * @property name - User's full name
 * @property email - User's email address (lowercase)
 * @property role - User's role in the system
 * @property image - Optional profile image URL
 * @property emailVerified - Date email was verified (null if not verified)
 * @property createdAt - ISO timestamp of account creation
 * @property updatedAt - ISO timestamp of last update
 */
export type User = {
    readonly id: number;
    readonly name: string;
    readonly email: string;
    readonly role: 'ADMIN' | 'CUSTOMER';
    readonly image?: string | null;
    readonly emailVerified?: Date | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

/**
 * Response from signup endpoint
 * 
 * @property user - The newly created user object
 */
export type AuthResponse = {
    readonly user: User;
};

/**
 * Response from password reset request
 */
export type PasswordResetResponse = {
    readonly success: boolean;
    readonly message: string;
};

/**
 * Error response from auth endpoints
 */
export type AuthErrorResponse = {
    readonly error: string;
    readonly message: string;
    readonly statusCode: number;
};
