# Performance Audit

Measure a site's performance, find the biggest bottlenecks, fix them,
and verify the improvement with numbers.

## Inputs

- The site or pages to audit.
- Performance goals or budgets, if any.
- Access to production performance data, when available.

## Steps

1. **Define the scope.** Which pages, which devices, and which
   conditions the audit covers.
2. **Measure the baseline** (`core-web-vitals`, `lighthouse`). Capture
   numbers before changing anything, and record the method and
   conditions.
3. **Check production data** (`observability`) when available. Lab
   numbers and real-user numbers answer different questions; use both
   when possible.
4. **Find the biggest bottleneck.** Work from the measurements, not
   from hunches. Fix the biggest bottleneck first.
5. **Fix rendering and loading** (`frontend-performance`). Address
   what the measurements point at: render-blocking resources, large
   bundles, slow images, or layout instability.
6. **Fix caching** (`caching`) when the audit shows cacheable
   resources being re-fetched.
7. **Fix platform-specific issues** (`vercel-optimize` upstream for
   Vercel, `cloudflare-workers` for Cloudflare) when the bottleneck is
   in the hosting layer.
8. **Re-measure after each fix.** Record before-and-after numbers with
   the same method and conditions.
9. **Check for regressions.** Confirm behavior, tests, and
   accessibility still pass after the fixes.
10. **Write the report.** Baseline, final numbers, what changed, and
    what remains.

## Outputs

- Performance report with baseline and final measurements.
- Implemented fixes, prioritized by measured impact.
- Performance-budget recommendations when requested.

## Checks

- [ ] All numbers are measured, with method and conditions stated.
- [ ] Improvements are shown as before-and-after measurements.
- [ ] The biggest measured bottleneck was addressed first.
- [ ] No invented scores, timings, or benchmarks.
- [ ] Fixes did not break behavior, tests, or accessibility.
