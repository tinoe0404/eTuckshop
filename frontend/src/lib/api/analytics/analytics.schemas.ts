// Minimal schemas for analytics - expand as needed
import { z } from 'zod';

export const analyticsDateRangeSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
