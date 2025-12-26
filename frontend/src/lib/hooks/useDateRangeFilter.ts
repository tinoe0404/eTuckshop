// ============================================
// FILE: src/hooks/useDateRangeFilter.ts (NEW)
// ============================================

import { useState } from 'react';

export type DateRangePeriod = '7D' | '30D' | '90D';

interface DateRange {
  startDate: string;
  endDate: string;
}

export const useDateRangeFilter = (defaultPeriod: DateRangePeriod = '30D') => {
  const [activePeriod, setActivePeriod] = useState<DateRangePeriod>(defaultPeriod);
  
  const [dateRange, setDateRange] = useState<DateRange>(() => 
    getDateRangeForPeriod(defaultPeriod)
  );

  const setLast7Days = () => {
    setDateRange(getDateRangeForPeriod('7D'));
    setActivePeriod('7D');
  };

  const setLast30Days = () => {
    setDateRange(getDateRangeForPeriod('30D'));
    setActivePeriod('30D');
  };

  const setLast90Days = () => {
    setDateRange(getDateRangeForPeriod('90D'));
    setActivePeriod('90D');
  };

  return {
    dateRange,
    activePeriod,
    setLast7Days,
    setLast30Days,
    setLast90Days,
  };
};

// ✅ Helper: Calculate date range from period
function getDateRangeForPeriod(period: DateRangePeriod): DateRange {
  const endDate = new Date();
  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}