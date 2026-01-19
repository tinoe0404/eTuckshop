import { z } from 'zod';
import { updateProfileSchema, changePasswordSchema } from './profile.schemas';
import type { User } from '../auth/auth.types';

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>;

export type ProfileResponse = User;
