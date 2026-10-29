export type StaffRole = 'intern' | 'it' | 'supervisor' | 'admin' | 'analyst';
export type UserRole = StaffRole;

export interface Company {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Location {
  id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface EmployeeProfile {
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
  is_active?: boolean;
}

export * from './ticket';
export * from './team';
export * from './analytics';
