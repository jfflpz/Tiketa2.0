import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import {
  directoryApi,
  nonemployeeApi,
  extractApiErrorMessage,
  type EmployeeLookupResult,
  type NonemployeePerson,
} from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import type { SupportMode, TaskCategoryCode, Ticket } from '../../types/ticket';

export const useQuickIntake = () => {
  const isOpen = useAppStore((state) => state.isQuickIntakeOpen);
  const setOpen = useAppStore((state) => state.setQuickIntakeOpen);
  const submit = useAppStore((state) => state.quickIntakeApi);
  const fetchDictionaries = useAppStore((state) => state.fetchDictionaries);
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState<EmployeeLookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState('Enter an employee ID to find their registered profile.');
  const [lookupPending, setLookupPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [taskCode, setTaskCode] = useState<TaskCategoryCode>('PRN-TS');
  const [subcategoryCode, setSubcategoryCode] = useState<string>('');
  const [mode, setMode] = useState<SupportMode>('REM');

  const handleTaskCodeChange = (code: TaskCategoryCode) => {
    setTaskCode(code);
    setSubcategoryCode(''); // Clear stale child selection when parent changes (F-G2)
  };
  const [description, setDescription] = useState('');
  const [requesterType, setRequesterType] = useState<'employee' | 'nonemployee'>('employee');
  const [reporterName, setReporterName] = useState('');
  const [nonemployeeQuery, setNonemployeeQuery] = useState('');
  const [nonemployeeResults, setNonemployeeResults] = useState<NonemployeePerson[]>([]);
  const [selectedNonemployee, setSelectedNonemployee] = useState<NonemployeePerson | null>(null);
  const [isSearchingNonemployees, setIsSearchingNonemployees] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const lookupSequence = useRef(0);
  const submitting = useRef(false);
  const sessionSequence = useRef(0);

  useEffect(() => {
    if (isOpen) void fetchDictionaries();
    return () => { sessionSequence.current += 1; };
  }, [isOpen, fetchDictionaries]);

  useEffect(() => {
    const sequence = ++lookupSequence.current;
    let cancelled = false;
    setEmployee(null);
    setLookupPending(false);
    const id = employeeId.trim();
    if (!isOpen || !/^[0-9]{1,50}$/.test(id)) {
      setLookupMessage(id ? 'Use 1–50 digits only, without the FS- prefix.' : 'Enter an employee ID to find their registered profile.');
      return;
    }
    setLookupPending(true);
    setLookupMessage('Looking up employee…');
    const timer = window.setTimeout(async () => {
      try {
        const profile = await directoryApi.lookupEmployee(id);
        if (cancelled || sequence !== lookupSequence.current) return;
        if (!profile.is_active || profile.employee_id !== id) {
          setLookupMessage('No active employee matches this ID. Ask an administrator to add or correct the employee profile, then retry.');
          return;
        }
        setEmployee(profile);
        setLookupMessage('Registered employee found. Company, terminal and department come from the directory.');
      } catch (err: unknown) {
        if (cancelled || sequence !== lookupSequence.current) return;
        setLookupMessage(axios.isAxiosError(err) && err.response?.status === 404
          ? 'No active employee matches this ID. Ask an administrator to add or correct the employee profile, then retry.'
          : extractApiErrorMessage(err, 'Employee lookup is unavailable. Please retry.'));
      } finally {
        if (!cancelled && sequence === lookupSequence.current) setLookupPending(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [employeeId, isOpen, retry]);

  const changeEmployeeId = (value: string) => {
    ++lookupSequence.current;
    setEmployee(null);
    setError('');
    setEmployeeId(value);
  };
  const reset = () => {
    changeEmployeeId('');
    setDescription('');
    setCreatedTicket(null);
    setTaskCode('PRN-TS');
    setMode('REM');
    setRequesterType('employee');
    setReporterName('');
    setNonemployeeQuery('');
    setNonemployeeResults([]);
    setSelectedNonemployee(null);
  };
  const close = () => {
    if (submitting.current) return;
    reset();
    setOpen(false);
  };

  const searchNonemployees = async (q: string) => {
    setNonemployeeQuery(q);
    if (!q.trim()) {
      setNonemployeeResults([]);
      return;
    }
    setIsSearchingNonemployees(true);
    try {
      const results = await nonemployeeApi.search(q.trim());
      setNonemployeeResults(Array.isArray(results) ? results : []);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to search nonemployee records.'));
    } finally {
      setIsSearchingNonemployees(false);
    }
  };

  const createNonemployee = async (payload: {
    full_name: string;
    company_id: string;
    location_id: string;
    department_id: string;
    contact_hint?: string;
  }): Promise<NonemployeePerson | null> => {
    setError('');
    try {
      const created = await nonemployeeApi.create(payload);
      setSelectedNonemployee(created);
      setNonemployeeResults((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      return created;
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to register nonemployee profile.'));
      return null;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (requesterType === 'employee' && (!employee || employee.employee_id !== employeeId.trim())) return;
    if (requesterType === 'nonemployee' && !selectedNonemployee) {
      setError('Select or register the actual nonemployee requester before submitting.');
      return;
    }
    const details = description.trim();
    if (details.length < 10 || details.length > 20000) {
      setError('Enter between 10 and 20,000 characters in Technical Symptoms & Details.');
      return;
    }
    submitting.current = true;
    setSubmitting(true);
    setError('');
    const session = sessionSequence.current;
    try {
      const ticket = await submit({
        employeeId: requesterType === 'employee' ? employee!.employee_id : '',
        taskCode,
        subcategoryCode: subcategoryCode || undefined,
        mode,
        description: details,
        reporterName: reporterName.trim() || undefined,
        requesterType,
        nonemployeeId: requesterType === 'nonemployee' ? selectedNonemployee!.id : undefined,
      });
      if (session !== sessionSequence.current) return;
      if (ticket) setCreatedTicket(ticket);
      else setError('The ticket was not confirmed as saved. Your entries are kept here. Check the error message and queue before retrying.');
    } catch (err: unknown) {
      if (session === sessionSequence.current) setError(extractApiErrorMessage(err, 'Unable to submit the ticket. Your entries have been kept.'));
    } finally {
      submitting.current = false;
      setSubmitting(false);
    }
  };
  return { isOpen, close, reset, employeeId, changeEmployeeId, employee, lookupMessage,
    lookupPending, retryLookup: () => { setEmployee(null); ++lookupSequence.current; setRetry((value) => value + 1); },
    requesterType, setRequesterType, reporterName, setReporterName,
    nonemployeeQuery, nonemployeeResults, selectedNonemployee, setSelectedNonemployee,
    isSearchingNonemployees, searchNonemployees, createNonemployee,
    taskCode, setTaskCode: handleTaskCodeChange, subcategoryCode, setSubcategoryCode, mode, setMode, description, setDescription, error, isSubmitting,
    createdTicket, handleSubmit };
};
