import path from "path";

/** Project root (pitchrelay/) — works in Next server and Vitest */
export function projectRoot(): string {
  // When running from Next, cwd is project root; vitest too if launched from root
  const cwd = process.cwd();
  if (cwd.endsWith("pitchrelay")) return cwd;
  // Fallback: walk up looking for package.json name — keep simple
  return cwd;
}

export function dataPath(...parts: string[]) {
  return path.join(projectRoot(), "data", ...parts);
}
