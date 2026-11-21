# Article Publishing

Take an article from brief to published page: research, writing,
optimization, images, review, and publish.

## Inputs

- Content brief: topic, audience, intent, target queries.
- The publishing platform and its conventions.
- Existing related articles for internal linking.

## Steps

1. **Confirm the brief.** Check the topic, audience, intent, and target
   queries. If the brief is missing, get one from `content-strategy`
   or the user before writing.
2. **Research keywords** (`keyword-research`, `serp-analysis`). Confirm
   the target queries and what the search results for them reward.
3. **Research the topic** (`content-research`). Gather facts from the
   sources the skill describes. Verify claims; note anything that
   cannot be verified.
4. **Draft the article** (`article-writing`). Structure it with a
   direct answer first, then depth. Write for the reader, not the
   keyword count.
5. **Optimize the page** (`on-page-seo`). Titles, meta description,
   headings, and internal links to related articles.
6. **Add structured data** (`schema-jsonld`) where the article type
   calls for it (article, FAQ, how-to). Validate it.
7. **Create images** (`blog-featured-images`, `og-image-generation`)
   following `workflows/image-generation.md`. Add alt text.
8. **Set metadata** (`open-graph`, `seo-metadata`). Confirm the social
   preview renders correctly.
9. **Editorial review** (`editorial-review`, `copy-editing` upstream).
   Check accuracy, clarity, and consistency. Fix issues; do not publish
   around them.
10. **Publish and verify.** Publish the article, then check the live
    page: rendering, links, structured data, and social preview.

## Outputs

- Published article with metadata, structured data, and images.
- A note of sources used and any claims flagged for verification.

## Checks

- [ ] The article answers the brief's question directly and early.
- [ ] Factual claims are sourced or flagged.
- [ ] Structured data validates without errors.
- [ ] Links work; internal links point to live pages.
- [ ] Social preview renders correctly.
- [ ] No invented statistics, quotes, or sources.
