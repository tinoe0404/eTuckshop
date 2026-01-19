import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type { User } from '../auth/auth.types';
import type { UpdateProfilePayload, ChangePasswordPayload } from './profile.types';

export class ProfileService extends BaseAPIRequests {
    /**
     * Get current user profile
     * Uses /auth/me which returns the authenticated user (via X-User-Id)
     */
    async getProfile(): Promise<APIResponse<User>> {
        return this.get<User>('/auth/me');
    }

    /**
     * Update user profile
     * Backend expects PUT /auth/profile/update
     */
    async updateProfile(payload: UpdateProfilePayload): Promise<APIResponse<User>> {
        return this.put<User>('/auth/profile/update', payload);
    }

    /**
     * Change password
     * Backend expects PUT /auth/password
     */
    async changePassword(payload: ChangePasswordPayload): Promise<APIResponse<{ message: string }>> {
        return this.put<{ message: string }>('/auth/password', payload);
    }
}

export const profileService = new ProfileService(apiClient, apiHeaderService);
