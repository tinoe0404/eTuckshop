export function useDashboardStats() { return { data: null, isLoading: false }; }
export function useSalesChart() { return { data: [], isLoading: false }; }
export function useDateRangeFilter() { return { startDate: null, endDate: null, setRange: () => { } }; }