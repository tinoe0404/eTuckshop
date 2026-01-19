// ============================================
// FILE: src/hooks/admin/useAnalytics.ts (NEW)
// ============================================

import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getDashboardStats } from '@/lib/http-service/analytics';
import { queryKeys } from '@/lib/api/queryKeys';
import { REALTIME_QUERY_DEFAULTS } from '@/lib/api/queryConfig';

/**
 * ✅ Hook: Fetch detailed analytics data
 * Used in: /admin/analytics page
 * - Auto-refreshes every 30s
 * - Accepts optional date range filters
 */
export const useAnalyticsData = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.analytics.detail(params),
    // @ts-ignore - params matching
    queryFn: () => getAnalytics(params),
    ...REALTIME_QUERY_DEFAULTS, // Auto-refresh, always fresh
  });
};

/**
 * ✅ Hook: Fetch dashboard summary stats
 * Used in: /admin/dashboard page
 * - Auto-refreshes every 30s
 * - No filters needed
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: getDashboardStats,
    ...REALTIME_QUERY_DEFAULTS,
  });
};