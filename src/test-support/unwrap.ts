// Gör ett { ok }-resultat till sin lyckade variant, eller kastar så att testet
// slutar direkt med ett begripligt meddelande.
export function unwrap<T extends { ok: boolean }>(
  result: T,
  failureMessage: string,
): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(failureMessage);
  return result as Extract<T, { ok: true }>;
}
