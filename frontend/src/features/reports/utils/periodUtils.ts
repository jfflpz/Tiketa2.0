/**
 * Asia/Manila (UTC+8) Date and Period Utilities for Standardized Reporting & Executive Analytics
 * Complies with F-05 & B-06 date-filter contract
 */

export function getManilaNow(): Date {
  const now = new Date();
  try {
    const manilaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const parsed = new Date(manilaStr);
    if (!isNaN(parsed.getTime())) return parsed;
  } catch {
    // Fallback if environment timezone unavailable
  }
  return now;
}

export function getCurrentManilaPeriod(): { year: number; month: number } {
  const mNow = getManilaNow();
  return {
    year: mNow.getFullYear(),
    month: mNow.getMonth() + 1, // 1 to 12
  };
}

export function getMonthDateRange(year: number, month: number): { date_from: string; date_to: string } {
  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const firstDay = `${yStr}-${mStr}-01`;
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = `${yStr}-${mStr}-${String(lastDayNum).padStart(2, '0')}`;
  return {
    date_from: firstDay,
    date_to: lastDay,
  };
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
