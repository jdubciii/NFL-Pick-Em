/**
 * Authoritative Kickoff Lock Evaluator
 * Decision #66 Lock Supremacy
 */
export function isKickoffLocked(kickoffTime: string | number | Date, referenceTime?: number | Date): boolean {
  const target = new Date(kickoffTime).getTime();
  const current = referenceTime ? new Date(referenceTime).getTime() : Date.now();
  if (isNaN(target)) return true; // Fail closed on invalid date (Decision #55)
  return current >= target;
}
