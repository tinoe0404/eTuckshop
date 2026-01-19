'use server';

import { revalidatePath } from 'next/cache';
import { profileService } from './profile.client';
import { updateProfileSchema, changePasswordSchema } from './profile.schemas';
import type { User } from '../auth/auth.types';
import type { UpdateProfilePayload, ChangePasswordPayload } from './profile.types';
import type { APIResponse } from '../client/types';
import { ZodError } from 'zod';

export async function getProfileAction(): Promise<APIResponse<User | null>> {
    try {
        return await profileService.getProfile();
    } catch (error) {
        console.error('[getProfileAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch profile',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Update Profile (JSON)
 */
export async function updateProfile(payload: UpdateProfilePayload): Promise<APIResponse<User | null>> {
    try {
        const validated = updateProfileSchema.parse(payload);
        const response = await profileService.updateProfile(validated);
        revalidatePath('/profile');
        revalidatePath('/admin/profile');
        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: error.issues[0]?.message || 'Invalid profile data',
                data: null,
                error: error.issues[0]?.message,
            };
        }
        console.error('[updateProfile] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update profile',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Change Password (JSON)
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<APIResponse<{ message: string } | null>> {
    try {
        const validated = changePasswordSchema.parse(payload);
        return await profileService.changePassword(validated);
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: error.issues[0]?.message || 'Invalid password data',
                data: null,
                error: error.issues[0]?.message,
            };
        }
        console.error('[changePassword] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to change password',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Keep Form Actions for backward compatibility if needed, but JSON is preferred for this client
export async function updateProfileAction(prevState: any, formData: FormData): Promise<APIResponse<User | null>> {
    // ... maps to updateProfile logic ...
    const payload = {
        name: formData.get('name') as string || undefined,
        email: formData.get('email') as string || undefined,
        image: formData.get('image') as string || undefined,
    };
    return updateProfile(payload);
}

export async function changePasswordAction(prevState: any, formData: FormData): Promise<APIResponse<{ message: string } | null>> {
    const payload = {
        currentPassword: formData.get('currentPassword') as string,
        newPassword: formData.get('newPassword') as string,
    };
    return changePassword(payload);
}
