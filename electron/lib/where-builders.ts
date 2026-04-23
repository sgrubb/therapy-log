import { TherapistStatus, ClientStatus, SessionStatus } from "@shared/types/enums";

export function buildTherapistWhere(status: TherapistStatus) {
  return {
    ...(status === TherapistStatus.Active ? { deactivated_date: null } : {}),
    ...(status === TherapistStatus.Inactive ? { deactivated_date: { not: null } } : {}),
  };
}

export function buildClientWhere(params: {
  status?: ClientStatus;
  therapistId?: number | null;
  search?: string;
}) {
  return {
    ...(params.status === ClientStatus.Open ? { closed_date: null } : {}),
    ...(params.status === ClientStatus.Closed ? { closed_date: { not: null } } : {}),
    ...(params.therapistId != null ? { therapist_id: params.therapistId } : {}),
    ...(params.search
      ? {
          OR: [
            { first_name: { contains: params.search } },
            { last_name: { contains: params.search } },
            { hospital_number: { contains: params.search } },
          ],
        }
      : {}),
  };
}

export function buildSessionWhere(filters: {
  from?: Date;
  to?: Date;
  therapistIds?: number[];
  clientId?: number;
  status?: SessionStatus;
}) {
  return {
    ...(filters.from || filters.to
      ? {
          scheduled_at: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.therapistIds?.length ? { therapist_id: { in: filters.therapistIds } } : {}),
    ...(filters.clientId ? { client_id: filters.clientId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}
