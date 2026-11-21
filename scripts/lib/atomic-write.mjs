#!/usr/bin/env node
// atomic-write.mjs — atomic file writes (temp file + rename) with a
// retry for the transient lock errors Windows produces.
//
// A plain writeFile leaves a partially-written file visible to any
// concurrent reader (A-37: proven 20 partial reads in 30 generator
// runs pre-fix), so registry and manifest writes go through a temp
// file in the same directory plus rename. On Windows, though, the
// rename itself can fail with EPERM/EBUSY/EACCES when another
// process — a concurrent reader, antivirus, indexer — has the target
// open (proven by the first real Windows CI run: the A-37 test's
// reader loop made the generator's rename fail with EPERM). The
// lock is transient (readers open and close in microseconds), so
// the rename retries a few times before giving up. POSIX renames
// essentially never hit this path; the retry is harmless there.

import { rename, rm, writeFile } from 'node:fs/promises';

const RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Write `content` to `file` atomically: temp file in the same
 * directory, then rename. The rename retries on transient Windows
 * lock errors (EPERM/EBUSY/EACCES). The temp file is removed on
 * failure; on success it was renamed away, so the cleanup is a
 * no-op. Throws the last rename error when retries are exhausted.
 */
export async function atomicWriteFile(file, content, { attempts = 8, delayMs = 15 } = {}) {
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await writeFile(tmp, content, 'utf8');
    for (let i = 0; i < attempts; i++) {
      try {
        await rename(tmp, file);
        return;
      } catch (err) {
        if (!RETRYABLE.has(err.code) || i === attempts - 1) throw err;
        await sleep(delayMs);
      }
    }
  } finally {
    await rm(tmp, { force: true }).catch(() => {});
  }
}
