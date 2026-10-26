export type SystemWriteMode = "ACTIVE" | "READ_ONLY";

/**
 * The absence of the switch preserves current DEV/TEST behavior. Invalid
 * values abort startup/job execution so a typo cannot silently reopen writes.
 */
export function readSystemWriteMode(
  env: NodeJS.ProcessEnv = process.env,
): SystemWriteMode {
  const value = env.CKACE_SYSTEM_WRITE_MODE?.trim().toUpperCase();
  if (!value) return "ACTIVE";
  if (value === "ACTIVE" || value === "READ_ONLY") return value;
  throw new Error(
    "CKACE_SYSTEM_WRITE_MODE must be ACTIVE or READ_ONLY.",
  );
}

export function isSystemReadOnly(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return readSystemWriteMode(env) === "READ_ONLY";
}
