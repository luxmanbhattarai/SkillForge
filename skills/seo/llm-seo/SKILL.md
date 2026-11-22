---
name: llm-seo
description: >
  Makes website content discoverable, readable, and citable by large
  language models and AI search tools such as ChatGPT, Perplexity, and
  Google AI Overviews. Use when optimizing pages for AI-driven search,
  generative engine optimization (GEO), LLM citation, AI chatbot answers,
  or when auditing how AI tools see and summarize a site. Trigger keywords:
  LLM SEO, GEO, generative engine optimization, AI search, AI citations,
  ChatGPT search, Perplexity, AI Overviews, LLM visibility.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# LLM SEO

## Purpose

This skill improves how large language models and AI search tools find,
read, understand, and cite a website's content. It covers crawl access
for AI bots, machine-readable page structure, factual clarity, and
measuring AI referral traffic. AI citation and AI search visibility are
not guaranteed by any technique in this skill; model behavior changes
frequently, and this skill improves the conditions for citation without
promising it.

## When to Use

- Optimizing content so AI search tools (ChatGPT search, Perplexity,
  Google AI Overviews, Copilot) can find and cite it.
- Auditing whether AI crawlers can access a site and what they see.
- Writing or restructuring pages that answer questions AI tools are
  commonly asked about a topic.
- Adding machine-readable context such as structured data, clear
  headings, and concise summaries to key pages.
- Measuring AI referral traffic and brand mentions in AI answers.

## When Not to Use

- For classic search ranking work alone — use `on-page-seo` and
  `technical-seo` instead.
- For featured snippets and direct answers in traditional search —
  use `aeo-optimization` instead.
- For the llms.txt file specifically — use `llms-txt` instead; this
  skill covers the broader LLM visibility strategy.
- For schema implementation details — use `schema-jsonld` instead.
- When the site has basic crawl or indexing problems — fix those with
  `technical-seo` and `search-console` first, since AI tools largely
  depend on the same crawlable web.

## Prerequisites

- A crawlable, indexable site; AI crawlers and AI search indexes build
  on the same public web that search engines crawl.
- Access to robots.txt, server logs or analytics, and the pages to be
  optimized.
- A list of the questions and topics the site should be cited for,
  based on real user queries, support questions, or Search Console data.
- An analytics setup that can show referral traffic by source, so AI
  referrals can be separated from other traffic.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — how Google crawls and surfaces content, including AI features.
- [Google's guide to optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) —
  Google's official guide (May 2026): foundational SEO still applies
  to AI Overviews and AI Mode, and it mythbusts common AEO/GEO claims
  — no special markup, chunking, or rewriting just for AI is needed
  for Google Search, and structured data is not required for
  generative AI search.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — the baseline for content Google systems can use.
- [Schema.org](https://schema.org/) — structured data vocabulary that helps machines interpret page content.
- [llms.txt](https://llmstxt.org/) — the emerging convention for an LLM-oriented site index file.

## Required Workflow

1. Establish the baseline. Check current AI referral traffic in
   analytics, and test how AI tools answer the site's core questions
   today, recording which sources they cite.
2. Check crawler access. Review robots.txt and any firewall or bot
   rules for blocks on AI crawlers, and decide deliberately which AI
   bots may crawl the site (see Implementation Standards).
3. Audit machine-readability. Fetch key pages as plain text or with
   JavaScript disabled and confirm the main content, headings, and
   key facts are present in the served HTML.
4. Restructure priority pages. Give each page a clear topic, a
   concise summary near the top, descriptive headings, and factual
   statements that stand alone without surrounding context.
5. Strengthen factual grounding. Add sources, dates, author and
   organization information, and structured data (Article,
   Organization, Product, FAQPage as appropriate).
6. Add an llms.txt file if it fits the site (see `llms-txt`), and
   keep the XML sitemap current so AI systems that use sitemaps can
   discover pages.
7. Publish and verify. Confirm the pages render correctly as text,
   structured data validates, and robots.txt allows the intended
   crawlers.
8. Measure monthly. Track AI referral sessions, cited queries, and
   changes in which pages AI tools reference; iterate on pages that
   are never cited.

## Implementation Standards

- Robots.txt decisions are deliberate and documented. Blocking an AI
  crawler is a business decision about training and citation, not a
  default; record which crawlers are allowed or blocked and why.
- Know what each Google control actually governs. `Google-Extended`
  is a robots.txt product token, not a crawler: it controls whether
  content Google crawls may train future Gemini models and ground
  answers in Gemini Apps and Vertex AI. It does not affect inclusion
  or ranking in Google Search, and blocking it does not remove a site
  from AI Overviews or AI Mode (those are governed by `Googlebot`
  rules and by the Search generative AI control in Search Console).
  Blocking `Google-Extended` also opts the site out of Gemini
  grounding, not just training.
- Do not block AI crawlers in robots.txt while expecting AI citation;
  a crawler that cannot fetch a page cannot cite it accurately.
- Every priority page states its main point in the first 100 words in
  plain, factual language, with the topic named explicitly.
- Facts are attributed. Statistics, dates, prices, and requirements
  name their source on the page or link to it; unattributed claims
  are rewritten or removed.
- Dates are visible and accurate: publication date and last-updated
  date on articles, so AI tools can judge freshness.
- Headings describe content, not cleverness. An AI tool skimming
  headings must be able to outline the page from them alone.
- Structured data matches visible content exactly. Never add schema
  for facts, ratings, or reviews that are not on the page.
- Never claim a page "will be cited" or "ranks in AI search" in
  reports or copy. Report observed citations and referral traffic
  only, and label any estimate as an estimate.

### Accessibility

- The structure that serves answer engines serves people too: one `h1`,
  headings in order, direct answers first.
- Every image keeps its alt text; restructured content does not drop
  text alternatives.
- Link text describes its destination; direct-answer blocks are real
  text, not images of text.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Write quotable sentences: one fact per sentence, with the subject
  and the key term included, so a quoted sentence makes sense alone.
- Publish original data, tests, or experience where possible; AI
  tools prefer citing primary sources over pages that repeat others.
  (An industry observation, not a documented rule of any AI system.)
- Keep evergreen pages current. AI tools favor recently updated
  content for time-sensitive topics, so review high-value pages on a
  schedule. (Also an industry observation; Google documents that its
  generative AI features rely on its core ranking and quality systems,
  so foundational SEO is the verified baseline.)
- Use consistent naming for the brand, products, and key concepts
  across the site so models associate them reliably.
- Earn mentions on other reputable sites; AI tools weigh independent
  corroboration, and a site cited nowhere else is cited less often.
- Separate opinion from fact clearly so models do not present an
  opinion as an established fact.

## Security Considerations

- AI crawler access is also a data-exposure decision: content open to
  AI crawlers may be summarized, quoted, or used in training data
  under each provider's policy. Do not publish sensitive, personal,
  or proprietary content on public pages and assume robots.txt will
  protect it; robots.txt is advisory, not access control.
- Never include API keys, internal URLs, customer data, or employee
  personal details in public content or structured data.
- Review user-generated content before exposing it to AI crawlers;
  spam or defamatory comments on public pages can be quoted by AI
  tools as if they were the site's own words.

## Performance Considerations

- Server-render or statically generate priority pages so crawlers get
  full content in the first response; client-side rendering that AI
  crawlers cannot execute hides content.
- Keep pages lean: AI crawlers, like search crawlers, may stop
  reading very large pages, so put key facts early.
- Rate-limiting and bot management must not accidentally block
  legitimate AI crawlers the site intends to allow; test access after
  any firewall change.
- An llms.txt file and sitemap add negligible load; generate them
  statically rather than on every request.

## Common Mistakes

- Blocking AI bots and expecting citations — a blocked crawler cannot
  read or cite the page. Align the robots.txt policy with the goal.
- Hiding content behind JavaScript — content that only appears after
  client-side rendering may be invisible to AI crawlers. Server-render
  the main content.
- Writing vague, padded content — AI tools quote specific, factual
  sentences; filler is never cited. Cut padding and state facts.
- Stuffing keywords for models — keyword repetition does not improve
  AI citation and degrades the page for readers. Write naturally.
- Treating one AI tool's answer as a ranking — AI answers vary by
  prompt, session, and model version. Test with several phrasings and
  report observations, not positions.
- Publishing unverified claims to sound authoritative — AI tools can
  repeat and amplify errors, and corrections are slow. Verify first.

## Examples

A page introduction written for both readers and AI extraction:

```md
# How to revive a neglected sourdough starter

A neglected sourdough starter can usually be revived in 3 to 5 days of
twice-daily feeding at room temperature. Discard all but a spoonful,
feed it equal weights of flour and water, and repeat every 12 hours
until it doubles reliably within 8 hours of feeding.

Last updated: 2026-11-18
```

A robots.txt excerpt that deliberately allows AI crawlers (adjust the
agent names to the crawlers the site intends to allow):

```text
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

## Validation Checklist

- [ ] Robots.txt policy for AI crawlers is deliberate, documented, and
      matches the citation goal.
- [ ] Priority pages render their main content in the served HTML with
      JavaScript disabled.
- [ ] Each priority page states its main point in the first 100 words.
- [ ] Facts on priority pages are attributed to a named or linked
      source, and dates are visible.
- [ ] Structured data validates and matches visible content.
- [ ] AI referral traffic is measurable in analytics, with a baseline
      recorded before changes.
- [ ] No report or page copy promises AI citation, AI ranking, or a
      specific AI visibility outcome.
- [ ] Accessibility: heading outline valid; alt text kept through restructuring.

## Expected Deliverables

- The robots.txt AI-crawler policy, with the decision and reason
  recorded.
- Restructured priority pages with quotable summaries, clear headings,
  attribution, and dates.
- Structured data added or corrected, with validation results noted.
- A baseline measurement note: current AI referral traffic and
  observed AI citations, plus the monthly review schedule.

## References

- [Google Search Central](https://developers.google.com/search) — crawling and AI features guidance.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — content quality baseline.
- [Schema.org](https://schema.org/) — structured data vocabulary.
- [llms.txt](https://llmstxt.org/) — the llms.txt convention.
- Related skills in this repository: `aeo-optimization`, `llms-txt`, `schema-jsonld`, `technical-seo`, `search-console`.
