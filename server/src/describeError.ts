/**
 * `fetch` reports every network failure as just "fetch failed" and hides the
 * reason (DNS, refused connection, an untrusted certificate) on `cause`, so the
 * cause chain is written out here too:
 * "fetch failed: SELF_SIGNED_CERT_IN_CHAIN (self-signed certificate in certificate chain)".
 */
export function describeError(error: unknown): string {
  const links: string[] = [];
  let current: unknown = error;
  while (current !== undefined && links.length < 5) {
    if (!(current instanceof Error)) {
      links.push(String(current));
      break;
    }
    const code = (current as NodeJS.ErrnoException).code;
    const { message } = current;
    links.push(code && message && !message.includes(code) ? `${code} (${message})` : message || code || current.name);
    current = current.cause;
  }
  return links.join(": ");
}
