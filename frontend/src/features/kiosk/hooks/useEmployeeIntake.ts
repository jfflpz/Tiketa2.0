import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { TaskCategoryCode, Ticket } from '../../../types/ticket';
import { LOCATIONS } from '../../../constants/domain';

export function useEmployeeIntake() {
  const activeOfficeLocationCode = useAppStore((state) => state.activeOfficeLocationCode);
  const submitTicketApi = useAppStore((state) => state.submitTicketApi);
  const lookupEmployeeApi = useAppStore((state) => state.lookupEmployeeApi);

  const [employeeId, setEmployeeId] = useState('FS-1042');
  const [declaredName, setDeclaredName] = useState('Maria Santos');
  const [selectedTask, setSelectedTask] = useState<TaskCategoryCode>('PRN-TS');
  const [description, setDescription] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  const [isSearchingEmployee, setIsSearchingEmployee] = useState(false);
  const [employeeVerified, setEmployeeVerified] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<{
    company?: string;
    location?: string;
    department?: string;
  }>({
    company: 'Five Star Bus Co.',
    location: 'Pasay Terminal',
    department: 'Operations',
  });

  const activeHub =
    LOCATIONS.find((l) => l.code === activeOfficeLocationCode) ?? LOCATIONS[5];

  // Request sequence counter and cancellation to discard stale lookups on typing or unmount
  const latestLookupIdRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;
    const cleanId = employeeId.trim().toUpperCase();

    // Immediately invalidate verification state on input change
    setEmployeeVerified(false);
    setLookupError(null);

    if (!cleanId || cleanId.length < 2) {
      setIsSearchingEmployee(false);
      return () => {
        isCancelled = true;
      };
    }

    const currentReq = ++latestLookupIdRef.current;
    setIsSearchingEmployee(true);

    const timer = setTimeout(async () => {
      try {
        const liveEmp = await lookupEmployeeApi(cleanId);
        if (isCancelled || currentReq !== latestLookupIdRef.current) return;

        if (liveEmp && liveEmp.full_name) {
          setDeclaredName(liveEmp.full_name);
          setEmployeeVerified(true);
          setEmployeeDetails({
            company: liveEmp.company_name,
            location: liveEmp.location_name,
            department: liveEmp.department_name,
          });
          setLookupError(null);
        } else {
          setEmployeeVerified(false);
          setLookupError(`Employee ID "${cleanId}" not recognized in active directory.`);
        }
      } catch {
        if (isCancelled || currentReq !== latestLookupIdRef.current) return;
        setEmployeeVerified(false);
        setLookupError(`Unable to verify Employee ID "${cleanId}".`);
      } finally {
        if (!isCancelled && currentReq === latestLookupIdRef.current) {
          setIsSearchingEmployee(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [employeeId, lookupEmployeeApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeVerified || isSubmitting) return;
    if (!description.trim() && !selectedTask) return;

    setIsSubmitting(true);
    const created = await submitTicketApi({
      employeeId: employeeId.trim().toUpperCase(),
      taskCode: selectedTask,
      description:
        description.trim() ||
        `Reported from ${employeeDetails.location || activeHub.name} employee helpdesk screen.`,
      companyName: employeeDetails.company ?? 'Pangasinan Five Star Bus Co.',
      locationName: employeeDetails.location ?? activeHub.name,
      departmentName: employeeDetails.department ?? 'Operation',
      requestorName: declaredName.trim() || 'Terminal Staff',
    });

    setIsSubmitting(false);
    if (created) {
      setSubmittedTicket(created);
      setDescription('');
    }
  };

  const resetIntake = () => {
    setSubmittedTicket(null);
    setDescription('');
  };

  return {
    employeeId,
    setEmployeeId,
    declaredName,
    selectedTask,
    setSelectedTask,
    description,
    setDescription,
    submittedTicket,
    isSearchingEmployee,
    employeeVerified,
    lookupError,
    isSubmitting,
    employeeDetails,
    activeHub,
    handleSubmit,
    resetIntake,
  };
}
