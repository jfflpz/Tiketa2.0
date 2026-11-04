// @spec BF-01: Normalized API Error Shape Extraction
/**
 * Converts any Axios, FastAPI, or unknown runtime error into a clean, human-readable string.
 * Handles FastAPI 422 validation error arrays, detail objects, standard strings, and network timeouts.
 */
export function normalizeApiError(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const axiosErr = err as any;
  const data = axiosErr?.response?.data;

  if (data) {
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;

    // FastAPI 422 validation array of objects: [{ loc: ["body", "description"], msg: "...", type: "..." }]
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.msg) {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
            return field && field !== 'body' ? `${field}: ${item.msg}` : item.msg;
          }
          return JSON.stringify(item);
        })
        .join('; ');
    }

    if (typeof data.detail === 'object' && data.detail !== null) {
      return data.detail.msg || JSON.stringify(data.detail);
    }

    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
  }

  if (axiosErr?.message && typeof axiosErr.message === 'string') {
    if (axiosErr.message === 'Network Error') {
      return 'Unable to connect to the backend server. Please verify network connectivity.';
    }
    return axiosErr.message;
  }

  return fallback;
}
