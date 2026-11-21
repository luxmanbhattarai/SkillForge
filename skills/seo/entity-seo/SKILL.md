---
name: entity-seo
description: >
  Make the people, organizations, places, and concepts a site covers
  unambiguously identifiable to search engines: entity inventory,
  disambiguation, knowledge-graph checks, Organization and ProfilePage
  structured data, sameAs references, and internal linking that clarifies
  which entity each page is about. Use when a brand or author shares a
  name with others, when a knowledge panel shows the wrong entity, or
  when building clear entity coverage for a topic. Trigger keywords:
  entity SEO, knowledge graph, disambiguation, sameAs, knowledge panel,
  Organization schema, ProfilePage, entity relationships, E-E-A-T.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Entity SEO

## Purpose

An entity is a distinct person, organization, place, product, or
concept that a search engine can identify — as opposed to a bare
string of text. This skill makes the entities a site covers
unambiguous: one canonical page per entity, consistent facts about
it everywhere, structured data that identifies it, and links that
show how it relates to other entities. The outcome is a site whose
entities a search engine can recognize and distinguish from
same-named entities, with no promise of a knowledge panel, a
ranking, or an AI citation.

## When to Use

- A brand, author, or product shares its name with another entity
  and search results mix them up.
- A knowledge panel shows the wrong organization, logo, or facts.
- Planning structured data for an organization or author pages.
- A site covers an ambiguous term (a place name, a common word,
  a person with a common name) and needs to make its meaning clear.
- Building the entity layer underneath a topic cluster (see
  `topical-authority`).
- Checking what Google's Knowledge Graph knows about an entity
  before writing about it.

## When Not to Use

- For the mechanics of writing and validating JSON-LD in general —
  use `schema-jsonld` and `structured-data` instead.
- For E-E-A-T signals in depth (author bios, credentials, trust
  pages) — use `eeat` instead; this skill covers only the entity
  identity layer that E-E-A-T builds on.
- For local business listings and local search — use `local-seo`.
- For choosing which topics to cover — use `keyword-research` and
  `topical-authority` first.

## Prerequisites

- The list of entities the site represents or covers: the
  organization itself, its people, its products, and the key
  topics it writes about.
- The canonical facts for each entity: exact name, what it is,
  where it is based, and the authoritative profiles that identify
  it (official site, professional profiles, public records).
- Access to edit the About page, author pages, and templates that
  carry structured data.
- Access to Search Console to check rich result reports.
- Optional: a Google Cloud API key for the Knowledge Graph Search
  API, for entity lookups.
- Conceptual skill; current stable as of 2026-11-20 — applies to the
  current Google structured-data guidance; see the Organization and
  ProfilePage documentation linked in Official Documentation;
  schema.org vocabulary versions are not pinned.

## Official Documentation

- [Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) —
  Google's explanation of how structured data helps Google
  understand page content and gather information about the people,
  books, or companies in the markup.
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization) —
  Google's guidance: Organization markup helps Google understand
  an organization's details and disambiguate it from other
  organizations; some properties (such as `iso6523` and `naics`)
  are used behind the scenes for disambiguation.
- [Profile page structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page) —
  Google's guidance for pages focused on a single creator (person
  or organization), including the required `mainEntity`.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  Google's E-E-A-T guidance; E-E-A-T itself is not a specific
  ranking factor.
- [Knowledge Graph Search API](https://developers.google.com/knowledge-graph) —
  Google's API for looking up entities in the Knowledge Graph.
  Note: Google's Cloud docs point new projects to Cloud
  Enterprise Knowledge Graph; the kgsearch API remains available
  for ad-hoc lookups.
- [How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works) —
  Google's explanation of crawling, indexing, and serving.
- [Schema.org](https://schema.org/) — the vocabulary reference for
  entity types and properties.
- [Bing Webmaster Tools](https://www.bing.com/webmasters) — Bing's
  console; Bing's Webmaster Guidelines advise using clear,
  consistent entity names with no ambiguous references.

Guidance current as of 2026-11-20. Google publishes no guide called
"entity SEO" — the term is industry shorthand. This skill labels
each claim: **(Verified)** means stated in the official sources
above; **(Heuristic)** means industry interpretation or practice
with no official confirmation. Nothing here guarantees a knowledge
panel, a ranking, or a citation in an AI answer.

## Required Workflow

1. Inventory the entities. List the organization, each author or
   public-facing person, each product or brand, and the main
   concepts the site covers. Note which names are ambiguous.
2. Check what already exists. Search each entity name and check
   the Knowledge Graph Search API (see Examples) for same-named
   entities. Record what Google already associates with the name.
3. Assign one canonical page per entity: the About page for the
   organization, an author page per person, a product page per
   product. Every other mention links to that page.
4. Publish consistent facts on the canonical page: the exact same
   name, description, founding or background facts, and contact
   details everywhere the entity appears. Inconsistency is what
   creates ambiguity.
5. Disambiguate in the copy itself. Where a name is ambiguous, add
   a qualifier on first mention ("Acme Baking Co., the Portland
   bakery") and keep the full name consistent after that.
6. Add structured data on the canonical page: `Organization` (or
   its most specific subtype) on the home page or a single About
   page, and `ProfilePage` with `mainEntity` on author pages.
   Include `sameAs` links only to pages that unambiguously
   identify the same entity (official profiles, a Wikidata item
   for the entity where one exists).
7. State relationships explicitly. On the canonical page and in
   content, name the entity's relationships with links: founder,
   products, topics covered, organizations the person belongs to.
   Link entity mentions in articles to the canonical entity page
   with descriptive anchor text (see `internal-linking`).
8. Validate the markup with the Rich Results Test and the Schema
   Markup Validator, then check Search Console's rich result
   reports after deployment.
9. Check the visible result. Search the entity name and inspect
   any knowledge panel or rich result for wrong facts. If facts
   are wrong, fix the source facts on your own pages and profiles
   first; panels draw on many sources and update on Google's
   schedule, not yours.
10. Re-check after changes to the entity (rebrand, new author,
    new product) and during a periodic review: facts drift, and
    stale entity data reintroduces ambiguity.

## Implementation Standards

- **(Verified)** One canonical page per entity. Google's
  Organization guidance recommends placing organization markup on
  the home page or a single page that describes the organization,
  such as the About page; `ProfilePage` requires the page's
  primary focus to be a single person or organization affiliated
  with the site.
- **(Verified)** Use the most specific schema.org subtype that
  matches the organization (Google's Organization guidance), and
  the correct type for a profile page — `Person` or
  `Organization` — defaulting to `Person` only when the type is
  genuinely unknown.
- **(Verified)** Markup describes only content visible on the
  page. Never mark up facts, profiles, or relationships that a
  visitor cannot see on that page.
- **(Verified)** `sameAs` lists pages that identify the same
  entity. Google states it can make general use of the `sameAs`
  property; a `sameAs` link to a different entity is misinformation.
- **(Heuristic)** Keep the entity's name, spelling, and key facts
  identical across the site, social profiles, and listings. No
  search engine publishes a rule requiring this, but consistent
  identity is the mechanism by which disambiguation works in
  practice.
- **(Heuristic)** Link entity mentions to the canonical entity
  page. Internal links with descriptive anchors help readers and
  crawlers connect mentions to the entity; no search engine
  guarantees this changes how the entity is understood.
- Never invent credentials, affiliations, awards, or identifiers
  for an entity. Every fact in markup must be true and checkable.
- Never claim a knowledge panel, a ranking improvement, or an AI
  citation as the outcome of entity work. Google does not
  guarantee any of these.

### Testing Strategy

- Validate markup before publish with Google's Rich Results Test and
  the Schema Markup Validator: invalid JSON-LD or a missing required
  property must fail the pre-publish check.
- Test that markup matches the visible page: every fact in the
  structured data must appear on the page a visitor sees, and nothing
  is marked up that the page does not show.
- Test `sameAs` links by opening them: each must resolve to a page
  that identifies the same entity, not a namesake or a different
  organization.
- Re-validate after any template change, and check Search Console's
  rich-result reports after deployment for errors the validators did
  not catch.

## Best Practices

- Start with the organization and its authors: those are the
  entities the site controls, and they are the ones E-E-A-T
  assessment looks at (see `eeat`).
- Use identifiers where they exist: business registry numbers,
  `iso6523` and `naics` codes for organizations, ORCID or similar
  identifiers for researchers. Identifiers disambiguate better
  than names alone.
- If the entity has a Wikidata item, keep its facts accurate and
  link it in `sameAs`. Wikidata is community-managed and has
  notability criteria; do not create promotional items for
  entities that do not meet them, and do not edit an item to
  misrepresent facts.
- Write the entity's description once, in one place, and reuse
  the same wording (or a close paraphrase) across profiles so the
  entity is described consistently.
- For ambiguous topic terms, give the article a defining first
  paragraph that states which meaning the page covers, and link
  to the canonical page for the entity when one exists.
- Review entity pages when the facts change: a new role, a move,
  a rebrand. Stale entity data is worse than no entity data,
  because it contradicts the live facts elsewhere.

## Security Considerations

- Do not publish personal data in `Person` markup: no home
  address, personal phone number, personal email, or date of
  birth. Publish only professional, public information the person
  has agreed to share.
- Keep Knowledge Graph Search API keys server-side and restricted
  to that API in the Google Cloud console. Never embed an API key
  in client-side code or a public repository.
- Verify `sameAs` targets before publishing: a link to a lookalike
  profile (a similarly named person or a spoofed account) attaches
  the wrong identity to your entity.
- Entity pages that name real people must be accurate; a false
  affiliation or credential is a reputational and legal risk, not
  just an SEO error.

## Performance Considerations

- Structured data adds a small amount of page weight; a single
  JSON-LD block per page is negligible. Do not duplicate the full
  `Organization` block on every page — Google recommends the home
  page or a single About page.
- Cache Knowledge Graph API lookups; entity data changes slowly,
  and repeated lookups for the same name waste quota.
- Generate entity markup from the same source of truth as the
  visible content (a CMS record or data file) so the two cannot
  drift apart.

## Common Mistakes

- Adding `sameAs` links to pages that are merely related — a
  partner's site, a directory listing for a different branch —
  instead of pages that identify the same entity.
- Marking up facts that are not visible on the page, or inventing
  properties to look more complete.
- Expecting a knowledge panel as the reward for adding markup.
  Google decides what appears in panels; markup is an input, not
  a request form.
- Using `Organization` markup on every page of the site instead of
  the home page or one About page.
- Naming the entity differently in different places ("Acme",
  "Acme Baking", "Acme Baking Co.") and wondering why search
  engines treat them as different entities.
- Creating a Wikidata item or a knowledge panel submission for a
  non-notable entity and expecting it to stick; community-managed
  sources remove promotional or non-notable entries.
- Treating entity work as a one-time task: rebrands, staff
  changes, and new products all change the entity graph.

## Examples

Organization markup for a fictional bakery (visible facts only):

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://example-baking.com/#organization",
  "name": "Acme Baking Co.",
  "url": "https://example-baking.com/",
  "logo": "https://example-baking.com/logo.png",
  "description": "A Portland bakery specializing in naturally leavened bread.",
  "sameAs": [
    "https://www.wikidata.org/wiki/Q12345678",
    "https://www.linkedin.com/company/acme-baking-co"
  ]
}
```

Author page markup (`ProfilePage` with `mainEntity`):

```json
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "mainEntity": {
    "@type": "Person",
    "name": "Jane Baker",
    "jobTitle": "Head Baker",
    "description": "Jane Baker has baked professionally for 12 years and leads recipe development at Acme Baking Co.",
    "sameAs": ["https://www.linkedin.com/in/janebaker"]
  }
}
```

Knowledge Graph Search API lookup (key from the environment, never
hardcoded):

```bash
curl -s -G "https://kgsearch.googleapis.com/v1/entities:search" \
  --data-urlencode "query=Acme Baking Co." \
  --data-urlencode "limit=5" \
  --data-urlencode "key=$KG_API_KEY"
```

The response lists matching entities with `@id` (for example
`kg:/m/0dl567`), `name`, `description`, and `resultScore`. A match
with a high score and a description that fits your entity confirms
Google already knows it; no match means the entity is not in the
part of the graph the API exposes, which is a subset — not proof
the entity is unknown to Google.

## Validation Checklist

- [ ] Every entity the site represents has exactly one canonical page.
- [ ] The entity's name and key facts are identical everywhere they appear.
- [ ] `Organization` markup is on the home page or a single About page; author pages use `ProfilePage` with `mainEntity`.
- [ ] Every marked-up value matches content visible on the page.
- [ ] Every `sameAs` link identifies the same entity, verified by opening it.
- [ ] Markup passes the Rich Results Test and the Schema Markup Validator.
- [ ] No personal data appears in `Person` markup.
- [ ] No knowledge panel, ranking, or AI citation is promised as an outcome.

## Expected Deliverables

- An entity inventory: entities, canonical pages, and ambiguity notes.
- Updated canonical pages (About, author pages) with consistent facts.
- Validated `Organization` and `ProfilePage` structured data in place.
- A note of what the Knowledge Graph already associates with each
  entity name, and any wrong facts found in panels or rich results.

## References

- [Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) —
  how Google uses structured data to understand content and entities.
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization) —
  disambiguation properties and placement.
- [Profile page structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page) —
  creator pages and the required `mainEntity`.
- [Knowledge Graph Search API](https://developers.google.com/knowledge-graph) —
  looking up entities in the Knowledge Graph.
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —
  E-E-A-T guidance.
- [Wikidata](https://www.wikidata.org/) — the open knowledge base;
  a community-managed source of entity identifiers.
- Related skills in this repository: `schema-jsonld`,
  `structured-data`, `eeat`, `internal-linking`, `topical-authority`,
  `local-seo`, `search-console`.
