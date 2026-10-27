import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { readableError } from '../utils/errorMessages';
import type { SupportMode, TicketStatus } from '../types/ticket';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// In-Memory Access Token (ADR-003: RAM only, zero localStorage exposure)
let inMemoryAccessToken: string | null = null;
let inMemoryEmployeeToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

export const setEmployeeToken = (token: string | null) => {
    inMemoryEmployeeToken = token;
};

export const getEmployeeToken = () => inMemoryEmployeeToken;

export const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Required for HttpOnly refresh cookie exchange
    headers: {
    'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Bearer JWT
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.headers && !config.headers.Authorization) {
        if (inMemoryAccessToken) {
            config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
        } else if (inMemoryEmployeeToken) {
            config.headers.Authorization = `Bearer ${inMemoryEmployeeToken}`;
        }
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

export interface EmployeeScopeOut {
    employee_id: string;
    full_name: string;
    company_id: string;
    company_name: string;
    location_id: string;
    location_name: string;
    department_id: string;
    department_name: string;
}

export interface EmployeeMatchOut {
    status: string;
    match_token: string;
    employee: EmployeeScopeOut;
}

export interface LocationObservationInput {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    session_id?: string | null;
    captured_at?: string | null;
}

export interface LocationObservationOut {
    observation_id: string;
    status: string;
}

export interface PublicTicketResponse {
    ticket_code: string;
    status: string;
    created_at: string;
}

export interface StaffTicketResponse extends PublicTicketResponse {
    id: string;
    company_id: string;
    location_id: string;
    department_id: string;
    requester_name: string;
    employee_id_number?: string | null;
    task_code: string;
    description: string;
    mode: SupportMode | null;
    month: string;
    date_started: string;
    date_finished: string | null;
    time_started: string | null;
    time_finished: string | null;
    duration: string | number | null;
    status: TicketStatus;
    assigned_tech_id: string | null;
    technician_name?: string | null;
    user_confirmed_at: string | null;
}

export interface TicketCommentItem {
    id: string;
    ticket_id?: string;
    user_id?: string | null;
    author_name?: string | null;
    author_role?: string | null;
    sender_name?: string;
    sender_role?: 'employee' | 'it';
    body: string;
    is_internal: boolean;
    created_at: string;
}

export interface TicketVerifyAccessOut {
    access_token: string;
    ticket: StaffTicketResponse;
    can_close: boolean;
    can_reopen: boolean;
}

export interface ReissueVerificationOut {
    ticket_code?: string;
    status?: string;
    closure_token?: string;
    closure_url: string | null;
    expires_in_hours?: number;
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
    matchEmployee: async (
    payload: { employee_id: string; email: string },
    sessionId?: string
    ): Promise<EmployeeMatchOut> => {
    const headers = sessionId ? { 'X-Kiosk-Session-ID': sessionId } : undefined;
    const res = await apiClient.post<EmployeeMatchOut>('/employees/match', payload, { headers });
    return res.data;
    },
};

export interface LocationDepartmentSummary {
    id: string;
    code: string;
    name: string;
    active_tickets_count: number;
}

export interface HubSummaryOut {
    id: string;
    code: string;
    name: string;
    open_count: number;
    in_progress_count: number;
    resolved_count: number;
    closed_this_month_count: number;
    total_active_count: number;
    top_issue_task_code: string | null;
    top_issue_task_name: string | null;
    top_issue_count: number;
    top_issue_window: string;
    departments: LocationDepartmentSummary[];
}

export const locationApi = {
    recordObservation: async (
    payload: LocationObservationInput,
    sessionId?: string
    ): Promise<LocationObservationOut> => {
    const headers = sessionId ? { 'X-Kiosk-Session-ID': sessionId } : undefined;
    const res = await apiClient.post<LocationObservationOut>('/locations/observations', payload, { headers });
    return res.data;
    },
    getHubSummaries: async (): Promise<HubSummaryOut[]> => {
    const res = await apiClient.get<HubSummaryOut[]>('/locations/hub-summaries');
    return res.data;
    },
};

export const ticketsApi = {
    submitPublicTicket: async (payload: {
    employee_id: string;
    task_code: string;
    description: string;
    match_token: string;
    observation_id?: string | null;
    }, sessionId?: string): Promise<PublicTicketResponse> => {
    const headers = sessionId ? { 'X-Kiosk-Session-ID': sessionId } : undefined;
    const res = await apiClient.post<PublicTicketResponse>('/tickets/submit', payload, { headers });
    return res.data;
    },
    trackTicket: async (code: string) => {
    const res = await apiClient.get(`/tickets/track/${code}`);
    return res.data;
    },
    getQueue: async (params?: {
    status?: string;
    offset?: number;
    limit?: number;
    location_id?: string;
    order?: 'asc' | 'desc';
    }) => {
    const res = await apiClient.get<StaffTicketResponse[]>('/tickets', { params });
    return res.data;
    },
    getTicket: async (ticketId: string): Promise<StaffTicketResponse> => {
    const res = await apiClient.get<StaffTicketResponse>(`/tickets/${ticketId}`);
    return res.data;
    },
    claimTicket: async (ticketId: string) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/claim`);
    return res.data;
    },
    assignTicket: async (ticketId: string, technicianId: string) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/assign`, {
        technician_id: technicianId,
    });
    return res.data;
    },
    updateStatus: async (
    ticketId: string,
    payload: { status: 'PROG' | 'RESL' | 'CLSD'; mode?: 'REM' | 'SITE'; task_code?: string }
    ) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/status`, payload);
    return res.data;
    },
    updateServiceRecord: async (
    ticketId: string,
    payload: { task_code?: string; diagnosis?: string; resolution_notes?: string }
    ) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/service-record`, payload);
    return res.data;
    },
    quickIntake: async (payload: {
    employee_id: string;
    task_code: string;
    description: string;
    mode: SupportMode;
    }): Promise<StaffTicketResponse> => {
    const res = await apiClient.post<StaffTicketResponse>('/tickets/quick-intake', payload);
    return res.data;
    },
    getComments: async (ticketId: string) => {
    const res = await apiClient.get<TicketCommentItem[]>(`/tickets/${ticketId}/comments`);
    return res.data;
    },
    addComment: async (
    ticketId: string,
    payload: { body: string; is_internal?: boolean }
    ) => {
    const res = await apiClient.post<TicketCommentItem>(`/tickets/${ticketId}/comments`, {
        body: payload.body,
        is_internal: payload.is_internal ?? false,
    });
    return res.data;
    },
    verifyAccess: async (
    codeOrId: string,
    payload?: { employee_id?: string; token?: string; match_token?: string }
    ): Promise<TicketVerifyAccessOut> => {
    const res = await apiClient.post<TicketVerifyAccessOut>(
        `/tickets/${codeOrId}/verify-access`,
        payload || {}
    );
    return res.data;
    },
    reissueVerification: async (ticketId: string): Promise<ReissueVerificationOut> => {
    const res = await apiClient.post<ReissueVerificationOut>(
        `/tickets/${ticketId}/reissue-verification`
    );
    return res.data;
    },
    getMyTickets: async (): Promise<StaffTicketResponse[]> => {
    const res = await apiClient.get<StaffTicketResponse[]>('/tickets/my-tickets');
    return res.data;
    },
    confirmClosure: async (
    ticketId: string,
    payload?: { token?: string; remarks?: string }
    ): Promise<StaffTicketResponse> => {
    const res = await apiClient.post<StaffTicketResponse>(
        `/tickets/${ticketId}/confirm-closure`,
        payload || {}
    );
    return res.data;
    },
    reopenTicket: async (
    ticketId: string,
    payload: { reason: string; token?: string }
    ): Promise<StaffTicketResponse> => {
    const res = await apiClient.post<StaffTicketResponse>(
        `/tickets/${ticketId}/reopen`,
        payload
    );
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
    },
    signal?: AbortSignal
    ) => {
    const res = await apiClient.get<{ date_from: string; date_to: string; rows: any[] }>(
        `/reports/${reportName}`,
        { params: { ...params, format: 'json' }, signal }
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
    },
    signal?: AbortSignal
    ) => {
    const res = await apiClient.get(`/reports/${reportName}`, {
        params: { ...params, format: 'csv' },
        responseType: 'blob',
        signal,
    });
    return res.data;
    },
};

export interface BackendUser {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: 'it' | 'admin';
    is_active: boolean;
    location_id?: string | null;
    closed_repairs?: number;
    active_bench?: number;
    token_version?: number;
    created_at?: string;
    updated_at?: string;
}

export interface UserCreateInput {
    username: string;
    email: string;
    full_name: string;
    role: 'it' | 'admin';
    password: string;
}

export interface UserUpdateInput {
    full_name?: string | null;
    role?: 'it' | 'admin' | null;
    is_active?: boolean | null;
    password?: string | null;
}

export interface EmployeeCreateInput {
    employee_id: string;
    full_name: string;
    email: string;
    company_id: string;
    location_id: string;
    department_id: string;
}

export interface DictionaryItem {
    id: string;
    code: string;
    name: string;
}

export interface DictionariesResponse {
    companies: DictionaryItem[];
    locations: DictionaryItem[];
    departments: DictionaryItem[];
    tasks: DictionaryItem[];
    location_departments: Array<{ location_id: string; department_id: string }>;
}

export const extractApiErrorMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: unknown } } };
        const detail = axiosErr.response?.data?.detail;
        return readableError(detail, fallback);
    }
    if (err instanceof Error) {
        return err.message;
    }
    return fallback;
};

export const adminApi = {
    getUsers: async (params?: { offset?: number; limit?: number }): Promise<BackendUser[]> => {
        const res = await apiClient.get<BackendUser[]>('/admin/users', { params });
        return res.data;
    },
    createUser: async (payload: UserCreateInput): Promise<BackendUser> => {
        const res = await apiClient.post<BackendUser>('/admin/users', payload);
        return res.data;
    },
    updateUser: async (userId: string, payload: UserUpdateInput): Promise<BackendUser> => {
        const res = await apiClient.patch<BackendUser>(`/admin/users/${userId}`, payload);
        return res.data;
    },
    getEmployees: async (params?: { offset?: number; limit?: number }): Promise<EmployeeLookupResult[]> => {
        const res = await apiClient.get<EmployeeLookupResult[]>('/admin/employees', { params });
        return res.data;
    },
    createEmployee: async (payload: EmployeeCreateInput): Promise<EmployeeLookupResult> => {
        const res = await apiClient.post<EmployeeLookupResult>('/admin/employees', payload);
        return res.data;
    },
    getDictionaries: async (): Promise<DictionariesResponse> => {
        const res = await apiClient.get<DictionariesResponse>('/dictionaries');
        return res.data;
    },
};
