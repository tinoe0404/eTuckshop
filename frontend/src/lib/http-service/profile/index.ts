import { apiClient } from '../apiClient';
import { updateProfileSchema, changePasswordSchema } from './schema';
import type { UpdateProfilePayload, ChangePasswordPayload, ProfileResponse } from './types';
import { ZodError } from 'zod';
import type { ApiResponse } from '@/types';

export async function getProfile(): Promise<ProfileResponse> {
    try {
        const response = await apiClient.get<ApiResponse<ProfileResponse>>(
            '/profile',
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to fetch profile');
        }

        return response.data.data;
    } catch (error) {
        console.error('Get profile error:', error);
        throw error instanceof Error ? error : new Error('Failed to fetch profile');
    }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
    try {
        const validated = updateProfileSchema.parse(payload);

        const response = await apiClient.put<ApiResponse<ProfileResponse>>(
            '/profile',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to update profile');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid profile data');
        }

        console.error('Update profile error:', error);
        throw error instanceof Error ? error : new Error('Failed to update profile');
    }
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    try {
        const validated = changePasswordSchema.parse(payload);

        const response = await apiClient.put<ApiResponse<{ message: string }>>(
            '/profile/change-password',
            validated,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to change password');
        }

        return response.data.data;
    } catch (error) {
        if (error instanceof ZodError) {
            const firstError = error.issues[0];
            throw new Error(firstError?.message || 'Invalid password data');
        }

        console.error('Change password error:', error);
        throw error instanceof Error ? error : new Error('Failed to change password');
    }
}

