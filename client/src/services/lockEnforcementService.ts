/**
 * Authoritative Kickoff Lock Evaluator
 * Decision #66 Lock Supremacy
 */
export function isKickoffLocked(kickoffTime: string | number | Date, referenceTime?: number | Date): boolean {
  let target: number;
  if (typeof kickoffTime === 'string') {
    const trimmed = kickoffTime.trim();
    const hasTz = trimmed.endsWith('Z') || /[+-]\d{2}(?::?\d{2})?$/.test(trimmed);
    target = new Date(hasTz ? trimmed : `${trimmed}Z`).getTime();
  } else {
    target = new Date(kickoffTime).getTime();
  }
  const current = referenceTime ? new Date(referenceTime).getTime() : Date.now();
  if (isNaN(target)) return true; // Fail closed on invalid date (Decision #55)
  return current >= target;
}
