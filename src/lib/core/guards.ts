import type { Items, MenuModel } from "./menu-model";

export interface GuardResults {
  when: Record<string, boolean>;
  checked: Record<string, boolean>;
}

export const EMPTY_GUARDS: GuardResults = { when: {}, checked: {} };

// Menu.qml's contract: one line per guard, `<id>:<w|c>:<0|1>`; ids carry dots
// so split from the right.
export function parseGuardOutput(output: string): GuardResults {
  const when: Record<string, boolean> = {};
  const checked: Record<string, boolean> = {};
  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.lastIndexOf(":");
    if (colon < 0) continue;
    const value = line.substring(colon + 1) === "1";
    const rest = line.substring(0, colon);
    const tagAt = rest.lastIndexOf(":");
    if (tagAt < 0) continue;
    const id = rest.substring(0, tagAt);
    const tag = rest.substring(tagAt + 1);
    if (tag === "w") when[id] = value;
    else if (tag === "c") checked[id] = value;
  }
  return { when, checked };
}

export type BashRunner = (script: string) => Promise<{ ok: boolean; stdout: string }>;

// Every `when:` and `checked:` in one bash process, exactly as the shell does.
// A batch that failed keeps the previous answers rather than letting a
// half-read set through.
export async function evaluateGuards(model: MenuModel, items: Items, bash: BashRunner, previous: GuardResults = EMPTY_GUARDS): Promise<GuardResults> {
  const script = model.guardScript(items);
  if (!script) return EMPTY_GUARDS;
  const result = await bash(script);
  if (!result.ok) return previous;
  return parseGuardOutput(result.stdout);
}
