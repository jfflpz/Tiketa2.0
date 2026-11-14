import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { StaffRole } from '../types';
export type { StaffRole };
import { readableError } from '../utils/errorMessages';
import type { SupportMode, TicketStatus } from '../types/ticket';
import { getOrCreateKioskSessionId } from '../utils/session';
import { AccountRequest } from '@/types/team';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// In-Memory Access Token (ADR-003: RAM only, zero localStorage exposure)
let inMemoryAccessToken: string | null = null;
let inMemoryEmployeeToken: string | null = null;
let inMemoryMatchToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

export const setEmployeeToken = (token: string | null) => {
    inMemoryEmployeeToken = token;
};

export const getEmployeeToken = () => inMemoryEmployeeToken;

export const setMatchToken = (token: string | null) => {
    inMemoryMatchToken = token;
};

export const getMatchToken = () => inMemoryMatchToken;

export const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // Required for HttpOnly refresh cookie exchange
    headers: {
    'Content-Type': 'application/json',
    },
});

export const isPublicEndpoint = (url?: string): boolean => {
    if (!url) return false;
    return (
        url.startsWith('/tickets/submit') ||
        url.startsWith('/tickets/track') ||
        url.startsWith('/tickets/my-tickets') ||
        url.startsWith('/tickets/public') ||
        url.includes('/confirm-closure') ||
        url.includes('/reopen') ||
        url.startsWith('/employees/lookup') ||
        url.startsWith('/employees/match') ||
        url.includes('/public')
    );
};

// Request Interceptor: Attach Bearer JWT
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig & { isPublic?: boolean }) => {
    const isPublic = config.isPublic || isPublicEndpoint(config.url);
    if (config.headers && !config.headers.Authorization) {
        if (!isPublic && inMemoryAccessToken) {
            config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
        } else if (inMemoryEmployeeToken) {
            config.headers.Authorization = `Bearer ${inMemoryEmployeeToken}`;
        }
    }
    if (config.headers && inMemoryMatchToken && !config.headers['X-Match-Token']) {
        config.headers['X-Match-Token'] = inMemoryMatchToken;
    }
    const sessionId = getOrCreateKioskSessionId();
    if (sessionId && config.headers && !config.headers['X-Kiosk-Session-ID']) {
        config.headers['X-Kiosk-Session-ID'] = sessionId;
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
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; isPublic?: boolean }) | undefined;

        if (!originalRequest) {
            return Promise.reject(error);
        }

        const isPublic = originalRequest.isPublic || isPublicEndpoint(originalRequest.url);

        // Public requests or comment polls never trigger staff refresh on 401
        if (
            error.response?.status === 401 && 
            !originalRequest._retry && 
            !originalRequest.url?.includes('/auth/') &&
            !originalRequest.url?.includes('/comments') &&
            !isPublic
        ) {
            if (!inMemoryAccessToken) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        if (originalRequest.headers && inMemoryAccessToken) {
                            originalRequest.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
                        }
                        return apiClient(originalRequest);
                    })
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
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                }
                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError);
                setAccessToken(null);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('tiketa:session-expired'));
                }
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
    matched?: boolean;
    status?: string;
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
    // contract: C2 — awaiting backend B-C2
    is_paused?: boolean;
    paused_at?: string | null;
    pause_reason?: string | null;
    active_minutes?: number | null;
    elapsed_minutes?: number | null;
    // contract: C3 — awaiting backend B-C3
    closure_deadline_at?: string | null;
    closure_token_expires_at?: string | null;
    closure_reason?: string | null;
    auto_closed_at?: string | null;
    confirmed_by?: string | null;
    // contract: F1/G2 — awaiting backend B-F1/B-G2
    subcategory_code?: string | null;
    subcategory_name?: string | null;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN' | null;
    asset_id?: string | null;
    asset_tag?: string | null;
    asset_serial?: string | null;
    asset_model?: string | null;
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
    const res = await apiClient.post('/auth/refresh', {}, { timeout: 7000 });
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
    // contract: B3 — awaiting backend B-B3 owner password change & recovery endpoints
    changePassword: async (payload: { current_password: string; new_password: string }) => {
    const res = await apiClient.post('/auth/change-password', payload);
    return res.data;
    },
    requestPasswordRecovery: async (payload: { identifier: string }) => {
    const res = await apiClient.post('/auth/recovery/request', payload);
    return res.data;
    },
    confirmPasswordRecovery: async (payload: { token: string; new_password: string }) => {
    const res = await apiClient.post('/auth/recovery/confirm', payload);
    return res.data;
    },
};

export interface ServerDictionaryItem {
  id: string;
  code: string;
  name: string;
  address?: string;
  is_active?: boolean;
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
  role: StaffRole;
  status?: string;
  // contract: D2 — awaiting backend B-D2
  availability_status?: string;
  availability_note?: string | null;
  is_online?: boolean | null;
  custom_permissions?: string[];
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
  updateAdminUser: async (
    id: string,
    payload: Partial<AdminUserItem> & { password?: string }
  ): Promise<AdminUserItem> => {
    const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}`, payload);
    return res.data;
  },
  deactivateAdminUser: async (id: string): Promise<AdminUserItem> => {
    const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}`, { is_active: false });
    return res.data;
  },
  updateAdminEmployee: async (
    id: string,
    payload: Partial<AdminEmployeeItem>
  ): Promise<AdminEmployeeItem> => {
    const res = await apiClient.put<AdminEmployeeItem>(`/admin/employees/${id}`, payload);
    return res.data;
  },
  deactivateAdminEmployee: async (
    id: string,
    currentData?: Partial<AdminEmployeeItem>
  ): Promise<AdminEmployeeItem> => {
    const res = await apiClient.put<AdminEmployeeItem>(`/admin/employees/${id}`, {
      ...currentData,
      is_active: false,
    });
    return res.data;
  },
    lookupEmployee: async (query: string): Promise<EmployeeLookupResult> => {
    const token = getAccessToken();
    const res = await apiClient.get<EmployeeLookupResult>('/employees/lookup', {
        params: { q: query },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    subcategory_code?: string;
    reported_issue_code?: string;
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
    technician_id?: string;
    offset?: number;
    limit?: number;
    location_id?: string;
    order?: 'asc' | 'desc';
    }) => {
    const res = await apiClient.get<StaffTicketResponse[]>('/tickets', { params });
    return res.data;
    },
    getHistory: async (params?: {
    technician_id?: string;
    location_id?: string;
    status?: string;
    offset?: number;
    limit?: number;
    order?: 'asc' | 'desc';
    }) => {
    const res = await apiClient.get<StaffTicketResponse[]>('/tickets/history', {
    params: { status: 'ALL', ...params },
    });
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
        payload: {
        task_code?: string;
        diagnosis?: string;
        resolution_notes?: string;
        company_id?: string;
        location_id?: string;
        department_id?: string;
        requester_name?: string;
        }
    ) => {
        const res = await apiClient.patch(`/tickets/${ticketId}/service-record`, payload);
        return res.data;
    },
    quickIntake: async (payload: {
    employee_id: string;
    task_code: string;
    subcategory_code?: string;
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
    // contract: C1 — awaiting backend B-C1 read-only paginated ticket activity endpoint
    getTicketActivity: async (
    ticketId: string,
    params?: { page?: number; page_size?: number }
    ): Promise<{
    items: Array<{
        id: string;
        actor_name: string;
        actor_role?: string;
        action: string;
        created_at: string;
        changes?: Array<{ field: string; from?: string | null; to?: string | null }>;
    }>;
    total: number;
    page: number;
    page_size: number;
    has_more?: boolean;
    }> => {
    const res = await apiClient.get(`/tickets/${ticketId}/activity`, { params });
    return res.data;
    },
    // contract: C2 — awaiting backend B-C2
    pauseTicketWork: async (
    ticketId: string,
    reason?: string
    ): Promise<StaffTicketResponse> => {
    const res = await apiClient.post<StaffTicketResponse>(`/tickets/${ticketId}/pause`, reason ? { reason } : {});
    return res.data;
    },
    // contract: C2 — awaiting backend B-C2
    resumeTicketWork: async (ticketId: string): Promise<StaffTicketResponse> => {
    const res = await apiClient.post<StaffTicketResponse>(`/tickets/${ticketId}/resume`, {});
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
    payload?: { employee_id?: string; email?: string; token?: string; match_token?: string }
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
    getMyTickets: async (matchToken?: string | null): Promise<StaffTicketResponse[]> => {
    const token = matchToken || inMemoryMatchToken || inMemoryEmployeeToken;
    const headers: Record<string, string> = {};
    if (token) {
        headers['X-Match-Token'] = token;
    }
    const sessionId = getOrCreateKioskSessionId();
    if (sessionId) {
        headers['X-Kiosk-Session-ID'] = sessionId;
    }
    const res = await apiClient.get<StaffTicketResponse[]>('/tickets/my-tickets', {
        headers: Object.keys(headers).length ? headers : undefined,
    });
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
    downloadJobLogsXLSX: async (signal?: AbortSignal) => {
    const res = await apiClient.get('/tickets/job-logs/export', {
        responseType: 'blob',
        signal,
    });
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
    downloadReportXLSX: async (
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
        params: { ...params, format: 'xlsx' },
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
    role: StaffRole;
    status?: string;
    custom_permissions?: string[];
    is_active: boolean;
    location_id?: string | null;
    closed_repairs?: number;
    active_bench?: number;
    avatar_url?: string | null;
    avatar_updated_at?: string | null;
    token_version?: number;
    created_at?: string;
    updated_at?: string;
}

export interface UserCreateInput {
    username: string;
    email: string;
    full_name: string;
    role: StaffRole;
    password: string;
}

export interface UserUpdateInput {
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
    role?: StaffRole | null;
    status?: string | null;
    custom_permissions?: string[] | null;
    location_id?: string | null;
    is_active?: boolean | null;
    password?: string | null;
    acting_admin_password?: string | null;
    confirm_password?: string | null;
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
    address?: string;
    is_active?: boolean;
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
    updateAdminUser: async (
        id: string,
        payload: Partial<AdminUserItem> & { password?: string }
    ): Promise<AdminUserItem> => {
        const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}`, payload);
        return res.data;
    },
    // contract: D2 — awaiting backend B-D2
    updateStaffAvailability: async (
        id: string,
        payload: { availability_status: string; availability_note?: string | null }
    ): Promise<AdminUserItem> => {
        const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}/availability`, payload);
        return res.data;
    },
    deactivateAdminUser: async (id: string): Promise<AdminUserItem> => {
        const res = await apiClient.patch<AdminUserItem>(`/admin/users/${id}`, { is_active: false });
        return res.data;
    },
    updateAdminEmployee: async (
        id: string,
        payload: Partial<AdminEmployeeItem>
    ): Promise<AdminEmployeeItem> => {
        const res = await apiClient.put<AdminEmployeeItem>(`/admin/employees/${id}`, payload);
        return res.data;
    },
    deactivateAdminEmployee: async (
        id: string,
        currentData?: Partial<AdminEmployeeItem>
    ): Promise<AdminEmployeeItem> => {
        const res = await apiClient.put<AdminEmployeeItem>(`/admin/employees/${id}`, {
            ...currentData,
            is_active: false,
        });
        return res.data;
    },
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
    resetUserPassword: async (
        userId: string,
        payload: {
            admin_current_password: string;
            new_password: string;
            confirm_password: string;
        }
    ): Promise<{ message: string }> => {
        const res = await apiClient.post<{ message: string }>(`/admin/users/${userId}/reset-password`, payload);
        return res.data;
    },
    updateUsername: async (
        userId: string,
        payload: { username: string; acting_admin_password?: string }
    ): Promise<{ username: string; next_eligible_at: string | null }> => {
        const res = await apiClient.patch<{ username: string; next_eligible_at: string | null }>(`/admin/users/${userId}/username`, payload);
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
    createLocation: async (payload: {
        code: string;
        name: string;
        address?: string;
    }): Promise<ServerDictionaryItem> => {
        const res = await apiClient.post<ServerDictionaryItem>('/admin/locations', payload);
        return res.data;
    },
    updateLocation: async (
        id: string,
        payload: { name?: string; address?: string; is_active?: boolean }
    ): Promise<ServerDictionaryItem> => {
        const res = await apiClient.patch<ServerDictionaryItem>(`/admin/locations/${id}`, payload);
        return res.data;
    },
    createDepartment: async (payload: {
        code: string;
        name: string;
    }): Promise<ServerDictionaryItem> => {
        const res = await apiClient.post<ServerDictionaryItem>('/admin/departments', payload);
        return res.data;
    },
    updateDepartment: async (
        id: string,
        payload: { name?: string; is_active?: boolean }
    ): Promise<ServerDictionaryItem> => {
        const res = await apiClient.patch<ServerDictionaryItem>(`/admin/departments/${id}`, payload);
        return res.data;
    },
    createCompany: async (payload: {
        code: string;
        name: string;
    }): Promise<ServerDictionaryItem> => {
        const res = await apiClient.post<ServerDictionaryItem>('/admin/companies', payload);
        return res.data;
    },
    updateCompany: async (
        id: string,
        payload: { name?: string; is_active?: boolean }
    ): Promise<ServerDictionaryItem> => {
        const res = await apiClient.patch<ServerDictionaryItem>(`/admin/companies/${id}`, payload);
        return res.data;
    },
    createLocationDepartment: async (payload: {
        location_id: string;
        department_id: string;
    }): Promise<{ location_id: string; department_id: string }> => {
        const res = await apiClient.post<{ location_id: string; department_id: string }>(
            '/admin/location-departments',
            payload
        );
        return res.data;
    },
};

export interface AccountRequestCreateInput {
    request_type?: 'create' | 'deactivate' | 'role_change';
    target_user_id?: string | null;
    username?: string;
    email?: string;
    full_name?: string;
    role?: StaffRole;
    location_id?: string | null;
    department?: string | null;
}

export interface AccountRequestApprovalResult {
    user: {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    };
    temporary_password: string;
}

export const accountRequestsApi = {
    list: async (): Promise<AccountRequest[]> => {
    const res = await apiClient.get<AccountRequest[]>('/account-requests');
    return res.data;
    },
    create: async (data: AccountRequestCreateInput): Promise<AccountRequest> => {
    const res = await apiClient.post<AccountRequest>('/account-requests', data);
    return res.data;
    },
    approve: async (id: string): Promise<AccountRequestApprovalResult> => {
    const res = await apiClient.post<AccountRequestApprovalResult>(`/account-requests/${id}/approve`);
    return res.data;
    },
    reject: async (id: string, reason: string): Promise<AccountRequest> => {
    const res = await apiClient.post<AccountRequest>(`/account-requests/${id}/reject`, {
        rejection_reason: reason,
    });
    return res.data;
    },
};


export const usersApi = {
    uploadSelfPhoto: async (file: File): Promise<{ avatar_url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.put<{ avatar_url: string }>('/users/me/photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
    removeSelfPhoto: async (): Promise<void> => {
        await apiClient.delete('/users/me/photo');
    },
};

// contract: D3 — awaiting backend B-D3
export interface CalendarAssignment {
    id: string;
    ticket_id: string;
    ticket_code: string;
    task_name: string;
    staff_id: string;
    staff_name: string;
    staff_role: StaffRole;
    staff_title?: string;
    availability_status?: string;
    scheduled_date: string; // YYYY-MM-DD
    status: string;
}

export interface RescheduleRequest {
    id: string;
    assignment_id: string;
    ticket_id: string;
    ticket_code: string;
    requester_id: string;
    requester_name: string;
    original_date: string;
    proposed_date: string;
    reason?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    decided_by_name?: string | null;
    decided_at?: string | null;
}

export interface CalendarAssignmentsResponse {
    assignments: CalendarAssignment[];
    reschedule_requests: RescheduleRequest[];
    undated_tickets_count?: number;
}

export const scheduleApi = {
    getCalendarAssignments: async (params?: { month?: string }): Promise<CalendarAssignmentsResponse> => {
        const res = await apiClient.get<CalendarAssignmentsResponse>('/schedule/assignments', { params });
        return res.data;
    },
    submitRescheduleRequest: async (payload: {
        assignment_id: string;
        proposed_date: string;
        reason?: string;
    }): Promise<{ assignment?: CalendarAssignment; request?: RescheduleRequest; applied_directly?: boolean }> => {
        const res = await apiClient.post('/schedule/reschedule-requests', payload);
        return res.data;
    },
    decideRescheduleRequest: async (
        requestId: string,
        payload: { decision: 'approved' | 'rejected'; comment?: string }
    ): Promise<RescheduleRequest> => {
        const res = await apiClient.post<RescheduleRequest>(
            `/schedule/reschedule-requests/${requestId}/decision`,
            payload
        );
        return res.data;
    },
};

// contract: E1/E2 — awaiting backend B-E1/B-E2
export interface NonemployeePerson {
    id: string;
    full_name: string;
    company_id: string;
    company_name: string;
    location_id: string;
    location_name: string;
    department_id: string;
    department_name: string;
    contact_hint?: string | null;
    is_active: boolean;
}

export const nonemployeeApi = {
    search: async (q: string): Promise<NonemployeePerson[]> => {
        const res = await apiClient.get<NonemployeePerson[]>('/nonemployees', { params: { q } });
        return res.data;
    },
    create: async (payload: {
        full_name: string;
        company_id: string;
        location_id: string;
        department_id: string;
        contact_hint?: string;
    }): Promise<NonemployeePerson> => {
        const res = await apiClient.post<NonemployeePerson>('/nonemployees', payload);
        return res.data;
    },
    trackDelegated: async (
        code: string,
        payload?: { delegation_token?: string }
    ): Promise<StaffTicketResponse & { represented_person?: string; delegation_status?: 'active' | 'expired' | 'revoked' }> => {
        const res = await apiClient.post(`/tickets/${code}/delegated-track`, payload ?? {});
        return res.data;
    },
    confirmDelegatedClosure: async (
        ticketId: string,
        payload: { delegation_token?: string; remarks?: string; represented_person?: string }
    ): Promise<StaffTicketResponse> => {
        const res = await apiClient.post<StaffTicketResponse>(`/tickets/${ticketId}/delegated-confirm`, payload);
        return res.data;
    },
};

// contract: E3 — awaiting backend B-E3
export interface RepeatRequesterTicketItem {
    id: string;
    ticket_code: string;
    task_name: string;
    status: TicketStatus;
    location_name: string;
    department_name: string;
    date_started: string;
}

export interface RepeatRequesterDrilldownResponse {
    requestor_name: string;
    total_count: number;
    is_uncertain_legacy?: boolean;
    groups: Array<{
        location_name: string;
        department_name: string;
        count: number;
    }>;
    items: RepeatRequesterTicketItem[];
    page: number;
    page_size: number;
    has_more?: boolean;
}

export const repeatRequesterApi = {
    getDrilldown: async (params: {
        requestor_name: string;
        requester_id?: string;
        location_name?: string;
        department_name?: string;
        page?: number;
        page_size?: number;
    }): Promise<RepeatRequesterDrilldownResponse> => {
        const res = await apiClient.get<RepeatRequesterDrilldownResponse>('/reports/repeat-requestors/drilldown', {
            params,
        });
        return res.data;
    },
};

// contract: F1/F2 — awaiting backend B-F1/B-F2
export interface AssetRecord {
    id: string;
    asset_tag: string;
    serial_number?: string | null;
    model_name: string;
    category_code?: string | null;
    location_name?: string | null;
    department_name?: string | null;
    acquisition_date?: string | null;
    acquisition_cost?: number | null;
    status: 'ACTIVE' | 'RETIRED' | 'UNKNOWN';
}

export interface AssetServiceMetric {
    asset_id: string;
    asset_tag: string;
    serial_number?: string | null;
    model_name: string;
    acquisition_date?: string | null;
    age_months: number | null;
    service_incident_count: number;
    repair_cost_total: number | null;
    acquisition_cost: number | null;
    data_limitation_note?: string | null;
}

export const assetsApi = {
    list: async (params?: { q?: string; location_id?: string }): Promise<AssetRecord[]> => {
        const res = await apiClient.get<AssetRecord[]>('/assets', { params });
        return res.data;
    },
    attachToTicket: async (ticketId: string, assetId: string): Promise<StaffTicketResponse> => {
        const res = await apiClient.patch<StaffTicketResponse>(`/tickets/${ticketId}/asset`, {
            asset_id: assetId,
        });
        return res.data;
    },
    getServiceMetrics: async (params?: {
        date_from?: string;
        date_to?: string;
        location_id?: string;
    }): Promise<AssetServiceMetric[]> => {
        const res = await apiClient.get<AssetServiceMetric[]>('/reports/asset-service-metrics', { params });
        return res.data;
    },
};

// contract: G1/G2 — awaiting backend B-G1/B-G2
export type CategoryRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export interface CategorySubcategoryItem {
    code: string;
    name: string;
    default_risk?: CategoryRiskLevel | null;
    effective_risk: CategoryRiskLevel;
    is_active: boolean;
}

export interface CategoryCatalogItem {
    code: string;
    name: string;
    default_risk: CategoryRiskLevel;
    is_active: boolean;
    subcategories: CategorySubcategoryItem[];
}

export const categoryCatalogApi = {
    getCatalog: async (includeInactive = false): Promise<CategoryCatalogItem[]> => {
        const res = await apiClient.get<CategoryCatalogItem[]>('/categories/catalog', {
            params: { include_inactive: includeInactive },
        });
        return res.data;
    },
    updateCategory: async (
        code: string,
        payload: { name?: string; default_risk?: CategoryRiskLevel; is_active?: boolean }
    ): Promise<CategoryCatalogItem> => {
        const res = await apiClient.patch<CategoryCatalogItem>(
            `/categories/catalog/${encodeURIComponent(code)}`,
            payload
        );
        return res.data;
    },
    upsertSubcategory: async (
        parentCode: string,
        payload: { code: string; name: string; default_risk?: CategoryRiskLevel | null; is_active?: boolean }
    ): Promise<CategorySubcategoryItem> => {
        const res = await apiClient.put<CategorySubcategoryItem>(
            `/categories/catalog/${encodeURIComponent(parentCode)}/subcategories/${encodeURIComponent(payload.code)}`,
            payload
        );
        return res.data;
    },
};
