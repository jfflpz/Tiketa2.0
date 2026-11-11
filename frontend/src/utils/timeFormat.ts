/**
 * Formats time values into standard 12-hour "hh:mm AM/PM" format.
 * Examples:
 *   "09:03:58.783562" -> "09:03 AM"
 *   "14:20:00"        -> "02:20 PM"
 *   "2026-11-11T09:03:58Z" -> "09:03 AM"
 */
export function formatStandardTime(timeStr?: unknown): string {
  if (timeStr == null) return '—';
  if (typeof timeStr !== 'string') return '—';
  const clean = timeStr.trim();
  if (!clean || clean === '—') return '—';

  // Already formatted as "hh:mm AM" or "hh:mm PM" (handles standard and non-breaking spaces)
  if (/^\d{1,2}:\d{2}\s+(?:AM|PM)$/i.test(clean)) {
    return clean;
  }

  // If time string starts with date-time (ISO 8601 or YYYY-MM-DD...)
  if (clean.includes('T') || (clean.includes('-') && clean.includes(':'))) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      let hour = d.getHours();
      const minute = d.getMinutes().toString().padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      const hourStr = hour.toString().padStart(2, '0');
      return `${hourStr}:${minute} ${ampm}`;
    }
  }

  // If time string is "HH:MM:SS..." (e.g. "09:03:58.783562" or "14:04")
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hourStr = hour.toString().padStart(2, '0');
    return `${hourStr}:${minute} ${ampm}`;
  }

  return clean;
}
