/** Only render readable text; API validation payloads may contain objects. */
export const readableError = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value.flatMap((item: unknown) => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') {
        return [item.msg];
      }
      return [];
    });
    return messages.join('; ') || fallback;
  }
  return fallback;
};
