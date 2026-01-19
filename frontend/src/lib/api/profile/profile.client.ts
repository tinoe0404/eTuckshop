import { BaseAPIRequests } from '../client/BaseAPIRequests';
import { apiClient } from '../client/apiClient';
import { apiHeaderService } from '../client/apiHeaderService';
import type { APIResponse } from '../client/types';
import type { User } from '../auth/auth.types';
import type { UpdateProfilePayload, ChangePasswordPayload } from './profile.types';

export class ProfileService extends BaseAPIRequests {
    async getProfile(): Promise<APIResponse<User>> {
        return this.get<User>('/profile');
    }

    async updateProfile(payload: UpdateProfilePayload): Promise<APIResponse<User>> {
        return this.patch<User>('/profile', payload);
    }

    async changePassword(payload: ChangePasswordPayload): Promise<APIResponse<{ message: string }>> {
        return this.post<{ message: string }>('/profile/change-password', payload);
    }
}

export const profileService = new ProfileService(apiClient, apiHeaderService);
