// paths.mjs — small path helpers shared by the repo's check scripts.
//
// toPosixPath(): normalize a path to forward-slash separators. The
// registry, the security scanner's exception lists, the link
// checker's upstream exclusion, and the scorer's category fallback
// all compare against POSIX-style prefixes — on Windows,
// path.relative() returns backslashes, so those comparisons silently
// never match (Stage D findings W-2/W-3). Normalizing once, where
// the relative path is computed, keeps every downstream comparison
// platform-independent.
//
// The split is on BOTH separators, not path.sep: that makes the
// function correct for Windows-style input on any platform (which
// also makes it unit-testable on POSIX — see test/paths.test.mjs),
// and it is a no-op for paths that are already POSIX. Only use it
// for relative paths, registry paths, and display paths — never for
// a path that will be passed back to the filesystem on POSIX, where
// a backslash is a legal filename character.

/** Normalize `p` to forward-slash separators. */
export function toPosixPath(p) {
  return String(p).split(/[\\/]/).join('/');
}
