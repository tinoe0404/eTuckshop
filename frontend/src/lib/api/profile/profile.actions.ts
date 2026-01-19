'use server';

import { revalidatePath } from 'next/cache';
import { profileService } from './profile.client';
import { updateProfileSchema, changePasswordSchema } from './profile.schemas';
import type { User } from '../auth/auth.types';
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

export async function updateProfileAction(prevState: any, formData: FormData): Promise<APIResponse<User | null>> {
    try {
        const payload = {
            name: formData.get('name') as string || undefined,
            email: formData.get('email') as string || undefined,
            image: formData.get('image') as string || undefined,
        };
        const validated = updateProfileSchema.parse(payload);
        const response = await profileService.updateProfile(validated);
        revalidatePath('/profile');
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
        console.error('[updateProfileAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update profile',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function changePasswordAction(prevState: any, formData: FormData): Promise<APIResponse<{ message: string } | null>> {
    try {
        const payload = {
            currentPassword: formData.get('currentPassword') as string,
            newPassword: formData.get('newPassword') as string,
        };
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
        console.error('[changePasswordAction] Error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to change password',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
