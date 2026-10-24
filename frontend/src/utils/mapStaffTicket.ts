import type { DictionariesResponse, StaffTicketResponse } from '../api/client';
import { TASK_CATEGORIES } from '../constants/domain';
import type { Ticket, TaskCategoryCode } from '../types/ticket';

/** Use the same saved values after creation and after a queue refresh. */
export const mapStaffTicket = (
  row: StaffTicketResponse,
  dictionaries: DictionariesResponse | null,
  technicianName?: string,
): Ticket => {
  const company = dictionaries?.companies.find((item) => item.id === row.company_id);
  const location = dictionaries?.locations.find((item) => item.id === row.location_id);
  const department = dictionaries?.departments.find((item) => item.id === row.department_id);
  const task = TASK_CATEGORIES.find((item) => item.code === row.task_code);
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    company: company?.name ?? row.company_id,
    companyCode: company?.code ?? '',
    location: location?.name ?? row.location_id,
    locationCode: location?.code ?? '',
    department: department?.name ?? row.department_id,
    departmentCode: department?.code ?? '',
    requestor: row.requester_name,
    task: dictionaries?.tasks.find((item) => item.code === row.task_code)?.name ?? task?.name ?? row.task_code,
    taskCode: row.task_code as TaskCategoryCode,
    description: row.description,
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
    messages: [],
  };
};
