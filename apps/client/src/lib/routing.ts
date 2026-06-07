export function extractIdFromPath(prefix: string): string {
  const match = window.location.pathname.match(new RegExp(`^${prefix}/([\\w-]+)$`));
  return match?.[1] ?? '';
}