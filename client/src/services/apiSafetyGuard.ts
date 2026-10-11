/**
 * Authoritative API Route Safety Guard
 * Decision #54: No database write mutations or stateful side effects on GET routes
 */
export function assertGetSafety(method: string, body?: any, hasMutations?: boolean): void {
  if (method.toUpperCase() === 'GET') {
    if (hasMutations || (body && Object.keys(body).length > 0)) {
      throw new Error('Decision #54 Violation: Write mutations or request payloads are prohibited on GET routes.');
    }
  }
}
