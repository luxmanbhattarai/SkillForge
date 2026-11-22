---
name: react
description: >
  Build user interfaces with React 19 using function components, hooks,
  and modern patterns including server components where applicable. Use
  when creating or editing React components, managing state with hooks,
  handling events and forms, fetching data in components, or fixing React
  rendering and effects bugs.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js 24 LTS and a React 19 project set up with a bundler or framework such as Vite or Next.js.
---

# React

## Purpose

This skill builds React interfaces the way React 19 intends them to be
built: function components, hooks for state and effects, declarative data
flow from parent to child, and the smallest amount of state that can
represent the UI. It covers component design, hooks, forms, data fetching,
and the common pitfalls that make React apps slow or buggy.

## When to Use

- Creating or editing React components, hooks, or pages.
- Managing component or shared state.
- Handling forms, events, and user interaction in React.
- Fetching data from a component or a server component.
- Debugging re-render loops, stale closures, or effects that run twice.

## When Not to Use

- Full-stack Next.js apps with routing, server components, and data
  fetching conventions: use `nextjs` (it includes React patterns).
- Static content sites where React is unnecessary weight: use `astro` or
  `hugo`.
- Plain DOM scripting without a framework: use `javascript`.
- Styling components: use `css`, `tailwind-css`, or `shadcn-ui`.

## Prerequisites

- Node.js 24 LTS or 26 LTS and a React 19 project (current major line;
  26 is the newest Node.js LTS line, 24 and 22
  remain in LTS); do not assume a minor version. React 19.2 (October
  2025) added the `<Activity>` component (hide a subtree while
  preserving its state) and the `useEffectEvent` hook (non-reactive
  logic inside effects); both require 19.2 or newer.
- A bundler or framework (Vite, Next.js, or similar) already configured.
- Familiarity with `javascript` and, for typed projects, `typescript`.
- The component's data source decided before writing it: props, local
  state, context, or a server component.

## Official Documentation

- [React documentation](https://react.dev/) — the official docs, including
  the Learn tutorial and the API reference.
- [React Learn](https://react.dev/learn) — the guided tutorial for
  components, state, and effects.
- [React reference](https://react.dev/reference/react) — hooks and APIs.

## Required Workflow

1. Identify the component's inputs (props), its state, and its outputs
   (rendered UI and callbacks). Write the props type first in typed
   projects.
2. Build the smallest component that does the job; split it only when it
   grows past one clear responsibility or when a part is reused.
3. Derive values during render instead of storing them in state: if a
   value can be computed from props or state, compute it.
4. Put state as low as possible; lift it only to the nearest common
   ancestor that needs it.
5. Use effects only for synchronization with external systems (network,
   timers, subscriptions, DOM measurements). If an effect only updates
   state from other state, derive the value instead.
6. Keep event handlers on the element they belong to; use controlled
   components for form inputs whose value the UI needs to read.
7. Verify with the React DevTools profiler when performance matters, and
   test the component in the running app, including loading and error
   states.

## Implementation Standards

- Function components only; no class components in new code.
- React 19 is the current major line. Use the hooks and
  APIs documented for React 19 on react.dev; do not rely on legacy
  patterns such as `UNSAFE_` lifecycle methods.
- Hooks rules: call hooks only at the top level of a component or custom
  hook, in the same order on every render.
- State: `useState` for local state, `useReducer` when several related
  values change together or updates depend on previous state. Keep state
  minimal and colocated.
- Effects: `useEffect` for synchronization with external systems;
  `useLayoutEffect` only when measuring layout before paint. Every effect
  returns a cleanup function when it subscribes, starts a timer, or
  fetches. On React 19.2+, `useEffectEvent` holds non-reactive logic an
  effect needs (for example reading the latest theme) without adding
  the value to the dependency array; effect events are only called from
  inside effects and never passed as props.
- Refs: `useRef` for values that persist across renders without triggering
  a re-render (DOM nodes, timers, previous values). Do not read or write
  refs during render.
- Context: use for values that many components need (theme, current user,
  locale). Do not use context for high-frequency updates; it re-renders
  every consumer.
- Keys: every element in a list needs a stable, unique `key` (an id from
  the data). Never use the array index as a key when the list can reorder,
  insert, or delete items.
- Forms: controlled inputs for values the component must read; use the
  `action` attribute or `useActionState` for form submissions where the
  framework supports it. `useActionState` (imported from `react`) is
  the React 19 name; the canary-era `useFormState` from `react-dom` is
  deprecated.
- Data fetching: fetch in server components or route loaders when the
  framework supports them; in client components, fetch in an effect or
  use a data-fetching library, and always handle loading and error states.
- Memoization: `useMemo` and `useCallback` only where profiling shows a
  real cost; premature memoization adds complexity without benefit.
- Components return JSX with semantic HTML (see `semantic-html`); a
  component is not an excuse for `div` soup.

### Accessibility

- Components expose name, role, and state: use semantic elements and
  pass `aria-*` props through — do not swallow them in wrappers.
- Manage focus with refs: dialogs trap focus and return it on close;
  route changes move focus to the new heading.
- Event handlers pair mouse and keyboard: `onClick` on a real
  `button`, `onKeyDown` for custom widget keys (arrows, Escape).
- Portals render dialogs and menus where screen readers can reach
  them, with `aria-modal` and focus trapping.
- State changes users need to know about are announced via live
  regions, not silent re-renders.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Name components for what they are (`ArticleCard`), not what they do
  (`ArticleCardContainer`).
- Keep components small and focused; a component over roughly 200 lines
  is usually doing more than one thing.
- Extract custom hooks (`useArticles`, `useDebouncedValue`) when logic is
  reused or when a component's logic obscures its rendering.
- Colocate state with the UI that uses it; global state is a last resort.
- Prefer composition (children, render props) over deep prop drilling.
- Handle the empty state, the loading state, and the error state for
  every data-driven component.
- Use `Suspense` boundaries to show loading UI while a subtree loads,
  rather than ad-hoc loading flags everywhere.
- Keep side effects out of render: no fetching, no subscriptions, no
  `localStorage` writes during render.
- Use the `key` prop to reset a component's state when its identity
  changes (for example a form keyed by the edited item's id).

## Security Considerations

- React escapes interpolated values by default, which prevents most XSS
  through JSX. Never bypass it with `dangerouslySetInnerHTML` on
  untrusted content; if HTML must be rendered, sanitize it first with a
  maintained sanitizer.
- Never put secrets, API keys, or tokens in client-component code or in
  props passed to the browser; client code is public.
- Validate data from the network at runtime before rendering it, even
  when TypeScript types describe its shape.
- Be careful with URLs from user input in `href` and `src`: reject
  `javascript:` URLs and validate schemes.
- Avoid `eval` and dynamic code execution in components.

## Performance Considerations

- Re-render cost comes from tree size and work per render: keep trees
  shallow, split large lists, and avoid creating new objects in render
  for props that children compare.
- Code-split routes and heavy components with `React.lazy` and `Suspense`
  so the initial bundle stays small.
- Virtualize long lists (hundreds of rows or more) instead of rendering
  every row.
- Avoid inline arrow functions in props only when a child is memoized
  and profiling shows re-renders; otherwise the cost is negligible.
- Images inside components still need `width`, `height`, `loading`, and
  `srcset` discipline (see `frontend-performance`).
- Server components (in frameworks that support them) move data fetching
  and rendering to the server and reduce client JavaScript; prefer them
  for content that does not need interactivity.

## Common Mistakes

- Storing derivable values in state — creates sync bugs. Derive during
  render instead.
- Effects that only update state from other state — an effect is not a
  computed value. Derive it.
- Missing effect dependencies — stale closures read old values. Include
  every value the effect uses, or restructure so the effect does not need
  it.
- Using array index as `key` — reordering or deleting items then corrupts
  component state. Use a stable id.
- Mutating state directly (`state.items.push(...)`) — React cannot detect
  the change. Create a new array or object.
- Fetching in render or in an event handler without cleanup — causes
  duplicate requests and state updates after unmount. Fetch in an
  effect with an `AbortController`, or in a server component.
- Lifting all state to the top — re-renders the whole tree on every
  keystroke. Keep state low.
- `dangerouslySetInnerHTML` with unsanitized content — an XSS hole.
  Sanitize first, or avoid it entirely.

## Examples

Component with state, derived values, and an effect with cleanup:

  [examples/state-effect.tsx](./examples/state-effect.tsx).

Controlled form input:

  [examples/controlled-form.tsx](./examples/controlled-form.tsx).

## Validation Checklist

- [ ] Hooks are called only at the top level, in the same order every
      render.
- [ ] No derived value is stored in state.
- [ ] Every effect that subscribes, fetches, or starts a timer returns a
      cleanup function.
- [ ] Every list element has a stable, unique `key`.
- [ ] Loading, empty, and error states are all rendered.
- [ ] No `dangerouslySetInnerHTML` is used on unsanitized content.
- [ ] State is not mutated directly anywhere.
- [ ] Accessibility: components expose name/role/state; focus is managed on dialogs and route changes.

## Expected Deliverables

- Function components and custom hooks following the standards above.
- Components that render loading, empty, and error states.
- A short note on where state lives and why, for any non-trivial
  component tree.

## References

- [React documentation](https://react.dev/) — official docs.
- [React Learn](https://react.dev/learn) — guided tutorial.
- [React reference](https://react.dev/reference/react) — hooks and APIs.
- Related skills in this repository: `nextjs`, `typescript`, `javascript`,
  `semantic-html`, `tailwind-css`.
