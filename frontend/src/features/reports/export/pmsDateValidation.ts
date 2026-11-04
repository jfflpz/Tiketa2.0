import type { PmsDateValidationResult } from './types';

/**
 * Returns the last day of a given month (1-31).
 */
export function getLastDayOfMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates whether a date range fulfills the backend PMS requirement:
 * Must begin on day 1 of a month and end on the final day of a month.
 */
export function validatePmsDateRange(dateFrom: string, dateTo: string): PmsDateValidationResult {
  const [y1, m1, d1] = dateFrom.split('-').map(Number);
  const [y2, m2, d2] = dateTo.split('-').map(Number);

  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) {
    return {
      isValid: false,
      message: 'Invalid date format. Expected YYYY-MM-DD.',
    };
  }

  const isStartDay1 = d1 === 1;
  const lastDayOfM2 = getLastDayOfMonth(y2, m2 - 1);
  const isEndLastDay = d2 === lastDayOfM2;

  if (isStartDay1 && isEndLastDay) {
    return { isValid: true };
  }

  // Suggest complete months spanning from m1 to m2
  const suggestedFrom = `${y1}-${String(m1).padStart(2, '0')}-01`;
  const suggestedTo = `${y2}-${String(m2).padStart(2, '0')}-${String(lastDayOfM2).padStart(2, '0')}`;

  return {
    isValid: false,
    message: 'PMS compliance reports require complete calendar months (beginning on the 1st and ending on the last day of the month).',
    suggestedFrom,
    suggestedTo,
  };
}

/**
 * Formats a YYYY-MM-DD pair for human-readable slide presentation.
 * e.g. "2026-10-01" to "2026-10-27" -> "Oct 1 – Oct 27, 2026"
 */
export function formatPeriodDisplay(dateFrom: string, dateTo: string): string {
  try {
    const [y1, m1, d1] = dateFrom.split('-').map(Number);
    const [y2, m2, d2] = dateTo.split('-').map(Number);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const startMonth = monthNames[m1 - 1] || '';
    const endMonth = monthNames[m2 - 1] || '';

    if (y1 === y2) {
      if (m1 === m2) {
        if (d1 === 1 && d2 === getLastDayOfMonth(y1, m1 - 1)) {
          return `${startMonth} ${y1}`;
        }
        return `${startMonth} ${d1} – ${d2}, ${y1}`;
      }
      return `${startMonth} ${d1} – ${endMonth} ${d2}, ${y1}`;
    }
    return `${startMonth} ${d1}, ${y1} – ${endMonth} ${d2}, ${y2}`;
  } catch {
    return `${dateFrom} – ${dateTo}`;
  }
}
