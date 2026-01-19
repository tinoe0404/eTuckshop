import { z } from 'zod';

export const analyticsDateRangeSchema = z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Start date must be in YYYY-MM-DD format',
    }),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'End date must be in YYYY-MM-DD format',
    }),
}).refine(
    (data) => new Date(data.start) <= new Date(data.end),
    {
        message: 'Start date must be before or equal to end date',
        path: ['start'],
    }
);
