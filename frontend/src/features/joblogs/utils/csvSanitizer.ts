/**
 * Neutralizes CSV formula injection (CSV Injection / CWE-1236)
 * @spec F-08: Escape every CSV cell and neutralize formula-leading text (=, +, -, @, \t, \r)
 * including whitespace-prefixed cases. Escapes internal quotes and wraps values cleanly.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // Check if string begins with formula-trigger characters (including whitespace-prefixed)
  const isDirectFormula = /^[=+\-@\t\r]/.test(str);
  const trimmedSpaces = str.replace(/^[ ]+/, '');
  const isIndentedFormula = /^[=+\-@\t\r]/.test(trimmedSpaces);
  const isFormula = isDirectFormula || isIndentedFormula;

  // Neutralize by prepending a single quote if formula trigger detected
  const safeStr = isFormula ? `'${str}` : str;

  // Escape any existing double quotes by doubling them ("" -> """")
  const escapedQuotes = safeStr.replace(/"/g, '""');

  return `"${escapedQuotes}"`;
}
