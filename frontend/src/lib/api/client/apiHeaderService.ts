import { getSession } from 'next-auth/react';

/**
 * API Header Service
 * Provides methods to get authentication and common headers
 */
export class APIHeaderService {
    /**
     * Get authentication headers for API requests
     * @returns Headers object with user ID and signature
     */
    async getAuthHeaders(): Promise<Record<string, string>> {
        const session = await getSession();
        const headers: Record<string, string> = {};

        if (session?.user?.id) {
            headers['X-User-Id'] = String(session.user.id);

            if (session.user.signature) {
                headers['X-User-Signature'] = session.user.signature;
            }
        }

        return headers;
    }

    /**
     * Get common headers for all requests
     */
    get commonHeaders() {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        } as const;
    }
}

// Export singleton instance
export const apiHeaderService = new APIHeaderService();
