export type AccountState =
  | "ACTIVE"
  | "PENDING"
  | "INACTIVE"
  | "RESIGNED";

export interface LegacyAccountSnapshot {
  readonly active: boolean;
  readonly resignationDate: string | null;
  readonly agencyId: string | null;
  readonly departmentId: string | null;
}

export function classifyLegacyAccountState(
  snapshot: LegacyAccountSnapshot,
): AccountState {
  if (snapshot.active) {
    return "ACTIVE";
  }

  if (snapshot.resignationDate) {
    return "RESIGNED";
  }

  if (!snapshot.agencyId || !snapshot.departmentId) {
    return "PENDING";
  }

  return "INACTIVE";
}
