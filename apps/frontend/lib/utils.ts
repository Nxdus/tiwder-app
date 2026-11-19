export { cn } from "cn";

export function formatCompactName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  const last = parts[parts.length - 1];
  const initial =
    last.match(/^[เแโใไ]?(.)/u)?.[1] ?? Array.from(last)[0] ?? "";
  return initial ? `${parts[0]} ${initial.toLocaleUpperCase()}.` : parts[0];
}
