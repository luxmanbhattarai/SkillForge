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

import readline from 'node:readline';

export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

let rl = null;
let stdinEnded = false;
let pendingResolve = null;

function getInterface() {
  if (rl) return rl;
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => {
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
