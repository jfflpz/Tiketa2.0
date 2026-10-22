// @spec SR-03: Canonical Transit Fleet Domain Dictionaries
import { TaskCategoryCode } from '../types';

export const COMPANIES = [
  { code: 'FS', name: 'Pangasinan Five Star Bus Co.' },
  { code: 'LCTI', name: 'Luzon Cisco Transit Inc.' },
  { code: 'BTCI', name: 'Bataan Transit Co., Inc.' },
  { code: 'FNLT', name: 'First North Luzon Transit' },
  { code: 'MDL', name: 'Maria De Leon' },
  { code: 'CBM', name: 'Cubao Motors' },
  { code: 'ATTI', name: 'Asian Transport and Tourism Institute Inc.' },
  { code: 'LNDRY', name: 'Laundry Group' },
  { code: 'FSC', name: 'Food Stop Company' },
  { code: 'HG', name: 'Hotel Group' },
  { code: 'AH', name: 'Adamo Holdings' },
];

export const LOCATIONS = [
  { code: 'AVN', name: 'Avenida Terminal' },
  { code: 'BTM', name: 'Bataan Mirasol' },
  { code: 'CAL', name: 'Caloocan Terminal' },
  { code: 'FSM', name: 'Five Star Mirasol' },
  { code: 'PSY', name: 'Pasay Terminal' },
  { code: 'CMA', name: 'Cubao Maya Terminal' },
  { code: 'MEY', name: 'Meycauayan Shop' },
  { code: 'MTL', name: 'Montreal Station' },
  { code: 'SNC', name: 'San Carlos Shop' },
  { code: 'SSH', name: 'Sunshine Workshop' },
  { code: 'CLS', name: 'Calasiao Depot' },
  { code: 'CSM', name: 'Cisco Mirasol' },
  { code: 'VAL', name: 'Valenzuela Depot' },
  { code: 'NWT', name: 'Northway Terminal' },
  { code: 'TRL', name: 'Tarlac Gateway Hub' },
];

export const DEPARTMENTS = [
  { code: 'OPS', name: 'Operation' },
  { code: 'CASH', name: 'Cash Management' },
  { code: 'ACCT', name: 'Accounting' },
  { code: 'MAINT', name: 'Maintenance' },
  { code: 'BP-FUEL', name: 'Business Process - Fuel Team' },
  { code: 'BP-GPS', name: 'Business Process - GPS Team' },
  { code: 'SOG-DIG', name: 'SOG - Digital' },
  { code: 'HR', name: 'Human Resources' },
  { code: 'PURCH', name: 'Purchasing' },
  { code: 'CS', name: 'Customer Service' },
  { code: 'FIN', name: 'Finance' },
  { code: 'ADMIN', name: 'Admin' },
  { code: 'SEC', name: 'Security' },
];

export const TASK_CATEGORIES: {
  code: TaskCategoryCode;
  name: string;
  defaultPriority: 'Low' | 'Medium' | 'High' | 'Critical';
}[] = [
  { code: 'SRV-ASSESS', name: 'Server Assessment', defaultPriority: 'Critical' },
  { code: 'NET-CFG', name: 'Network Configuration', defaultPriority: 'High' },
  { code: 'PRN-TS', name: 'Printer Troubleshoot', defaultPriority: 'High' },
  { code: 'PC-HW-REP', name: 'PC/Laptop Hardware Replacement', defaultPriority: 'High' },
  { code: 'PC-TS', name: 'PC/Laptop Troubleshoot', defaultPriority: 'Medium' },
  { code: 'SW-ASST', name: 'Software Assistance', defaultPriority: 'Medium' },
  { code: 'PRN-NET', name: 'Printer Network Connection', defaultPriority: 'Medium' },
  { code: 'PERIPH-REP', name: 'Peripherals Replacement', defaultPriority: 'Low' },
  { code: 'PC-ASSESS', name: 'PC/Laptop Assessment', defaultPriority: 'Low' },
  { code: 'PC-PMS', name: 'PC/Laptop PMS', defaultPriority: 'Low' },
  { code: 'PRN-PMS', name: 'Printer PMS', defaultPriority: 'Low' },
  { code: 'PC-SETUP', name: 'PC/Laptop Set-up', defaultPriority: 'Medium' },
  { code: 'PRN-SETUP', name: 'Printer Set-up', defaultPriority: 'Medium' },
];


export const HOURLY_PEAK_DEMAND_DATA = [
  { hour: '06:00', tickets: 8 },
  { hour: '07:00', tickets: 24 },
  { hour: '08:00', tickets: 31 },
  { hour: '09:00', tickets: 19 },
  { hour: '10:00', tickets: 14 },
  { hour: '11:00', tickets: 12 },
  { hour: '13:00', tickets: 16 },
  { hour: '14:00', tickets: 22 },
  { hour: '15:00', tickets: 18 },
  { hour: '16:00', tickets: 11 },
  { hour: '17:00', tickets: 7 },
];
