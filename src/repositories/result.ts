// Felkoder som en skrivning mot en provning kan ge. Anroparen översätter dem
// till text som passar sammanhanget.
export type RepositoryError = "not_found" | "invalid_state";

export type RepositoryResult<Success extends object> =
  | ({ ok: true } & Success)
  | { ok: false; error: RepositoryError };
