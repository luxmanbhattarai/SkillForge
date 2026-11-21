// prompt.mjs — interactive conflict prompts.
//
// Prompts are used only when the process is interactive (stdin and
// stdout are TTYs) and the user has not passed --force/--backup.
// Non-interactive runs never prompt: they refuse the conflicting
// item and exit non-zero with instructions instead.
//
// One readline interface is shared by the whole run: creating a new
// interface per question would discard input the previous interface
// had already buffered (a user answering two prompts quickly would
// lose the second answer). The entry point closes the interface
// when the run finishes so the process can exit.
//
// The prompt streams are injectable (setPromptStreams) so the
// prompt paths are unit-testable without a PTY: on Windows there
// is no `script` binary for the PTY tests to use, and the repo's
// zero-dependency policy rules out node-pty (see
// ai/remediation/stage-d/windows-link-analysis.md §node-pty).
// Production code never calls setPromptStreams; the defaults are
// the process streams, and behavior is unchanged when it is not
// called.

import readline from 'node:readline';

export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

let rl = null;
let stdinEnded = false;
let pendingResolve = null;
let promptInput = process.stdin;
let promptOutput = process.stdout;

/**
 * Drive askChoice from injected streams instead of the terminal.
 * Test hook only — production code never calls this. Resets all
 * prompt state (closes any open interface, clears the ended flag)
 * so each test starts clean. Pass `{}` (or call
 * resetPromptStreams) to restore the process streams.
 */
export function setPromptStreams({ input, output } = {}) {
  closePrompt();
  stdinEnded = false;
  pendingResolve = null;
  promptInput = input || process.stdin;
  promptOutput = output || process.stdout;
}

/** Restore the default (process) prompt streams and reset state. */
export function resetPromptStreams() {
  setPromptStreams({});
}

function getInterface() {
  if (rl) return rl;
  rl = readline.createInterface({ input: promptInput, output: promptOutput });
  const iface = rl;
  rl.on('close', () => {
    // Ignore closes from a superseded interface: setPromptStreams
    // closes the old interface, and its late 'close' event must
    // not mark the NEW stream as ended.
    if (rl !== iface) return;
    stdinEnded = true;
    if (pendingResolve) {
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(null);
    }
  });
  return rl;
}

/**
 * Ask a multiple-choice question. `choices` is an array of
 * { key, label } — the user types a key (case-insensitive) or the
 * full label. Returns the chosen key, or null on EOF/empty input
 * or an unrecognized answer.
 */
export function askChoice(question, choices) {
  if (stdinEnded) return Promise.resolve(null);
  return new Promise((resolve) => {
    const iface = getInterface();
    const hint = choices.map((c) => `[${c.key}]${c.label.slice(1)}`).join(' ');
    pendingResolve = (value) => {
      pendingResolve = null;
      resolve(value);
    };
    iface.question(`${question} ${hint}: `, (answer) => {
      const a = answer.trim().toLowerCase();
      const hit = a ? choices.find((c) => c.key.toLowerCase() === a || c.label.toLowerCase() === a) : null;
      pendingResolve(hit ? hit.key : null);
    });
  });
}

/** Close the shared prompt interface (lets the process exit). */
export function closePrompt() {
  if (rl) {
    const iface = rl;
    rl = null;
    iface.close();
  }
}
