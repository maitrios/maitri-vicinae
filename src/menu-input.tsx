import { Action, ActionPanel, Form, type LaunchProps, closeMainWindow } from "@vicinae/api";
import { closeSync, openSync, writeFileSync } from "node:fs";
import { useEffect, useRef, useState } from "react";

interface Handshake {
  prompt: string;
  selectionFile: string;
  doneFile: string;
}

function parseHandshake(text: string | undefined): Handshake | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.selectionFile === "string" && typeof parsed.doneFile === "string") {
      return { prompt: String(parsed.prompt || "Input"), selectionFile: parsed.selectionFile, doneFile: parsed.doneFile };
    }
  } catch {
    // not ours
  }
  return null;
}

function touch(path: string) {
  try {
    closeSync(openSync(path, "a"));
  } catch {
    // the caller times out on its own
  }
}

// The text-input half of maitri's dmenu. `maitri-menu-input` launches this
// with a prompt and two tempfiles in fallbackText: the answer goes to
// selectionFile and doneFile is touched; cancelling touches doneFile only, so
// the caller reads an empty selection and exits 1, as with the shell menu.
export default function MenuInput(props: LaunchProps) {
  const handshake = parseHandshake(props.fallbackText);
  const [value, setValue] = useState("");
  const answered = useRef(false);

  useEffect(() => {
    return () => {
      if (handshake && !answered.current) touch(handshake.doneFile);
    };
  }, []);

  if (!handshake) {
    return (
      <Form>
        <Form.Description title="maitri input" text="This command is launched by maitri-menu-input; run it from a maitri script rather than directly." />
      </Form>
    );
  }

  const submit = async () => {
    answered.current = true;
    try {
      writeFileSync(handshake.selectionFile, `${value}\n`);
    } catch {
      // fall through to done so the caller does not hang
    }
    touch(handshake.doneFile);
    await closeMainWindow();
  };

  return (
    <Form
      navigationTitle={handshake.prompt}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="value" title={handshake.prompt} value={value} onChange={setValue} autoFocus />
    </Form>
  );
}
