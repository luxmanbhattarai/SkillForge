---
name: image-accessibility
description: >
  Make images accessible with alt text, text alternatives, and color
  and contrast choices that work for everyone. Use when a task asks for
  alt text, image accessibility, accessible images, text alternatives
  for charts or infographics, or an accessibility review of images.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Image Accessibility

## Purpose

This skill makes images usable by people who cannot see them, including
screen-reader users and people with low vision or color blindness. It
covers writing alt text, handling decorative and complex images,
providing text alternatives for charts, and choosing color and contrast
that do not rely on sight alone.

## When to Use

- A task asks for alt text for one or more images.
- Images are being added to a page, article, email, or document.
- An infographic, chart, or diagram needs a text alternative.
- An accessibility audit flags missing alt text or inaccessible images.
- A design uses color alone to convey meaning and needs a fix.
- A site needs alt-text rules defined for its content team.

## When Not to Use

- The task is a full-page accessibility audit beyond images — this
  skill covers images only; other audit areas need their own review.
- The task is choosing or creating the image — use
  `ai-image-generation` or `blog-featured-images` instead, then apply
  this skill to the result.
- The task is video accessibility (captions, audio description) —
  this skill covers still images only.
- The task is only about file size or format — use
  `image-compression` or `image-format-conversion` instead.

## Prerequisites

- The images to review, in their published context (page, article,
  or document).
- Knowledge of what each image is for: informative, decorative, a
  link, or a complex image such as a chart.
- The surrounding text, since alt text should not repeat adjacent
  content word for word.
- Access to the markup, CMS, or document where alt text is set.
- The site's or document's alt-text conventions, if any exist.

## Official Documentation

- [W3C Web Accessibility Initiative: Images](https://www.w3.org/WAI/tutorials/images/)
  — alt text decision tree and guidance for decorative, informative,
  and complex images.
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
  — the accessibility standard, including non-text content and
  contrast requirements.
- [MDN: the img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
  — the `alt` attribute and responsive images.
- Compatibility: WCAG 2.2 (W3C Recommendation, 5 October 2023; current
  edition 12 December 2024) is the current version. The contrast numbers
  that matter for images are unchanged since WCAG 2.0: Level AA requires
  4.5:1 for normal text and 3:1 for large text (1.4.3 Contrast (Minimum)),
  3:1 for the parts of graphics needed to understand them (1.4.11
  Non-text Contrast), and 1.1.1 Non-text Content is the criterion that
  requires text alternatives for images. WCAG 3.0 is still a Working
  Draft — do not cite it as a requirement.

## Required Workflow

1. For each image, decide its role: informative (conveys content),
   decorative (adds nothing the text does not already say), a link or
   button image, or a complex image (chart, diagram, infographic).
2. For an informative image, write alt text that conveys the same
   information a sighted reader gets from the image, in one or two
   sentences.
3. For a decorative image, use an empty `alt` attribute (`alt=""`) so
   screen readers skip it, and do not describe it.
4. For a link or button image, write alt text describing the link's
   destination or the button's action, not the image itself.
5. For a complex image, write short alt text naming the image, and
   provide the full information nearby as text: a data table, a
   list, or a linked long description.
6. Check that no information is conveyed by color alone: charts need
   labels or patterns as well as color, and status indicators need
   text or icons as well as color.
7. Check text inside images for contrast against its background, and
   prefer real text over text baked into an image wherever possible.
8. Set the alt text in the markup, CMS field, or document property,
   and confirm it is present in the served HTML.
9. Test with a screen reader or an accessibility checker on at least
   one representative page.
10. Record the alt-text decisions for complex images so future edits
    keep the text alternative in step with the graphic.

## Implementation Standards

- Every informative image has alt text. Every decorative image has
  an empty `alt` attribute. An image with no `alt` attribute at all
  is a defect: screen readers may announce the filename instead.
- Alt text describes the content and purpose of the image, not the
  file: "Glass jar of bubbling sourdough starter" is alt text;
  "image123.jpg" is not.
- Alt text is concise: one or two sentences, usually under 125
  characters for simple images. Long detail belongs in the nearby
  text alternative, not in the `alt` attribute.
- Do not start alt text with "image of" or "picture of"; screen
  readers already announce the element as an image.
- Do not repeat adjacent text word for word. If the caption or the
  surrounding paragraph already says it, the alt text can be shorter
  or the image may be decorative.
- Do not put keywords or search terms in alt text; it exists for
  people, not for ranking.
- Charts and infographics always have a text alternative carrying the
  same data, not just a one-line summary.
- Color is never the only way information is conveyed. Use labels,
  patterns, shapes, or text alongside color.
- Text inside images must meet WCAG 2.2 AA contrast ratios where it
  carries information: 4.5:1 for normal text, 3:1 for large text
  (1.4.3). Text that is part of a logo is exempt from 1.4.3, but
  readable contrast is still good practice.

## Best Practices

- Write alt text from the reader's point of view: what would a
  person need to know if they could not see this image?
- For a chart, the text alternative gives the key figures and the
  takeaway, not a description of the chart's appearance.
- Keep text out of images when the same words can be real page text;
  real text can be resized, translated, and read by screen readers.
- When text must appear in an image, use large type with strong
  contrast and repeat the words in the alt text or nearby copy.
- Review alt text when the image changes; a new image with old alt
  text misleads screen-reader users.
- Train content authors with a short alt-text guide and examples so
  the standard survives beyond a single audit.

## Security Considerations

- Alt text and text alternatives are public content: do not include
  private information, credentials, or internal identifiers in them.
- Do not describe sensitive content in alt text that the image
  itself does not legitimately show; if the image should not be
  public, remove the image rather than describing it.
- Accessibility overlays and third-party widgets are not a substitute
  for real alt text; do not rely on a widget to generate it.
- When alt text is generated automatically by a tool, a person must
  review it before publishing; automated descriptions are often
  wrong or incomplete.

## Performance Considerations

- Alt text costs nothing in page weight; there is no performance
  reason to skip it.
- Prefer real text over text baked into images: real text is smaller,
  searchable, and translatable.
- A data table next to a chart is lightweight and helps every reader,
  not only screen-reader users.
- Accessibility checks fit into the normal publishing checklist and
  add little time when done per image at creation.

## Common Mistakes

- Missing `alt` attributes — every image needs one, even if it is empty.
- Alt text that names the file ("IMG_2041") or says "image" — it
  conveys nothing.
- Stuffing keywords into alt text — it harms screen-reader users and
  does not help search rankings.
- Describing a chart's appearance instead of its data — the text
  alternative must carry the numbers and the takeaway.
- Using color alone to show meaning — a red-versus-green chart with
  no labels excludes color-blind readers.
- Baking essential text into an image with no alternative — the text
  is invisible to screen readers and untranslatable.
- Repeating the caption word for word in the alt text — screen
  readers hear it twice.

## Examples

Example alt text for an informative image:

```html
<img src="/images/sourdough-starter-glass-jar-hero.jpg"
     width="1200" height="675"
     alt="Glass jar of bubbling sourdough starter on a wooden counter in morning light.">
```

Example decorative image with an empty alt attribute:

```html
<img src="/images/section-divider-flour.png"
     width="1200" height="60" alt="">
```

Example linked image where the alt text names the destination:

```html
<a href="/blog/sourdough-starter-guide/">
  <img src="/images/sourdough-guide-cover.jpg"
       width="400" height="300"
       alt="Sourdough starter guide: keeping a starter alive week by week.">
</a>
```

Example short alt text plus a nearby data table for a chart:

```html
<img src="/images/starter-failures-chart.png"
     width="1200" height="700"
     alt="Bar chart of when reader sourdough starters failed. Data table follows.">
```

The data table after the image lists the same figures in text, so a
screen-reader user gets the numbers the chart shows.

## Validation Checklist

- [ ] Every image has an `alt` attribute; decorative images use `alt=""`.
- [ ] Informative alt text conveys the image's content in one or two
      sentences.
- [ ] No alt text starts with "image of" or names the filename.
- [ ] No alt text repeats adjacent text word for word.
- [ ] Complex images have a text alternative with the same data.
- [ ] No information is conveyed by color alone.
- [ ] Text inside images has strong contrast and is repeated in text.
- [ ] A screen reader or accessibility checker was run on a sample page.

## Expected Deliverables

- Alt text for every image reviewed, ready to paste into the markup
  or CMS.
- A list of decorative images marked for empty `alt` attributes.
- Text alternatives or data tables for complex images.
- A short report of color-only or contrast issues found, with fixes.
- The alt-text rules adopted, for the content team's future use.

## References

- [W3C Web Accessibility Initiative: Images](https://www.w3.org/WAI/tutorials/images/)
  — alt text guidance and the decision tree.
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
  — the accessibility standard.
- [MDN: the img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
  — the `alt` attribute.
- Related skills in this repository: `infographic-generation`,
  `blog-featured-images`, `ai-image-generation`,
  `brand-visual-consistency`.
