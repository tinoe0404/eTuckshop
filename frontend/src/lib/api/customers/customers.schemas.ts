// Customers domain - minimal implementation
import { z } from 'zod';

export const customerIdSchema = z.number().int().positive();
