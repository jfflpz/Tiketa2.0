// @spec SR-03: Safe Fallback for Dictionary Lookup (avoid raw UUID display)
import type { DictionariesResponse, StaffTicketResponse } from '../api/client';
import { COMPANIES, LOCATIONS, DEPARTMENTS, TASK_CATEGORIES } from '../constants/domain';
import type { Ticket, TaskCategoryCode } from '../types/ticket';

// Matches standard RFC 4122 UUIDs as well as alphanumeric hyphenated UUID patterns (8-4-4-4-12)
const UUID_REGEX = /^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/i;

export const isUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return UUID_REGEX.test(val.trim());
};

export const resolveCompanyName = (
  idOrCode?: string | null,
  dict?: DictionariesResponse | null,
  rawName?: string | null,
): string => {
  if (rawName && !isUuid(rawName)) return rawName;
  if (!idOrCode) return 'Pangasinan Five Star Bus Co.';
  const fromDict = dict?.companies.find((c) => c.id === idOrCode || c.code === idOrCode);
  if (fromDict?.name) return fromDict.name;
  const fromConst = COMPANIES.find(
    (c) => c.code.toUpperCase() === idOrCode.toUpperCase() || c.name.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (fromConst?.name) return fromConst.name;
  if (isUuid(idOrCode)) return 'Pangasinan Five Star Bus Co.';
  return idOrCode;
};

export const resolveCompanyCode = (
  idOrCode?: string | null,
  dict?: DictionariesResponse | null,
): string => {
  if (!idOrCode) return 'FS';
  const fromDict = dict?.companies.find((c) => c.id === idOrCode || c.code === idOrCode);
  if (fromDict?.code) return fromDict.code;
  const fromConst = COMPANIES.find(
    (c) => c.code.toUpperCase() === idOrCode.toUpperCase() || c.name.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (fromConst?.code) return fromConst.code;
  return isUuid(idOrCode) ? 'FS' : idOrCode;
};

export const resolveLocationName = (
  idOrCode?: string | null,
  dict?: DictionariesResponse | null,
  rawName?: string | null,
): string => {
  if (rawName && !isUuid(rawName)) return rawName;
  if (!idOrCode) return 'Terminal Station';
  const fromDict = dict?.locations.find((l) => l.id === idOrCode || l.code === idOrCode);
  if (fromDict?.name) return fromDict.name;
  const fromConst = LOCATIONS.find(
    (l) => l.code.toUpperCase() === idOrCode.toUpperCase() || l.name.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (fromConst?.name) return fromConst.name;
  if (isUuid(idOrCode)) return 'Terminal Station';
  return idOrCode;
};

export const resolveLocationCode = (
  idOrCode?: string | null,
  dict?: DictionariesResponse | null,
): string => {
  if (!idOrCode) return 'TERM';
  const fromDict = dict?.locations.find((l) => l.id === idOrCode || l.code === idOrCode);
  if (fromDict?.code) return fromDict.code;
  const fromConst = LOCATIONS.find(
    (l) => l.code.toUpperCase() === idOrCode.toUpperCase() || l.name.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (fromConst?.code) return fromConst.code;
  return isUuid(idOrCode) ? 'TERM' : idOrCode;
};

export const resolveDepartmentName = (
  idOrCode?: string | null,
  dict?: DictionariesResponse | null,
  rawName?: string | null,
): string => {
  if (rawName && !isUuid(rawName)) return rawName;
  if (!idOrCode) return 'Operations';
  const fromDict = dict?.departments.find((d) => d.id === idOrCode || d.code === idOrCode);
  if (fromDict?.name) return fromDict.name;
  const fromConst = DEPARTMENTS.find(
    (d) => d.code.toUpperCase() === idOrCode.toUpperCase() || d.name.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (fromConst?.name) return fromConst.name;
  if (isUuid(idOrCode)) return 'Operations';
  return idOrCode;
};

export const resolveDepartmentCode = (
  idOrCode?: string | null,
  dict?: DictionariesResponse | null,
): string => {
  if (!idOrCode) return 'OPS';
  const fromDict = dict?.departments.find((d) => d.id === idOrCode || d.code === idOrCode);
  if (fromDict?.code) return fromDict.code;
  const fromConst = DEPARTMENTS.find(
    (d) => d.code.toUpperCase() === idOrCode.toUpperCase() || d.name.toLowerCase() === idOrCode.toLowerCase(),
  );
  if (fromConst?.code) return fromConst.code;
  return isUuid(idOrCode) ? 'OPS' : idOrCode;
};

/** Use the same saved values after creation and after a queue refresh. */
export const mapStaffTicket = (
  row: StaffTicketResponse,
  dictionaries: DictionariesResponse | null,
  technicianName?: string,
): Ticket => {
  const task = TASK_CATEGORIES.find((item) => item.code === row.task_code);
  const taskDictName = dictionaries?.tasks.find((item) => item.code === row.task_code || item.id === row.task_code)?.name;

  const rawLocation = (row as any).location_name || (row as any).location;
  const rawDepartment = (row as any).department_name || (row as any).department;
  const rawCompany = (row as any).company_name || (row as any).company;

  return {
    id: row.id,
    ticketCode: row.ticket_code,
    company: resolveCompanyName(row.company_id, dictionaries, rawCompany),
    companyCode: resolveCompanyCode(row.company_id, dictionaries),
    companyId: row.company_id,
    location: resolveLocationName(row.location_id, dictionaries, rawLocation),
    locationCode: resolveLocationCode(row.location_id, dictionaries),
    locationId: row.location_id,
    departmentId: row.department_id,
    department: resolveDepartmentName(row.department_id, dictionaries, rawDepartment),
    departmentCode: resolveDepartmentCode(row.department_id, dictionaries),
    requestor: row.requester_name || 'Terminal Staff',
    employeeId: row.employee_id_number ?? undefined,
    task: taskDictName ?? task?.name ?? row.task_code,
    taskCode: row.task_code as TaskCategoryCode,
    description: row.description,
    technicianDiagnosis: (row as any).diagnosis || undefined,
    resolutionNotes: (row as any).resolution_notes || undefined,
    mode: row.mode ?? 'SITE',
    month: row.month,
    dateStarted: row.date_started,
    timeStarted: row.time_started ?? '',
    timeFinished: row.time_finished ?? undefined,
    dateFinished: row.date_finished ?? undefined,
    duration: row.duration == null ? undefined : Number(row.duration),
    status: row.status,
    workedBy: row.technician_name ?? technicianName,
    workedById: row.assigned_tech_id ?? undefined,
    assigned_tech_id: row.assigned_tech_id ?? undefined,
    priority: task?.defaultPriority ?? 'Medium',
    createdAt: row.created_at,
    userConfirmedAt: row.user_confirmed_at ?? undefined,
    closureDeadlineAt: row.closure_deadline_at ?? row.closure_token_expires_at ?? undefined,
    closureReason: row.closure_reason ?? undefined,
    autoClosedAt: row.auto_closed_at ?? undefined,
    confirmedBy: row.confirmed_by ?? undefined,
    isPaused: Boolean(row.is_paused),
    pausedAt: row.paused_at ?? undefined,
    pauseReason: row.pause_reason ?? undefined,
    activeMinutes: row.active_minutes == null ? undefined : Number(row.active_minutes),
    elapsedMinutes: row.elapsed_minutes == null ? undefined : Number(row.elapsed_minutes),
    subcategoryCode: row.subcategory_code ?? undefined,
    subcategoryName: row.subcategory_name ?? undefined,
    riskLevel: row.risk_level ?? undefined,
    assetId: row.asset_id ?? undefined,
    assetTag: row.asset_tag ?? undefined,
    assetSerial: row.asset_serial ?? undefined,
    assetModel: row.asset_model ?? undefined,
    messages: [],
  };
};
