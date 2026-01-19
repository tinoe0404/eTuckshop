'use server';

import { authService } from './auth.client';
import { signupSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schemas';
import type { SignupPayload, ResetPasswordPayload, AuthResponse } from './auth.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

/**
 * Server Action: User Signup/Registration
 * Validates input and creates a new user account
 * 
 * @param payload - User registration data
 * @returns APIResponse with user data or error
 */
export async function signupAction(
    prevState: any,
    formData: FormData
): Promise<APIResponse<AuthResponse | null>> {
    try {
        // Extract form data
        const payload = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            role: (formData.get('role') as 'CUSTOMER' | 'ADMIN') || 'CUSTOMER',
        };

        // Validate with Zod
        const validated = signupSchema.parse(payload);

        // Call service
        const response = await authService.signup(validated);

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid input data',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[signupAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create account',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Forgot Password Request
 * Sends password reset email to user
 * 
 * @param email - User's email address
 * @returns APIResponse with success message or error
 */
export async function forgotPasswordAction(
    prevState: any,
    formData: FormData
): Promise<APIResponse<null>> {
    try {
        // Extract email from form data
        const email = formData.get('email') as string;

        // Validate with Zod
        const validated = forgotPasswordSchema.parse({ email });

        // Call service
        const response = await authService.forgotPassword(validated.email);

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid email address',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[forgotPasswordAction] Error:', error);
        return {
            success: false,
            message: 'Failed to send password reset email',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Server Action: Reset Password
 * Resets user password using token from email
 * 
 * @param payload - Reset token and new password
 * @returns APIResponse with success message or error
 */
export async function resetPasswordAction(
    prevState: any,
    formData: FormData
): Promise<APIResponse<null>> {
    try {
        // Extract form data
        const payload = {
            token: formData.get('token') as string,
            newPassword: formData.get('newPassword') as string,
        };

        // Validate with Zod
        const validated = resetPasswordSchema.parse(payload);

        // Call service
        const response = await authService.resetPassword(validated);

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            return {
                success: false,
                message: firstError?.message || 'Invalid input data',
                data: null,
                error: firstError?.message,
            };
        }

        console.error('[resetPasswordAction] Error:', error);
        return {
            success: false,
            message: 'Failed to reset password',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
