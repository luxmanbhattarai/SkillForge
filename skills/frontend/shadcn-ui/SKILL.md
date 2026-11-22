---
name: shadcn-ui
description: >
  Build accessible React interfaces with shadcn/ui components built on
  Radix primitives and Tailwind CSS. Use when adding shadcn/ui to a
  project, installing components with the CLI, customizing component
  variants and themes, composing dialogs, forms, tables, or menus, or
  fixing shadcn/ui styling or behavior issues.
license: MIT
metadata:
  version: "1.0.0"
  category: frontend
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
compatibility: Requires Node.js 24 LTS, a React project with Tailwind CSS v4, and the shadcn/ui CLI (npx shadcn@latest).
---

# shadcn/ui

## Purpose

This skill builds interfaces with shadcn/ui: a collection of reusable
components built on Radix UI primitives and styled with Tailwind CSS,
where the component source code is copied into the project and owned by
the project. The result is an accessible, themeable component library
that the team can modify freely instead of a black-box dependency.

## When to Use

- Adding shadcn/ui to a React project (Next.js, Vite, or similar).
- Installing components (button, dialog, form, table, select) with the
  CLI.
- Customizing component variants, themes, or styling.
- Composing accessible dialogs, menus, forms, and data tables.
- Fixing shadcn/ui installation, theming, or component behavior issues.

## When Not to Use

- A project without React or Tailwind: shadcn/ui requires both. Use
  `react` and `tailwind-css` to set up the foundation first.
- Hand-written CSS components: use `css` or `modern-css`.
- A design system built from scratch with no Radix dependency: build
  custom components with `react` and `accessibility` guidance.
- Non-React frameworks (Astro islands with Vue or Svelte): shadcn/ui is
  React-only.

## Prerequisites

- Node.js 24 LTS or 26 LTS installed (26 is the newest LTS line;
  24 and 22 remain in LTS).
- A React project with Tailwind CSS v4 configured (see `tailwind-css`).
- The `cn` utility (a `clsx` + `tailwind-merge` helper) in the project,
  normally created by the CLI during setup.
- A CSS variables-based theme: shadcn/ui components style themselves from
  CSS variables defined in the project's stylesheet.
- Version range: Tailwind CSS v4; Node.js 24 LTS or 26 LTS.

## Official Documentation

- [shadcn/ui documentation](https://ui.shadcn.com/docs) — installation,
  theming, and CLI reference.
- [shadcn/ui components](https://ui.shadcn.com/docs/components) — the
  component catalog with usage examples.
- [shadcn/ui CLI reference](https://ui.shadcn.com/docs/cli) — `init`,
  `add`, `docs`, and other CLI commands.
- [Radix UI documentation](https://www.radix-ui.com/primitives/docs/overview/introduction) —
  the primitives shadcn/ui builds on.

## Required Workflow

1. Confirm the project has React and Tailwind CSS v4 set up; if not, set
   those up first.
2. Initialize shadcn/ui with the CLI (`npx shadcn@latest init`) and
   answer the prompts (component library base, style, base color, and
   CSS variables — the exact prompts vary by CLI version; check
   `npx shadcn@latest init --help`). The CLI creates the
   `components.json` config, the `cn` utility, and the theme
   variables.
3. Add components with the CLI (`npx shadcn@latest add button dialog`),
   which copies the component source into `components/ui/` and installs
   the required Radix dependencies.
4. Import components from the project's own `components/ui/` directory,
   never from a package — the code is now part of the project.
5. Customize by editing the component source or by passing variant props
   (`variant`, `size`); do not fork the component into a second copy.
6. Compose components with the documented patterns: `Dialog` with
   `DialogTrigger` and `DialogContent`, `Form` with `react-hook-form`
   and a schema, `Select` with `SelectTrigger` and `SelectContent`.
7. Verify keyboard behavior (Tab, Enter, Escape, arrow keys) and focus
   management for every interactive component added.

## Implementation Standards

- Components live in the project's source tree (conventionally
  `components/ui/`) and are owned by the project; editing them is
  expected, not a hack.
- Theme tokens are CSS variables (`--background`, `--foreground`,
  `--primary`, `--radius`) defined in the global stylesheet; in
  Tailwind v4 they must be mapped to Tailwind with an `@theme inline`
  block (`--color-background: var(--background);` and so on) — without
  that mapping, utilities such as `bg-background` and
  `text-foreground` are never generated. Current shadcn/ui themes use
  OKLCH color values. A class-based dark-mode toggle also needs
  `@custom-variant dark (&:where(.dark, .dark *));` (see
  `tailwind-css`), since v4's `dark:` variant follows
  `prefers-color-scheme` by default.
- Variants use `class-variance-authority` (cva): define variants in the
  component file and select them with props (`variant="outline"`,
  `size="sm"`).
- Use the `cn` utility to merge classes so consumer-provided `className`
  values override component defaults correctly.
- Forms use `react-hook-form` with a schema validator (such as Zod) and
  the `Form` components (`FormField`, `FormItem`, `FormLabel`,
  `FormControl`, `FormMessage`) for accessible labels and error messages.
- Data tables use the `Table` components for simple tables and the
  TanStack Table integration for sorting, filtering, and pagination.
- Dialogs, dropdowns, and popovers rely on Radix focus management: do not
  break it by rendering their content outside the portal or by
  suppressing focus trapping.
- Keep `components.json` in the repository; it records the aliases and
  style choices the CLI needs for future `add` commands.
- When a component's Radix dependency updates, check the shadcn/ui docs
  for changes to the component source before upgrading.

### Accessibility

- Radix primitives ship accessible behavior (focus traps, keyboard
  interaction, ARIA); do not strip it by overriding roles or removing
  event handlers.
- Every component keeps an accessible name: visible label text where
  possible, `aria-label` only for icon-only controls.
- Composition must not break semantics: a `Dialog` trigger stays a
  `button`; do not wrap interactive components in another interactive
  element.
- Theming keeps contrast: custom colors still meet 4.5:1 for text and
  3:1 for UI components.
- Verify the composed result with keyboard only and a screen reader;
  primitives do not guarantee the composition is accessible.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Add only the components the project uses; each one is source code to
  maintain.
- Customize the theme in CSS variables, not by editing every component's
  classes.
- Wrap shadcn/ui components in project-level components when the project
  needs a consistent API (for example a `SubmitButton` that always shows
  a loading state).
- Use the `asChild` prop (Radix Slot) to render a component as a
  different element (for example a `Button` rendered as a link) without
  losing its behavior.
- Keep the CLI-generated code close to upstream so future updates are
  easy to apply; put project-specific behavior in wrappers, not in edits
  to the generated files, where possible.
- Test components with keyboard only: Radix handles most of it, but
  custom composition can break focus order.
- Use the `sonner` toast integration for notifications instead of
  building a custom toast system.

## Security Considerations

- shadcn/ui components render user content like any React component:
  React escapes interpolated values, so do not bypass that escaping with
  `dangerouslySetInnerHTML` on untrusted content.
- Form components do not validate input by themselves; always validate
  on the server as well as in the client schema.
- Do not render user-supplied URLs in `href` or `src` without validating
  the scheme.
- Keep Radix dependencies updated; they are the behavior layer and
  receive security and accessibility fixes.

## Performance Considerations

- Each added component brings its Radix primitive as a dependency; only
  add components the project uses, so the bundle stays lean.
- Components are tree-shakeable: importing from `components/ui/button`
  pulls in only that component and its dependencies.
- Dialogs, dropdowns, and popovers render in portals and are mounted
  only when open, so they cost nothing while closed.
- Avoid importing the whole `components/ui` directory through a barrel
  file that defeats tree-shaking; import each component directly.

## Common Mistakes

- Installing shadcn/ui as an npm package — it is not a package. The CLI
  copies source code into the project.
- Editing the generated component and then re-running `add` — the CLI
  overwrites the file. Put customizations in wrappers or re-apply them.
- Skipping the CSS variables — components styled with `bg-background`
  and `text-foreground` look broken without the theme variables defined.
- Defining theme variables without the `@theme inline` mapping — in
  Tailwind v4 the variables alone generate no utilities; the mapping
  is what creates `bg-background`, `text-foreground`, and the rest.
- Forgetting the `cn` utility — class overrides then conflict instead of
  merging.
- Rendering dialog content outside the portal — breaks focus trapping
  and Escape-to-close behavior.
- Using a `Button` with an `onClick` that navigates — use `asChild` with
  a link, or a link styled as a button, so navigation works without
  JavaScript and is announced correctly.
- Not testing keyboard interaction — Radix provides it, but custom
  composition can break it.
- Adding every component up front — creates maintenance burden for code
  the project never uses.

## Examples

Adding components with the CLI:

  [scripts/add-components.sh](./scripts/add-components.sh).

Composing a dialog:

  [examples/composing-dialog.tsx](./examples/composing-dialog.tsx).

Theme variables in the global stylesheet (Tailwind v4). The `@theme
inline` block is required: it is what turns the CSS variables into
Tailwind utilities such as `bg-background`. Without it the variables
exist but no component utility is generated:

  [examples/theme-variables.css](./examples/theme-variables.css).

## Validation Checklist

- [ ] The CLI setup completed and `components.json` is committed.
- [ ] Theme CSS variables are defined for light and dark modes.
- [ ] Every added component renders and behaves correctly with keyboard
      only (Tab, Enter, Escape, arrow keys).
- [ ] Forms show accessible labels and error messages.
- [ ] No `dangerouslySetInnerHTML` is used on untrusted content.
- [ ] Only components the project uses are present in `components/ui/`.
- [ ] Accessibility: primitives keyboard/ARIA behavior intact; contrast meets thresholds.

## Expected Deliverables

- A shadcn/ui setup (CLI init, theme variables, `cn` utility) or added
  components in `components/ui/`.
- Composed UI (dialogs, forms, tables) using the installed components.
- A short note on theme customization and any wrappers added.

## References

- [shadcn/ui documentation](https://ui.shadcn.com/docs) — installation
  and CLI reference.
- [shadcn/ui components](https://ui.shadcn.com/docs/components) —
  component catalog.
- [Radix UI documentation](https://www.radix-ui.com/primitives/docs/overview/introduction) —
  underlying primitives.
- Related skills in this repository: `react`, `tailwind-css`,
  `accessibility`, `nextjs`.
