// ============================================
// FILE: src/lib/api/queryConfig.ts
// ============================================

/**
 * ✅ BEST PRACTICE: Shared query/mutation defaults
 * 
 * This file centralizes all React Query configuration to prevent:
 * - Inconsistent caching behavior across components
 * - Duplicate configuration in every query
 * - Hard-to-track performance issues
 * 
 * Usage:
 * import { QUERY_DEFAULTS, REALTIME_QUERY_DEFAULTS } from '@/lib/api/queryConfig';
 * 
 * useQuery({
 *   queryKey: [...],
 *   queryFn: [...],
 *   ...QUERY_DEFAULTS, // Spread the defaults
 * });
 */

export const QUERY_DEFAULTS = {
    /**
     * staleTime: How long data is considered fresh (no refetch needed)
     * - 5 minutes is good for product catalogs, user profiles
     * - Data older than this triggers background refetch
     */
    staleTime: 5 * 60 * 1000, // 5 minutes
    
    /**
     * gcTime: How long unused data stays in cache (formerly cacheTime)
     * - 10 minutes means data persists even after component unmounts
     * - Good for back/forward navigation
     */
    gcTime: 10 * 60 * 1000, // 10 minutes
    
    /**
     * refetchOnWindowFocus: Refetch when user returns to tab
     * - false = Better UX (no loading spinners when switching tabs)
     * - true = Always fresh data (use for critical data)
     */
    refetchOnWindowFocus: false,
    
    /**
     * retry: How many times to retry failed requests
     * - 1 = Retry once (good balance)
     * - false = Never retry (use for non-critical data)
     * - 3 = Default (too aggressive for most apps)
     */
    retry: 1,
    
    /**
     * refetchOnMount: Refetch when component mounts
     * - false = Use cached data if fresh
     * - true = Always refetch (wasteful)
     * - "always" = Refetch even if stale
     */
    refetchOnMount: false,
  } as const;
  
  /**
   * ✅ REALTIME_QUERY_DEFAULTS
   * 
   * For admin dashboards, order status, inventory levels
   * - Auto-refreshes every 30 seconds
   * - Refetches when user returns to tab
   * - Keeps data ultra-fresh
   * 
   * Use cases:
   * - Admin dashboard stats
   * - Order management panel
   * - Live inventory tracking
   * - Payment status monitoring
   */
  export const REALTIME_QUERY_DEFAULTS = {
    ...QUERY_DEFAULTS,
    
    staleTime: 30 * 1000, // 30 seconds (data goes stale quickly)
    
    /**
     * refetchInterval: Auto-refetch in background
     * - 30 seconds keeps dashboard "live"
     * - ⚠️ Only use for critical admin views
     */
    refetchInterval: 30 * 1000, // Auto-refetch every 30s
    
    refetchOnWindowFocus: true, // Always fresh when returning to tab
    refetchOnMount: true, // Always fetch latest on mount
  } as const;
  
  /**
   * ✅ STATIC_QUERY_DEFAULTS
   * 
   * For data that rarely changes
   * - Categories (added/removed infrequently)
   * - App settings
   * - User roles/permissions
   * - Product categories
   * 
   * Benefits:
   * - Reduces server load
   * - Faster page loads (less network requests)
   * - Better offline experience
   */
  export const STATIC_QUERY_DEFAULTS = {
    ...QUERY_DEFAULTS,
    
    staleTime: 30 * 60 * 1000, // 30 minutes (very long freshness)
    gcTime: 60 * 60 * 1000, // 1 hour (keep in cache longer)
    
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    
    /**
     * Only refetch on explicit user action (button click, page refresh)
     */
    refetchOnReconnect: false,
  } as const;
  
  /**
   * ✅ MUTATION_DEFAULTS
   * 
   * Shared settings for all mutations
   * - Retry failed mutations once (network glitches)
   * - Don't retry on 4xx errors (client errors)
   */
  export const MUTATION_DEFAULTS = {
    retry: (failureCount: number, error: any) => {
      // Don't retry client errors (400-499)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      
      // Retry server errors (500+) once
      return failureCount < 1;
    },
  } as const;
  
  /**
   * ✅ HELPER: Determine which defaults to use based on data type
   * 
   * Usage:
   * const queryOptions = getQueryDefaults('realtime');
   */
  export function getQueryDefaults(type: 'default' | 'realtime' | 'static' = 'default') {
    switch (type) {
      case 'realtime':
        return REALTIME_QUERY_DEFAULTS;
      case 'static':
        return STATIC_QUERY_DEFAULTS;
      default:
        return QUERY_DEFAULTS;
    }
  }
  
  /**
   * ✅ TYPE EXPORTS (for TypeScript)
   */
  export type QueryDefaultsType = typeof QUERY_DEFAULTS;
  export type QueryConfigType = 'default' | 'realtime' | 'static';