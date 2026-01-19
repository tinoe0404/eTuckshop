import { z } from 'zod';
import { updateProfileSchema, changePasswordSchema } from './schema';

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

export type User = {
    readonly id: number;
    readonly name: string;
    readonly email: string;
    readonly role: 'ADMIN' | 'CUSTOMER';
    readonly image: string | null;
    readonly createdAt: string;
    readonly updatedAt: string;
};

export type ProfileResponse = User;
