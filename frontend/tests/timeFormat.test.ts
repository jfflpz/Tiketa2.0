import { describe, it, expect } from 'vitest';
import { formatStandardTime } from '../src/utils/timeFormat';

describe('formatStandardTime utility', () => {
  it('formats raw postgres microsecond timestamps into 12-hour AM/PM format', () => {
    expect(formatStandardTime('09:03:58.783562')).toBe('09:03 AM');
    expect(formatStandardTime('09:04:20.423970')).toBe('09:04 AM');
    expect(formatStandardTime('13:45:10.123456')).toBe('01:45 PM');
    expect(formatStandardTime('00:15:00.000000')).toBe('12:15 AM');
    expect(formatStandardTime('12:00:00')).toBe('12:00 PM');
  });

  it('formats standard HH:MM strings', () => {
    expect(formatStandardTime('08:30')).toBe('08:30 AM');
    expect(formatStandardTime('17:15')).toBe('05:15 PM');
  });

  it('preserves already formatted AM/PM times', () => {
    expect(formatStandardTime('09:03 AM')).toBe('09:03 AM');
    expect(formatStandardTime('02:45 PM')).toBe('02:45 PM');
  });

  it('returns fallback dash for null, undefined or empty strings', () => {
    expect(formatStandardTime(null)).toBe('—');
    expect(formatStandardTime(undefined)).toBe('—');
    expect(formatStandardTime('')).toBe('—');
    expect(formatStandardTime('—')).toBe('—');
  });
});
