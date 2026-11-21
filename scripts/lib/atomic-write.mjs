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
 * lock errors (EPERM/EBUSY/EACCES) with exponential backoff: the
 * lock holder is usually antivirus or an indexer holding the just
 * written temp file, and the first budget (8 x 15 ms) proved too
 * short on real Windows CI — all 8 attempts failed. The backoff
 * starts at 25 ms, doubles to a 400 ms cap, 10 attempts (~2.8 s
 * worst case, paid only when a lock actually occurs; the happy
 * path is a single attempt with no delay). The temp file is
 * removed on failure; on success it was renamed away, so the
 * cleanup is a no-op. Throws the last rename error when retries
 * are exhausted.
 *
 * The temp file is created with flag 'wx' (A5-10): a plain
 * writeFile would follow a pre-planted symlink at the temp path.
 * Guessing the random temp name is practically infeasible, but
 * 'wx' closes the hole entirely at zero cost — a planted
 * symlink (or any pre-existing file) makes the write fail with
 * EEXIST instead of following it.
 *
 * `renameFn` (default: fs rename) is injectable so the retry
 * behavior is directly unit-testable with a fault-injected
 * rename (A2-22); production callers never pass it.
 */
export async function atomicWriteFile(file, content, { attempts = 10, delayMs = 25, maxDelayMs = 400, renameFn = rename } = {}) {
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await writeFile(tmp, content, { encoding: 'utf8', flag: 'wx' });
    let delay = delayMs;
    for (let i = 0; i < attempts; i++) {
      try {
        await renameFn(tmp, file);
        return;
      } catch (err) {
        if (!RETRYABLE.has(err.code) || i === attempts - 1) throw err;
        await sleep(delay);
        delay = Math.min(delay * 2, maxDelayMs);
      }
    }
  } finally {
    await rm(tmp, { force: true }).catch(() => {});
  }
}
