import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// In-Memory Access Token (ADR-003: RAM only, zero localStorage exposure)
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

export const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Required for HttpOnly refresh cookie exchange
    headers: {
    'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Bearer JWT
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
});

// Response Interceptor: Silent 401 Refresh Queue
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
    failedQueue.forEach((prom) => {
    if (error) {
        prom.reject(error);
    } else {
        prom.resolve();
    }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
        if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        })
            .then(() => apiClient(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
        const { data } = await axios.post<{ access_token: string }>(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
        );
        setAccessToken(data.access_token);
        processQueue(null);
        return apiClient(originalRequest);
        } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        setAccessToken(null);
        return Promise.reject(refreshError);
        } finally {
        isRefreshing = false;
        }
    }

    return Promise.reject(error);
    }
);

// --- Typed Endpoints & Contracts ---

export interface EmployeeLookupResult {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    company_name: string;
    location_id: string;
    location_name: string;
    department_id: string;
    department_name: string;
    is_active: boolean;
}

export interface PublicTicketResponse {
    ticket_code: string;
    status: string;
    created_at: string;
}

export interface TicketCommentItem {
    id: string;
    user_id: string;
    sender_name?: string;
    sender_role?: 'employee' | 'it';
    body: string;
    is_internal: boolean;
    created_at: string;
}

export const authApi = {
    login: async (credentials: { username: string; password: string }) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
    },
    refresh: async () => {
    const res = await apiClient.post('/auth/refresh');
    return res.data;
    },
    logout: async () => {
    const res = await apiClient.post('/auth/logout');
    return res.data;
    },
    getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
    },
};

export interface ServerDictionaryItem {
  id: string;
  code: string;
  name: string;
}

export interface ServerDictionaries {
  companies: ServerDictionaryItem[];
  locations: ServerDictionaryItem[];
  departments: ServerDictionaryItem[];
  tasks: ServerDictionaryItem[];
  location_departments: Array<{ location_id: string; department_id: string }>;
}

export interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'it' | 'admin';
  is_active: boolean;
}

export interface AdminEmployeeItem {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  company_id: string;
  company_name: string;
  location_id: string;
  location_name: string;
  department_id: string;
  department_name: string;
  is_active: boolean;
}

export const directoryApi = {
  lookupEmployee: async (query: string): Promise<EmployeeLookupResult> => {
    const res = await apiClient.get<EmployeeLookupResult>('/employees/lookup', {
      params: { q: query },
    });
    return res.data;
  },
  getDictionaries: async (): Promise<ServerDictionaries> => {
    const res = await apiClient.get<ServerDictionaries>('/dictionaries');
    return res.data;
  },
  getAdminUsers: async (params?: { offset?: number; limit?: number }): Promise<AdminUserItem[]> => {
    const res = await apiClient.get<AdminUserItem[]>('/admin/users', { params });
    return res.data;
  },
  createAdminUser: async (payload: {
    username: string;
    email: string;
    full_name: string;
    role: 'it' | 'admin';
    password: string;
  }): Promise<AdminUserItem> => {
    const res = await apiClient.post<AdminUserItem>('/admin/users', payload);
    return res.data;
  },
  getAdminEmployees: async (params?: { offset?: number; limit?: number }): Promise<AdminEmployeeItem[]> => {
    const res = await apiClient.get<AdminEmployeeItem[]>('/admin/employees', { params });
    return res.data;
  },
  createAdminEmployee: async (payload: {
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    location_id: string;
    department_id: string;
    is_active?: boolean;
  }): Promise<AdminEmployeeItem> => {
    const res = await apiClient.post<AdminEmployeeItem>('/admin/employees', payload);
    return res.data;
  },
};

export const ticketsApi = {
    submitPublicTicket: async (payload: {
    employee_id: string;
    task_code: string;
    description: string;
    }): Promise<PublicTicketResponse> => {
    const res = await apiClient.post<PublicTicketResponse>('/tickets/submit', payload);
    return res.data;
    },
    trackTicket: async (code: string) => {
    const res = await apiClient.get(`/tickets/track/${code}`);
    return res.data;
    },
    getQueue: async (params?: { status?: string; offset?: number; limit?: number }) => {
    const res = await apiClient.get('/tickets', { params });
    return res.data;
    },
    claimTicket: async (ticketId: string) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/claim`);
    return res.data;
    },
    updateStatus: async (
    ticketId: string,
    payload: { status: 'PROG' | 'RESL' | 'CLSD'; mode?: 'REM' | 'SITE'; task_code?: string }
    ) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/status`, payload);
    return res.data;
    },
    quickIntake: async (payload: {
    employee_id: string;
    task_code: string;
    description: string;
    }) => {
    const res = await apiClient.post('/tickets/quick-intake', payload);
    return res.data;
    },
    getComments: async (ticketId: string) => {
    const res = await apiClient.get<TicketCommentItem[]>(`/tickets/${ticketId}/comments`);
    return res.data;
    },
    addComment: async (
    ticketId: string,
    payload: { body: string; is_internal: boolean }
    ) => {
    const res = await apiClient.post(`/tickets/${ticketId}/comments`, payload);
    return res.data;
    },
};

export interface ReportKPIs {
    total_tickets: number;
    active_tickets: number;
    completed: number;
    overdue_backlog: number;
    avg_labor_minutes: number | null;
    same_day_resolution_pct: number | null;
    sla_compliance_pct: number | null;
}

export const reportsApi = {
    getKPIs: async (params?: {
    date_from?: string;
    date_to?: string;
    company_id?: string;
    location_id?: string;
    department_id?: string;
    }): Promise<ReportKPIs> => {
    const res = await apiClient.get<ReportKPIs>('/reports/kpis', { params });
    return res.data;
    },
    getReport: async (
    reportName: string,
    params?: {
        date_from?: string;
        date_to?: string;
        company_id?: string;
        location_id?: string;
        department_id?: string;
    }
    ) => {
    const res = await apiClient.get<{ date_from: string; date_to: string; rows: any[] }>(
        `/reports/${reportName}`,
        { params: { ...params, format: 'json' } }
    );
    return res.data;
    },
    downloadReportCSV: async (
    reportName: string,
    params?: {
        date_from?: string;
        date_to?: string;
        company_id?: string;
        location_id?: string;
        department_id?: string;
    }
    ) => {
    const res = await apiClient.get(`/reports/${reportName}`, {
        params: { ...params, format: 'csv' },
        responseType: 'blob',
    });
    return res.data;
    },
};
