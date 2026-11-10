import type { Ticket } from '../types/ticket';

export function canEditTicket(
    currentUser: { id?: string; role?: string; name?: string } | null,
    ticket: Ticket | null | undefined
): boolean {
    if (!currentUser || !ticket) return false;
    if (ticket.status === 'OPEN' && !ticket.workedById && !ticket.assigned_tech_id && !ticket.workedBy) {
    return true;
    }
    const techId = ticket.assigned_tech_id || ticket.workedById;
    const matchId = Boolean(techId && currentUser.id && currentUser.id === techId);
    const matchName = Boolean(
    ticket.workedBy &&
    currentUser.name &&
    ticket.workedBy.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    );
    return matchId || matchName;
}