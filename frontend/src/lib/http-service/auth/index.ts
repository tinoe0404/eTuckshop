import { apiClient } from '../apiClient';
import {
    signupSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from './schema';
import type {
    SignupPayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    AuthResponse,
    PasswordResetResponse,
} from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

// ============================================
// AUTH API CLIENT
// ============================================

/**
 * Register a new user account
 * 
 * @param payload - User registration data (name, email, password, role)
 * @returns Newly created user object
 * @throws {Error} If validation fails or registration errors
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await signup({
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     password: 'SecurePass123',
 *     role: 'CUSTOMER'
 *   });
 *   console.log('User created:', result.user);
 * } catch (error) {
 *   console.error('Signup failed:', error.message);
 * }
 * ```
 */
export async function signup(payload: SignupPayload): Promise<AuthResponse> {
    try {
        // Validate payload with Zod
        const validated = signupSchema.parse(payload);

        // Make API request
        const response = await apiClient.post<ApiResponse<AuthResponse>>(
            '/auth/signup',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        // Check response success
        if (!response.data.success) {
            throw new Error(response.data.message || 'Signup failed');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid input data');
        }

        console.error('Signup error:', error);
        throw error instanceof Error
            ? error
            : new Error('Failed to create account. Please try again.');
    }
}

/**
 * Request a password reset email
 * Sends an email with a reset token to the user's email address
 * 
 * @param email - User's email address
 * @returns Success message
 * @throws {Error} If validation fails or request errors
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await forgotPassword('john@example.com');
 *   console.log(result.message); // "Password reset email sent"
 * } catch (error) {
 *   console.error('Request failed:', error.message);
 * }
 * ```
 */
export async function forgotPassword(
    email: string
): Promise<PasswordResetResponse> {
    try {
        // Validate email
        const validated = forgotPasswordSchema.parse({ email });

        // Make API request
        const response = await apiClient.post<ApiResponse<null>>(
            '/auth/forgot-password',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        return {
            success: response.data.success,
            message: response.data.message || 'Password reset email sent',
        };
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid email address');
        }

        console.error('Forgot password error:', error);
        throw new Error('Failed to send password reset email. Please try again.');
    }
}

/**
 * Reset password using token from email
 * 
 * @param payload - Reset token and new password
 * @returns Success message
 * @throws {Error} If validation fails or reset errors
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await resetPassword({
 *     token: 'abc123...',
 *     newPassword: 'NewSecurePass123'
 *   });
 *   console.log(result.message); // "Password reset successful"
 * } catch (error) {
 *   console.error('Reset failed:', error.message);
 * }
 * ```
 */
export async function resetPassword(
    payload: ResetPasswordPayload
): Promise<PasswordResetResponse> {
    try {
        // Validate payload
        const validated = resetPasswordSchema.parse(payload);

        // Make API request
        const response = await apiClient.post<ApiResponse<null>>(
            '/auth/reset-password',
            {
                token: validated.token,
                newPassword: validated.newPassword,
            },
            { signal: AbortSignal.timeout(10000) }
        );

        return {
            success: response.data.success,
            message: response.data.message || 'Password reset successful',
        };
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.errors[0];
            throw new Error(firstError?.message || 'Invalid input data');
        }

        console.error('Reset password error:', error);
        throw new Error('Failed to reset password. Please try again or request a new reset link.');
    }
}

// ============================================
// NOTE: Login and Logout
// ============================================
// Login is handled by NextAuth via signIn("credentials", { email, password })
// Logout is handled by NextAuth via signOut()
// These are not API calls but NextAuth client methods
