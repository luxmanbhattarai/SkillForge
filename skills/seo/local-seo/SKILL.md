---
name: local-seo
description: >
  Optimizes a business for local search results, Google Maps, and
  "near me" queries through its Google Business Profile, local landing
  pages, reviews, citations, and local structured data. Use when setting
  up or improving local visibility for a business with a physical
  location or service area, fixing NAP inconsistencies, or managing local
  reviews. Trigger keywords: local SEO, Google Business Profile, GBP,
  Google Maps, near me, NAP, local citations, local pack, reviews,
  service area business.
license: MIT
metadata:
  version: "1.0.0"
  category: seo
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Local SEO

## Purpose

This skill makes a local business findable when nearby customers search
for what it offers: in the local pack, on Google Maps, and in local
organic results. It covers the Google Business Profile, consistent
business information across the web, local landing pages, reviews, and
LocalBusiness structured data. It never fabricates business details,
ratings, or reviews; every fact published must be true of the real
business, verified with the owner.

## When to Use

- Setting up or optimizing a Google Business Profile for a business
  with a physical location or a defined service area.
- Creating or improving local landing pages for a city, neighborhood,
  or service area.
- Fixing inconsistent business name, address, or phone number (NAP)
  information across directories and the website.
- Building a review strategy: asking customers for reviews and
  responding to them.
- Auditing why a business does not appear in local results for its
  area.

## When Not to Use

- For a business with no local presence or service area — use
  `on-page-seo` and `technical-seo` instead.
- For national or international ranking — use `international-seo`
  for multi-market work.
- For creating location pages at scale from a dataset — use
  `programmatic-seo` instead; this skill covers hand-built local
  pages.
- For paid local ads — that is advertising, not organic local SEO.

## Prerequisites

- The business's real, verified details: legal and public name,
  street address (or service area), phone number, website, hours,
  and service or product categories.
- Access to the Google Business Profile, or the owner's cooperation
  to verify and manage it.
- Access to edit the website's local pages and structured data.
- A list of the areas the business genuinely serves; do not claim
  areas it does not serve.

## Official Documentation

- [Google Search Central](https://developers.google.com/search) — Google's guidance on local search and business information.
- [Google Business Profile Help](https://support.google.com/business/) — how to manage a business profile, verification, and posts.
- [Schema.org](https://schema.org/) — the LocalBusiness structured data vocabulary.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — baseline quality requirements for local pages.

## Required Workflow

1. Verify the facts. Confirm the business name, address, phone,
   hours, categories, and service area with the owner. Record them
   in one canonical document.
2. Claim and verify the Google Business Profile. Complete every
   field with the verified facts: categories (primary first),
   description, hours including holiday hours, services, and photos
   of the real business.
3. Make the website agree. Put the same name, address, and phone
   number on the website's contact and location pages, exactly as
   they appear in the profile.
4. Add LocalBusiness structured data to the location page, using the
   verified facts only (see Implementation Standards).
5. Build local pages for real service areas. One page per area the
   business serves, with genuinely local content: area-specific
   services, landmarks, directions, and local context.
6. Audit citations. Check major directories and data aggregators for
   the business listing and correct inconsistent name, address, or
   phone details.
7. Set up a review process. Ask real customers for reviews after
   service, respond to every review, and never pay for, fake, or
   selectively suppress reviews.
8. Monitor. Track profile views, calls, direction requests, and
   local rankings monthly, and keep hours and services current.

## Implementation Standards

- NAP consistency: the business name, address, and phone number are
  identical everywhere they appear — website, profile, directories,
  and structured data. Pick one canonical form and use it.
- The Google Business Profile uses the business's real public name,
  not a keyword-stuffed name. Adding keywords or location terms to
  the business name violates Google's guidelines.
- Choose the most specific primary category available, then add
  relevant secondary categories. Do not add categories for services
  the business does not offer.
- Service-area businesses (no public storefront) hide their street
  address in the profile and define the service area instead; they
  must not use a fake address or a PO box.
- LocalBusiness structured data uses only verified facts. Never add
  ratings, review counts, prices, or hours that are not true, and
  never copy another business's details.
- Local landing pages contain genuinely local content. A page that
  differs from its siblings only by the city name is thin content;
  see `programmatic-seo` for the quality bar.
- Hours in the profile, on the website, and in structured data must
  match, including special hours for holidays.
- Reviews are never fabricated, purchased, or incentivized in ways
  that violate platform policy. Respond to negative reviews
  professionally and publicly where the platform allows.

## Best Practices

- Keep the profile active: add real photos, post genuine updates
  (new services, events, seasonal hours), and answer questions.
- Ask for reviews at the moment of satisfaction — right after a
  completed job or a positive interaction — and make the request
  simple and honest.
- Respond to every review within a few business days, thanking
  positive reviewers and addressing concerns in negative ones.
- Earn local links: local news, community organizations, suppliers,
  and event sponsorships are stronger signals than generic
  directories.
- Track calls and direction requests, not just rankings; local SEO
  succeeds when customers contact the business.
- Keep one owner for the profile and the canonical business facts so
  changes propagate everywhere at once.

## Security Considerations

- Google Business Profile access is sensitive: only trusted people
  should hold owner or manager roles, and access must be revoked
  when someone leaves.
- Never publish a home address for a home-based business that does
  not receive customers there; use a service-area setup instead.
- Do not include personal phone numbers or personal emails in
  public listings; use business contact details.
- Beware of fake review and listing scams: verify any message
  claiming the profile is suspended through the official profile
  dashboard, not through links in the message.

## Performance Considerations

- Local pages should load fast on mobile, since most local searches
  happen on phones; keep images optimized and the page lean.
- Click-to-call links and maps embeds help users act; keep embeds
  lightweight and load maps only when needed.
- Keep the number of local pages proportional to genuinely served
  areas; hundreds of thin location pages waste crawl budget.

## Common Mistakes

- Keyword-stuffing the business name — "Bakery Austin Best
  Sourdough" is not the business name and risks suspension. Use the
  real name.
- Inconsistent NAP — different phone numbers or address formats
  across the web confuse search engines and customers. One canonical
  form everywhere.
- Fake or bought reviews — they violate platform policy, can be
  removed, and can lead to penalties. Earn real reviews.
- Thin location pages — pages that differ only by city name are
  low-quality content. Add genuinely local detail or do not publish.
- Ignoring the profile after setup — stale hours, unanswered
  reviews, and old photos cost customers. Maintain it monthly.
- Claiming areas the business does not serve — it misleads customers
  and creates pages that cannot convert.

## Examples

LocalBusiness JSON-LD with clearly generic example values (replace
with the real business's verified facts before use):

```json
{
  "@context": "https://schema.org",
  "@type": "Bakery",
  "name": "Example Bakery",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Example Street",
    "addressLocality": "Example City",
    "addressRegion": "EX",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "telephone": "+1-555-010-0000",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "07:00",
      "closes": "18:00"
    }
  ]
}
```

A local page outline with genuinely local content:

```md
# Sourdough bakery in Example City

## Visit us
Address, hours, parking, and public transport directions.

## What we bake for Example City
Seasonal loaves, market days, and local suppliers.

## Neighborhoods we deliver to
The areas we genuinely serve, with delivery details.
```

## Validation Checklist

- [ ] The Google Business Profile is verified, complete, and uses the
      real business name and verified facts.
- [ ] Name, address, and phone number match exactly across the
      website, profile, directories, and structured data.
- [ ] LocalBusiness structured data uses only verified facts, with no
      fabricated ratings, reviews, or details.
- [ ] Each local page has genuinely local content, not a city name
      swapped into a template.
- [ ] Hours match everywhere, including holiday hours.
- [ ] A review process exists: asking real customers and responding to
      reviews.
- [ ] Profile access is limited to trusted people, and no personal
      contact details are published.

## Expected Deliverables

- The verified Google Business Profile, complete with categories,
  hours, services, and photos.
- The canonical business facts document (name, address, phone,
  hours, service area).
- Local landing pages with LocalBusiness structured data.
- A citation audit note: directories checked and inconsistencies
  fixed.
- A review and maintenance plan: who responds to reviews and how
  often the profile is reviewed.

## References

- [Google Business Profile Help](https://support.google.com/business/) — profile management and verification.
- [Google Search Central](https://developers.google.com/search) — local search guidance.
- [Schema.org](https://schema.org/) — LocalBusiness vocabulary.
- [Google Search Essentials](https://developers.google.com/search/docs/essentials) — quality baseline for local pages.
- Related skills in this repository: `schema-jsonld`, `on-page-seo`, `programmatic-seo`, `search-console`, `eeat`.
