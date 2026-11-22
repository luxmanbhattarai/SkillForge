---
name: brand-visual-consistency
description: >
  Keep every visual on brand with a shared palette, typography,
  imagery style, and layout system. Use when a task asks for brand
  visual consistency, a visual style guide, consistent imagery, brand
  colors or fonts for images, or an audit of off-brand visuals.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Brand Visual Consistency

## Purpose

This skill keeps a brand recognizable across every image it publishes:
blog heroes, social previews, thumbnails, infographics, and marketing
graphics. It covers defining the visual system, applying it to new
work, and auditing existing visuals for drift.

## When to Use

- A brand needs a visual system for its images: palette, typography,
  imagery style, and layout rules.
- New images must match the existing brand look.
- A site, channel, or campaign shows visual drift: mixed palettes,
  mixed fonts, or mixed photo styles.
- A rebrand changes the palette or fonts and images need updating.
- A team needs templates so anyone can produce on-brand graphics.

## When Not to Use

- The task is a single image with no brand context — use the skill
  for that image type (`blog-featured-images`, `og-image-generation`,
  or `youtube-thumbnails`) instead.
- The task is the brand strategy, naming, or voice — this skill
  covers visual consistency only.
- The task is logo design from scratch — this skill applies an
  existing brand system; it does not create a logo.
- The task is only about image file size or format — use
  `image-compression` or `image-format-conversion` instead.

## Prerequisites

- The brand assets: logo files, palette, fonts, and any existing
  style guide.
- Examples of on-brand and off-brand visuals, if any exist.
- The list of image types the brand produces (heroes, previews,
  thumbnails, infographics).
- Knowledge of where images are produced: who designs them and with
  which tools.
- The places images appear: site, social platforms, video, email.

## Official Documentation

- [W3C Web Accessibility Initiative: Images](https://www.w3.org/WAI/tutorials/images/)
  — accessible treatment of images, including text in images.
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
  — contrast requirements that brand palettes must satisfy. WCAG 2.2
  (W3C Recommendation, October 2023) is the current version; Level AA
  requires at least 4.5:1 contrast for normal text and 3:1 for large text
  (1.4.3), and 3:1 for meaningful non-text graphics (1.4.11). WCAG 3.0 is
  still a Working Draft and must not be cited as a requirement.
- [Open Graph protocol](https://ogp.me/) — how preview images carry
  the brand into shared links.

## Required Workflow

1. Collect the current brand assets and record the palette (with hex
   values), the fonts, the logo variants, and the imagery style in
   one reference document.
2. Define the rules per image type: which palette colors are used,
   where the logo goes, which font and sizes are used for on-image
   text, and what the imagery style is.
3. Build or update one template per recurring image type (hero,
   OG image, X card, thumbnail, infographic) so the rules are baked
   into the starting point rather than remembered each time.
4. Apply the system to new images: pick the template, follow the
   palette and type rules, and check the result against the reference.
5. For AI-generated images, freeze the style, lighting, and palette
   phrases into a shared prompt block (see
   `image-prompt-engineering`) so generated images match the brand.
6. Audit existing visuals against the reference: list each image
   type, sample its images, and note every off-brand element.
7. Fix drift in priority order: the most visible placements first
   (home page, top articles, channel thumbnails), then the rest.
8. Check contrast: brand text colors on brand backgrounds must stay
   readable; adjust the palette pairing rather than shrinking text.
9. Store templates and brand assets in one shared location the whole
   team can reach, and record the current version of the system.
10. Re-audit on a regular schedule and after any rebrand, and update
    the templates when the rules change.

## Implementation Standards

- One palette, recorded with hex values: primary, secondary, accent,
  background, and text colors. No image introduces a new color
  outside the palette without a recorded decision.
- One or two typefaces for on-image text, with defined sizes per
  image type. Mixing fonts across images is the fastest form of
  visual drift.
- One logo treatment per image type: same position, same size range,
  same clear space around the logo.
- One imagery style: the same kind of photography or illustration
  across images (for example, warm editorial photography with soft
  natural light), described in words the team can follow.
- Templates exist for every recurring image type; a new image starts
  from a template, not from a blank canvas.
- On-image text follows the contrast rules: large type with strong
  contrast against its background, readable at the image's real
  display size. As a floor, text on images should meet WCAG 2.2 AA
  ratios: 4.5:1 for normal text, 3:1 for large text (at least 18pt,
  about 24px, or 14pt bold, about 18.66px bold).
- Changes to the system are recorded with a date and a reason, and
  templates are updated at the same time as the rules.

### Accessibility

- The brand palette meets contrast: text colors pair with backgrounds
  at 4.5:1, UI colors at 3:1 — check every pairing the system allows.
- Typography stays legible: minimum sizes, sufficient line height, and
  no all-caps blocks of body text.
- The brand system provides an accessible alternative for every
  color-coded meaning (icons, labels, patterns).
- Document the accessible pairings in the brand guide so teams do not
  invent low-contrast combinations.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Write the visual rules down in one short document; a system that
  lives only in one person's head drifts as soon as they are away.
- Show, do not just tell: include one approved example per image
  type in the reference document.
- Keep the palette small. Three to five colors are easier to apply
  consistently than ten.
- Review new images side by side with existing ones; drift is
  easiest to spot in a grid.
- Make the right choice the easy choice: templates, saved color
  swatches, and shared prompt blocks beat written rules alone.
- Revisit the system when the brand grows into a new placement; a
  system built for a blog may need new rules for video or email.

## Security Considerations

- Store brand assets in access-controlled storage; logo files and
  brand fonts are intellectual property and may be licensed.
- Do not share editable brand templates publicly; a public template
  lets anyone produce convincing imitations of the brand.
- Check font licenses before distributing brand fonts to the team
  or embedding them in images; some licenses restrict redistribution.
- Do not let AI image tools reproduce the logo from memory; always
  place the real logo file onto the finished image with an editor.
- Review AI-generated images for accidental lookalike logos or
  trademarks before publishing.

## Performance Considerations

- Templates reduce production time per image; the up-front cost of
  building them pays back across every future image.
- A shared prompt block for generated images reduces failed
  generations and rework.
- Standard sizes per image type mean fewer one-off exports and a
  simpler image pipeline.
- Audits are cheaper in small, regular batches than as one large
  cleanup after long drift.

## Common Mistakes

- Rules that exist only as a conversation — write them down with
  examples, or they will drift.
- A palette that grows with every image — new colors need a recorded
  decision, not a quiet addition.
- Five fonts across five image types — one or two typefaces, used
  consistently, is the standard.
- Letting an image model draw the logo — models garble logos; place
  the real logo file with an editor.
- Auditing once and never again — drift returns; schedule regular
  re-audits.
- A system so strict nobody follows it — rules must be simple
  enough to apply in the time available, with templates doing the
  heavy lifting.

## Examples

Example brand visual reference, kept in one document:

```text
Palette:
  Primary: deep green #1F4D3A
  Secondary: warm cream #F5EFE3
  Accent: terracotta #C96F4A
  Text on light: near-black #1A1A1A
  Text on dark: warm white #FAF6EF

Type:
  Headlines on images: a bold sans-serif, large, high contrast
  Sub-lines: the same family, regular weight, smaller

Logo:
  Bottom-left on heroes and previews, with clear space equal to
  the height of the logo mark on all sides.

Imagery:
  Warm editorial photography, soft natural light, uncluttered
  backgrounds, one focal subject per image.
```

Example shared prompt block for generated brand images:

```text
Warm editorial photograph, soft natural light, warm cream and
deep green palette, uncluttered background, one focal subject.
No text, no logos, no people unless the brief asks for them.
```

Example audit note:

```text
Sampled 12 recent blog heroes: 9 match the palette and type
rules; 3 use an unapproved blue background. Fix: re-export the 3
with the standard cream background and the hero template.
```

## Validation Checklist

- [ ] The palette, fonts, logo treatment, and imagery style are
      recorded in one reference document with examples.
- [ ] A template exists for each recurring image type.
- [ ] New images were checked against the reference before publishing.
- [ ] AI-generated images use the shared style and palette prompt block.
- [ ] Logos are placed as real logo files, never drawn by a model.
- [ ] On-image text meets the contrast and readability rules.
- [ ] Existing visuals were audited and drift was fixed in priority order.
- [ ] Templates and assets live in one shared, access-controlled location.
- [ ] Accessibility: palette pairings meet 4.5:1/3:1; meanings have non-color alternatives.

## Expected Deliverables

- The brand visual reference document (palette, type, logo, imagery).
- One template per recurring image type.
- The shared prompt block for AI-generated brand images.
- The audit report: what drifted, what was fixed, and what remains.
- Notes on where templates and assets live and who maintains them.

## References

- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag/)
  — contrast requirements for brand colors.
- [W3C Web Accessibility Initiative: Images](https://www.w3.org/WAI/tutorials/images/)
  — accessible treatment of images.
- [Open Graph protocol](https://ogp.me/) — preview images as brand
  carriers.
- Related skills in this repository: `ai-image-generation`,
  `image-prompt-engineering`, `blog-featured-images`,
  `og-image-generation`, `twitter-card-images`, `youtube-thumbnails`,
  `infographic-generation`, `image-accessibility`.
