import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAppStore } from '../../../store/useAppStore';
import type { TaskCategoryCode, Ticket } from '../../../types/ticket';
import { LOCATIONS } from '../../../constants/domain';

export interface LocationObservationState {
  status: 'idle' | 'requesting' | 'captured' | 'denied' | 'unavailable';
  observationId: string | null;
  accuracy: number | null;
  capturedAt: string | null;
  message: string | null;
}

export function formatRemainingTime(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function useEmployeeIntake() {
  const activeOfficeLocationCode = useAppStore((state) => state.activeOfficeLocationCode);
  const matchEmployeeApi = useAppStore((state) => state.matchEmployeeApi);
  const recordLocationObservationApi = useAppStore((state) => state.recordLocationObservationApi);
  const submitTicketApi = useAppStore((state) => state.submitTicketApi);

  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskCategoryCode>('PRN-TS');
  const [description, setDescription] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

  // Verification & Cooldown State
  const [isMatching, setIsMatching] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [matchToken, setMatchToken] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Matched Profile (authoritative from server)
  const [employeeProfile, setEmployeeProfile] = useState<{
    fullName: string;
    company: string;
    location: string;
    department: string;
  } | null>(null);

  // Optional Geolocation State
  const [locationState, setLocationState] = useState<LocationObservationState>({
    status: 'idle',
    observationId: null,
    accuracy: null,
    capturedAt: null,
    message: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeHub =
    LOCATIONS.find((l) => l.code === activeOfficeLocationCode) ?? LOCATIONS[5];

  // Cooldown countdown timer
  const cooldownIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownIntervalRef.current = window.setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
            setMatchError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownSeconds]);

  // Invalidate match if user modifies employeeId or email after a match
  const handleEmployeeIdChange = (val: string) => {
    // Only accept numeric ASCII digits (1-50 digits), preserving leading zeros
    const digitsOnly = val.replace(/\D/g, '').slice(0, 50);
    setEmployeeId(digitsOnly);
    if (isMatched) {
      setIsMatched(false);
      setMatchToken(null);
      setEmployeeProfile(null);
    }
    setMatchError(null);
  };

  const handleEmailChange = (val: string) => {
    setRegisteredEmail(val);
    if (isMatched) {
      setIsMatched(false);
      setMatchToken(null);
      setEmployeeProfile(null);
    }
    setMatchError(null);
  };

  // Trigger matching on deliberate "Continue" click
  const handleContinueMatching = async () => {
    if (cooldownSeconds > 0 || isMatching) return;

    const cleanId = employeeId.trim();
    const cleanEmail = registeredEmail.trim();

    if (!cleanId || !cleanEmail) {
      setMatchError('Please enter both your Employee ID and registered email.');
      return;
    }

    setIsMatching(true);
    setMatchError(null);

    try {
      const result = await matchEmployeeApi(cleanId, cleanEmail);
      if (result && result.match_token) {
        setIsMatched(true);
        setMatchToken(result.match_token);
        setEmployeeProfile({
          fullName: result.employee.full_name,
          company: result.employee.company_name,
          location: result.employee.location_name,
          department: result.employee.department_name,
        });
        setMatchError(null);
      }
    } catch (err: unknown) {
      setIsMatched(false);
      setMatchToken(null);
      setEmployeeProfile(null);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          const retryHeader = err.response.headers?.['retry-after'];
          const retryBody = err.response.data?.retry_after;
          const retrySec = Number(retryHeader || retryBody || 120);
          setCooldownSeconds(retrySec > 0 ? retrySec : 120);
          setMatchError(`Too many failed matching attempts.`);
        } else if (err.response?.status === 404) {
          setMatchError('Employee ID and email do not match an active employee record.');
        } else {
          setMatchError(
            err.response?.data?.detail ||
              'Unable to match employee record at this time. Please retry.'
          );
        }
      } else {
        setMatchError('A network or server error occurred. Please check your connection.');
      }
    } finally {
      setIsMatching(false);
    }
  };

  // Optional Geolocation capture
  const handleCaptureLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationState({
        status: 'unavailable',
        observationId: null,
        accuracy: null,
        capturedAt: null,
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }

    setLocationState((prev) => ({
      ...prev,
      status: 'requesting',
      message: 'Requesting device coordinates...',
    }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const capturedTime = new Date().toLocaleTimeString();
        try {
          const obs = await recordLocationObservationApi({
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
          });
          setLocationState({
            status: 'captured',
            observationId: obs ? obs.observation_id : null,
            accuracy: Math.round(accuracy),
            capturedAt: capturedTime,
            message: `Location captured (±${Math.round(accuracy)}m)`,
          });
        } catch {
          // Failure to persist observation does not block user
          setLocationState({
            status: 'captured',
            observationId: null,
            accuracy: Math.round(accuracy),
            capturedAt: capturedTime,
            message: `Location captured (±${Math.round(accuracy)}m, unlinked)`,
          });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationState({
            status: 'denied',
            observationId: null,
            accuracy: null,
            capturedAt: null,
            message: 'Location permission denied. Reporting remains fully available.',
          });
        } else {
          setLocationState({
            status: 'unavailable',
            observationId: null,
            accuracy: null,
            capturedAt: null,
            message: 'Location signal unavailable. Reporting remains fully available.',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [recordLocationObservationApi]);

  // Submit ticket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched || !matchToken || isSubmitting) return;
    if (!description.trim() && !selectedTask) return;

    setIsSubmitting(true);
    const created = await submitTicketApi({
      employeeId: employeeId.trim(),
      taskCode: selectedTask,
      description:
        description.trim() ||
        `Reported from ${employeeProfile?.location || activeHub.name} employee helpdesk screen.`,
      matchToken,
      observationId: locationState.observationId,
      companyName: employeeProfile?.company ?? 'Pangasinan Five Star Bus Co.',
      locationName: employeeProfile?.location ?? activeHub.name,
      departmentName: employeeProfile?.department ?? 'Operation',
      requestorName: employeeProfile?.fullName ?? 'Terminal Staff',
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
    // Retain matched profile if desired, or reset
  };

  return {
    employeeId,
    setEmployeeId: handleEmployeeIdChange,
    registeredEmail,
    setRegisteredEmail: handleEmailChange,
    selectedTask,
    setSelectedTask,
    description,
    setDescription,
    submittedTicket,
    isMatching,
    isMatched,
    matchToken,
    matchError,
    cooldownSeconds,
    employeeProfile,
    locationState,
    handleCaptureLocation,
    handleContinueMatching,
    isSubmitting,
    activeHub,
    handleSubmit,
    resetIntake,
  };
}
