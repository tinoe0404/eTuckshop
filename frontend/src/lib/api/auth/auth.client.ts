import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type {
    SignupPayload,
    ForgotPasswordPayload,
    ResetPasswordPayload,
    AuthResponse,
    PasswordResetResponse,
} from './auth.types';

/**
 * Authentication Service Class
 * Handles all authentication-related HTTP requests
 */
export class AuthService extends BaseAPIRequests {
    /**
     * Register a new user account
     * 
     * @param payload - User registration data (name, email, password, role)
     * @returns Newly created user object wrapped in APIResponse
     * @throws {APIError} If registration fails
     * 
     * @example
     * ```typescript
     * const response = await authService.signup({
     *   name: 'John Doe',
     *   email: 'john@example.com',
     *   password: 'SecurePass123',
     *   role: 'CUSTOMER'
     * });
     * console.log('User created:', response.data.user);
     * ```
     */
    async signup(payload: SignupPayload): Promise<APIResponse<AuthResponse>> {
        return this.post<AuthResponse>('/auth/register', payload);
    }

    /**
     * Request a password reset email
     * Sends an email with a reset token to the user's email address
     * 
     * @param email - User's email address
     * @returns Success message wrapped in APIResponse
     * @throws {APIError} If request fails
     * 
     * @example
     * ```typescript
     * const response = await authService.forgotPassword('john@example.com');
     * console.log(response.message); // \"Password reset email sent\"
     * ```
     */
    async forgotPassword(email: string): Promise<APIResponse<null>> {
        return this.post<null>('/auth/forgot-password', { email });
    }

    /**
     * Reset password using token from email
     * 
     * @param payload - Reset token and new password
     * @returns Success message wrapped in APIResponse
     * @throws {APIError} If reset fails
     * 
     * @example
     * ```typescript
     * const response = await authService.resetPassword({
     *   token: 'abc123...',
     *   newPassword: 'NewSecurePass123'
     * });
     * console.log(response.message); // \"Password reset successful\"
     * ```
     */
    async resetPassword(payload: ResetPasswordPayload): Promise<APIResponse<null>> {
        return this.post<null>('/auth/reset-password', {
            token: payload.token,
            newPassword: payload.newPassword,
        });
    }
}

// Export singleton instance
export const authService = new AuthService(apiClient, apiHeaderService);
