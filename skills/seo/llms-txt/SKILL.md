---
name: llms-txt
description: >
  Creates and maintains an llms.txt file that gives large language models a
  curated, markdown index of a website's most useful pages. Use when adding
  llms.txt or llms-full.txt to a site, auditing an existing llms.txt file,
  or helping AI tools discover and understand site content. Trigger keywords:
  llms.txt, llms-full.txt, LLM index, AI crawler file, markdown index for
  LLMs, AI discoverability.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# llms.txt

## Purpose

This skill creates an `llms.txt` file: a markdown document at the root
of a website that lists its most important pages with short descriptions,
so large language models can discover and understand the site's content
efficiently. An optional `llms-full.txt` contains the full text of those
pages in one file. llms.txt is an optional, emerging convention proposed
for LLM tooling; it is NOT a Google ranking requirement, NOT a search
engine standard, and having one does not guarantee AI citation, AI
search visibility, or any ranking outcome. Google has stated explicitly
(June 2026) that llms.txt files "aren't needed for Google Search (and
won't negatively or positively impact your visibility or rankings)".

This skill follows llms.txt v2 of the proposal: the file may sit at
the site root or at any subpath (for
example `/docs/llms.txt`), covering the pages under that path, and the
proposal now also covers markdown versions of pages and link relations
for discovering them. `llms-full.txt` is a v1-era convention not in the
v2 spec; it is still used by some sites, but treat it as legacy.

## When to Use

- Adding an llms.txt file to a documentation site, blog, or content
  site that AI tools are likely to reference.
- Creating an llms-full.txt file for a documentation set that AI
  assistants should be able to read in full.
- Auditing or updating an existing llms.txt file: fixing dead links,
  removing stale pages, or reordering sections.
- Deciding which pages represent the site to AI tools, as part of a
  broader LLM visibility effort.

## When Not to Use

- As a substitute for an XML sitemap or robots.txt — those serve
  search engines, and llms.txt does not replace either; use
  `sitemap-robots` for those.
- For general LLM visibility strategy — use `llm-seo` instead; this
  skill covers only the llms.txt file itself.
- For sites with no public content worth indexing (private apps,
  login-gated products), where an llms.txt file adds nothing.
- When the goal is to block AI crawlers — that is a robots.txt
  decision, covered by `sitemap-robots` and `llm-seo`, not by
  llms.txt.

## Prerequisites

- A public website with pages worth surfacing to AI tools.
- Ability to serve a static file at the site root
  (`https://example.com/llms.txt`).
- A curated list of the site's most important pages, in priority
  order, with a one-line description of each.
- Knowledge of which pages must NOT be listed (drafts, private,
  outdated, or low-value pages).
- Version range: llms.txt v2 of the proposal.

## Official Documentation

- [llms.txt](https://llmstxt.org/) — the proposal: file format, placement, and the optional llms-full.txt variant.
- [Google Search Central](https://developers.google.com/search) — for the search-engine standards llms.txt does not replace.
- [Google's guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) —
  Google's official guidance, including its June 2026 clarification
  that llms.txt files are not needed for Google Search.

Covers llms.txt v2 of the proposal.

## Required Workflow

1. Confirm the goal. llms.txt helps AI tools that choose to read it;
   record that it is optional and that no citation or ranking outcome
   is promised.
2. Inventory candidate pages. List the site's key pages: homepage,
   core guides, documentation entry points, and high-value reference
   pages. Exclude drafts, thin pages, and anything not public.
3. Curate ruthlessly. Keep the list short enough to be useful — a
   documentation site may list dozens of pages, a small blog fewer
   than twenty. Every entry must earn its place.
4. Write the file. Follow the format in Implementation Standards:
   an H1 with the site name, a short description, then sections with
   markdown links and one-line descriptions. Use an `Optional`
   section for secondary links an agent can skip when context is short.
5. Decide on llms-full.txt. Create it only for documentation sets
   where full-text inclusion is genuinely useful; keep it generated,
   not hand-written. Note it is a v1-era convention, not part of the
   v2 spec.
6. Publish at the root or at a subpath. Serve `/llms.txt` (or
   `/docs/llms.txt` for a documentation section) as a static file
   with the correct content type, and confirm it returns HTTP 200.
   A file at a subpath covers only the pages under that path.
7. Verify every link. Check that each linked URL returns HTTP 200 and
   points at the intended page.
8. Schedule maintenance. Re-generate or review the file whenever key
   pages are added, removed, renamed, or substantially rewritten.

## Implementation Standards

- Location: the file lives at the site root, `/llms.txt`, or at any
  subpath (for example `/docs/llms.txt`) where it covers only the
  pages under that path, served over HTTPS with a `text/markdown`
  content type where the server supports it. Where more than one
  file applies, agents should use the most specific one.
- Format: standard markdown. H1 is the site or project name — the
  only required section. A blockquote briefly describes the site.
  H2 sections group links (for example "Docs", "Guides",
  "Reference"). Links use the form
  `- [Title](https://example.com/page): one-line description.`
  An `Optional` section, by convention, holds secondary links an
  agent can skip when a shorter context is needed.
- Links are absolute HTTPS URLs, and should point to LLM-friendly
  content — ideally markdown versions of the pages. Under v2 of the
  proposal, pages can offer a clean markdown version at the same URL
  with `.md` appended or the extension replaced (for example
  `page.md`), discoverable via `rel="alternate" type="text/markdown"`
  and `rel="describedby"` link relations (as HTML `<link>` elements
  or HTTP `Link:` headers). Relative links are not useful to a model
  reading the file out of context.
- Descriptions are one line, factual, and specific about what the
  linked page contains. No marketing language.
- llms-full.txt, when used, contains the full markdown content of the
  listed pages, in the same order, and is generated from the source
  pages by a build step — never maintained by hand.
- The file lists public pages only. Never link to staging, admin,
  login-gated, or private URLs.
- Do not describe llms.txt as a Google requirement, a ranking factor,
  or a guarantee of AI citation anywhere in the file, commit message,
  or report.

## Best Practices

- Order links by usefulness to a newcomer, not by site navigation
  order; the most important pages come first in each section.
- Keep descriptions stable. Rewriting them on every deploy makes the
  file harder to trust as an index.
- Generate the file from the site's content source (a build script
  reading frontmatter or a page list) so it cannot drift from the
  published pages.
- Keep llms-full.txt reasonably sized. If the full text grows very
  large, split by section or limit it to core documentation rather
  than the whole site.
- Review the file after any site restructure, migration, or URL change.

## Security Considerations

- llms.txt is a public index: anything listed in it is advertised to
  AI tools and to anyone who reads the file. List public content only.
- Never include credentials, internal hostnames, API endpoints that
  require authentication, or URLs containing tokens or session data.
- If a page is removed from the site for privacy or legal reasons,
  remove it from llms.txt and llms-full.txt in the same change.

## Performance Considerations

- Serve llms.txt as a static file; it should not hit application code
  or a database on each request.
- llms-full.txt can be large. Serve it statically with compression
  enabled, and avoid regenerating it on every request; build it at
  deploy time.
- Keep the file small enough to be useful: a multi-megabyte index
  defeats the purpose of a concise guide for models.

## Common Mistakes

- Listing every page — an llms.txt with hundreds of links is a
  sitemap, not a curated index, and models gain little from it.
  Curate to the pages that matter.
- Using relative links — a model reading the file elsewhere cannot
  resolve them. Use absolute HTTPS URLs.
- Treating llms.txt as an SEO requirement — it is an optional
  convention for LLM tooling, not a Google standard. Do not present
  it as one to stakeholders.
- Letting the file go stale — dead links and removed pages in the
  index mislead AI tools. Regenerate or review it on a schedule.
- Hand-maintaining llms-full.txt — it drifts from the source pages
  almost immediately. Generate it from the content source.
- Including private or staging URLs — the file is public. Only
  public, production URLs belong in it.

## Examples

A minimal llms.txt for a small documentation site:

```md
# Example Docs

> Example Docs explains how to use Example, a fictional open-source
> tool for managing personal notes.

## Getting Started

- [Introduction](https://example.com/docs/intro): What Example is and who it is for.
- [Installation](https://example.com/docs/install): Installing Example on macOS, Linux, and Windows.
- [First project](https://example.com/docs/first-project): Creating and organizing your first notebook.

## Guides

- [Importing notes](https://example.com/docs/import): Importing notes from plain text and markdown files.
- [Syncing](https://example.com/docs/sync): Keeping notes in sync across devices.
```

Verifying the file is served correctly:

```bash
curl -I https://example.com/llms.txt
# Expect: HTTP/2 200 and a text content type.
```

## Validation Checklist

- [ ] The file is served at the site root as `/llms.txt` (or at a
      subpath such as `/docs/llms.txt` for a section) with HTTP 200.
- [ ] Every link is an absolute HTTPS URL that returns HTTP 200.
- [ ] The file lists only public, production pages; no staging,
      admin, or private URLs.
- [ ] Each link has a one-line factual description.
- [ ] The H1 names the site and the blockquote describes it accurately.
- [ ] llms-full.txt, if present, is generated from source pages and
      matches the listed pages.
- [ ] No claim in the file, commit, or report presents llms.txt as a
      Google requirement or a guarantee of AI citation.

## Expected Deliverables

- `llms.txt` published at the site root (and `llms-full.txt` if
  agreed), with the generation method documented where applicable.
- A verification note: HTTP status of the file and of every linked
  URL.
- A maintenance note: when the file is regenerated or reviewed, and
  who owns it.

## References

- [llms.txt](https://llmstxt.org/) — the file format proposal and examples.
- [Google's guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) —
  Google's clarification that llms.txt is not needed for Google Search.
- [Google Search Central](https://developers.google.com/search) — search-engine standards that llms.txt does not replace.
- Related skills in this repository: `llm-seo`, `sitemap-robots`, `technical-seo`.
