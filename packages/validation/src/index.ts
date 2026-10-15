export function requireNonEmptyString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(fieldName + " must be a non-empty string");
  }

  return value.trim();
}

export function requireFiniteNumber(
  value: unknown,
  fieldName: string,
): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(fieldName + " must be a finite number");
  }

  return parsed;
}
