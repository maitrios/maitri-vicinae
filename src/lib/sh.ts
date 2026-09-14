import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { MAITRI } from "./core/paths";

const execFileP = promisify(execFile);

function env() {
  // The package puts /usr/bin/maitri-* on PATH; a dev-linked checkout needs
  // its bin/ ahead of it.
  const path = MAITRI === "/usr/share/maitri" ? process.env.PATH ?? "" : `${MAITRI}/bin:${process.env.PATH ?? ""}`;
  return { ...process.env, PATH: path, MAITRI_PATH: MAITRI };
}

export async function run(argv: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const [cmd, ...rest] = argv;
  try {
    const { stdout, stderr } = await execFileP(cmd, rest, { env: env(), maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, stdout, stderr };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, stdout: err?.stdout ?? "", stderr: err?.stderr ?? String(e) };
  }
}

export async function capture(argv: string[]): Promise<string> {
  const r = await run(argv);
  return r.ok ? r.stdout.trim() : "";
}

// Login shell like the Quickshell menu uses, so the maitri env bootstrap runs.
export function runShell(script: string) {
  return run(["bash", "-lc", script]);
}

// Fire and forget: the child must outlive the extension worker that
// closeMainWindow() tears down.
export function spawnDetachedShell(script: string): void {
  const child = spawn("bash", ["-lc", script], { detached: true, stdio: "ignore", env: env() });
  child.unref();
}

export function spawnDetached(argv: string[]): void {
  const [cmd, ...rest] = argv;
  const child = spawn(cmd, rest, { detached: true, stdio: "ignore", env: env() });
  child.unref();
}
