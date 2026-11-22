---
name: ai-image-generation
description: >
  Plan, prompt, generate, review, and deliver AI-generated images for
  articles, marketing, and product content. Use when a task asks for an
  AI-generated image, illustration, hero image, or artwork created with an
  image model, including choosing a style, aspect ratio, and output format.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-22"
---

# AI Image Generation

## Purpose

This skill produces AI-generated images that fit a stated purpose, audience,
and placement. It covers defining the brief, writing the prompt, generating
with an available image tool, reviewing the result for defects, and
delivering a correctly sized, correctly licensed file with alt text.

## When to Use

- A task asks for an AI-generated image, illustration, hero image, or artwork.
- A blog post, landing page, or presentation needs an original visual and no
  suitable stock photo exists.
- A concept needs a quick visual mockup before a designer produces the final art.
- A series of images must share one consistent style across articles or pages.

## When Not to Use

- The task needs a real photograph of a real place, person, or product —
  use a camera or a licensed stock photo instead; AI output is not evidence.
- The task needs a precise diagram, chart, or data visualization — use
  `infographic-generation` or a charting tool instead.
- The task needs only a prompt, not a generated file — use
  `image-prompt-engineering` instead.
- The task needs a social preview image — use `og-image-generation` or
  `twitter-card-images` instead, which cover the exact dimensions and tags.

## Prerequisites

- A clear brief: subject, purpose, placement, audience, and mood.
- Access to an image-generation tool in the current environment, or a named
  external tool the user can run.
- The target dimensions or aspect ratio for the placement.
- Any brand constraints: palette, style, logo usage, and forbidden content.
- Knowledge of where the file will be stored and what filename to use.
- Conceptual skill; version range: none — image models change
  frequently, so check the linked docs for the current model rather
  than relying on a pinned version.

## Official Documentation

- [OpenAI platform docs](https://platform.openai.com/docs) — image model
  guides and usage policies for OpenAI image tools.
- [Midjourney documentation](https://docs.midjourney.com/) — Midjourney
  parameters, styles, and community guidelines.
- [Gemini image generation docs](https://aistudio.google.com/docs/image-generation) — Gemini image
  generation guides and safety documentation.
- [Unsplash](https://unsplash.com/) — a stock-photo alternative when a
  real photograph is the better choice.
- Compatibility: image-model names, capabilities, and usage terms change
  frequently. Do not name a specific model version from memory — check the
  linked docs for the current model before promising a capability, and
  record the exact tool and model version used with each delivered image.

## Required Workflow

1. Confirm the brief in writing: subject, setting, style, mood, aspect
   ratio, dimensions, and where the image will appear.
2. Check the brand constraints and any content restrictions before prompting.
3. Write the prompt with `image-prompt-engineering`: subject, setting,
   style, lighting, composition, color palette, and what to avoid.
4. Generate the image with an available image tool. If no image-generation
   tool is available in this environment, stop and hand the user the
   finished prompt plus the target dimensions instead of claiming an image
   was produced.
5. Review the output at full size: hands, faces, text, logos, anatomy,
   perspective, and any garbled details. Regenerate or revise the prompt
   when a defect is visible.
6. Check the image against the brief: correct subject, correct mood, correct
   orientation, and no unwanted elements or text.
7. Resize or crop to the target dimensions and save in the right format
   (see `image-format-conversion` and `image-compression`).
8. Write alt text for the final image (see `image-accessibility`).
9. Record the prompt, tool, settings, and license or usage terms alongside
   the delivered file so the image can be regenerated or audited later.

## Implementation Standards

- One image per brief. A new subject, style, or placement gets a new prompt
  and a new review; do not reuse a prompt blindly across placements.
- Generate at or above the final display size, then downscale. Never upscale
  a small generated image and present it as high quality.
- Keep the prompt, tool name, model or version if known, seed or settings
  if the tool exposes them, and the generation date with the deliverable.
- Filenames are lowercase, hyphenated, and descriptive, for example
  `sourdough-starter-glass-jar-hero.jpg`.
- Never present an AI-generated image as a real photograph. Label it as
  AI-generated wherever the audience could mistake it for a real photo,
  and follow the disclosure rules of the platform where it is published.
- Text inside generated images is unreliable. Keep in-image text to a few
  short words at most, and verify every character in the output.

### Accessibility

- Every generated image ships with its alt text (or a note that it is
  decorative); alt text is part of the deliverable.
- Prompt for legible text and sufficient contrast — generators garble
  text and produce low-contrast art often; review every output.
- Do not ask for the message in color alone; the image must read
  clearly in grayscale.
- Prefer images without embedded text; where text is needed, keep it
  short and check it character by character.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Generate several variations and pick the strongest one rather than
  accepting the first result.
- Describe the composition explicitly: subject placement, background
  simplicity, and empty space for headlines or overlays.
- Use a consistent style phrase across a series so related images look
  like they belong together.
- Prefer simple backgrounds and one clear focal point; busy scenes hide
  defects and distract from the message.
- Keep people out of the image when the brief does not need them, since
  faces and hands are the most common source of visible defects.
- Save the best prompt for reuse, and note which variations failed and why.

## Security Considerations

- Never prompt for a real, identifiable person, and never generate imagery
  that impersonates someone or reproduces a private individual's likeness.
- Do not prompt for copyrighted characters, logos, watermarks, or distinctive
  artwork in a way that reproduces someone else's protected work.
- Do not include personal data, private photos, API keys, or internal
  documents in a prompt sent to a third-party image service.
- Check the image service's terms for ownership and commercial-use rights
  before using an image in published or commercial work.
- Review output for accidental inclusion of readable text such as signs,
  screens, or documents that could leak information.

## Performance Considerations

- Generate at the smallest size that still meets the placement's display
  size; oversized generations cost more time and storage.
- Compress the delivered file (see `image-compression`) so page weight
  stays low; a hero image should not dominate the page's total size.
- Prefer modern formats such as WebP or AVIF for web delivery when the
  platform supports them, with a JPEG fallback only where needed.
- Reuse one generated image across placements only when the crop and
  dimensions still suit each placement; otherwise generate or crop per
  placement.

## Common Mistakes

- Accepting the first generation — the first result often has subtle
  defects; always generate variations and review at full size.
- Vague prompts such as "a nice picture of bread" — a vague prompt gives
  a generic result; specify subject, style, lighting, and composition.
- Claiming an image was generated when no image tool was available — if
  there is no tool, deliver the prompt and dimensions, not a fake file.
- Using AI output as documentary evidence — generated images are
  illustrations, not proof of a real event, place, or product.
- Ignoring licensing — check the tool's terms before commercial use; not
  every image service grants the same rights.
- Letting the model render long text — generated text is frequently
  misspelled; add real text with an editor or keep it to a few words.

## Examples

Example brief, written before any prompt:

```text
Subject: a glass jar of bubbling sourdough starter on a wooden counter
Setting: bright home kitchen, morning light, blurred background
Style: warm editorial food photography look, shallow depth of field
Mood: inviting, calm, homemade
Aspect ratio: 16:9, landscape, for a blog hero image
Avoid: people, hands, text, logos, cluttered counters
```

Example prompt built from that brief:

```text
Editorial food photograph of a glass jar of bubbling sourdough starter
on a light wooden counter, bright morning kitchen light, soft blurred
background, warm tones, shallow depth of field, 16:9 landscape
composition with empty space on the left for a headline. No people,
no hands, no text, no logos.
```

Example delivery note recorded with the file:

```text
File: sourdough-starter-glass-jar-hero.jpg
Tool: <image tool used> | Prompt: see prompt above
Size: 1600x900 | Format: JPEG, quality 82
Alt text: Glass jar of bubbling sourdough starter on a wooden counter
  in morning light.
License: per the image tool's terms; verify before commercial reuse.
```

## Validation Checklist

- [ ] The brief (subject, style, dimensions, placement) was confirmed
      before generation.
- [ ] The image was generated with a real, available image tool, or the
      prompt and dimensions were handed over instead.
- [ ] The output was reviewed at full size and has no visible defects in
      faces, hands, text, or anatomy.
- [ ] The image matches the brief's subject, mood, and orientation.
- [ ] The file is the correct size and format for its placement.
- [ ] Alt text is written for the final image.
- [ ] The prompt, tool, and usage terms are recorded with the file.
- [ ] The image is labeled AI-generated wherever it could be mistaken
      for a real photograph.
- [ ] Accessibility: alt text ships with every image; generated text checked for legibility.

## Expected Deliverables

- The final image file at the target dimensions, in the agreed format.
- The prompt used, plus the tool name and any settings worth recording.
- Alt text for the final image.
- A short note on usage terms and any disclosure the publisher must add.
- The list of rejected variations, if any, with the reason each was rejected.

## References

- [OpenAI platform docs](https://platform.openai.com/docs) — image
  generation guides and usage policies.
- [Midjourney documentation](https://docs.midjourney.com/) — parameters
  and style guidance.
- [Gemini image generation docs](https://aistudio.google.com/docs/image-generation) — image generation
  guides and safety documentation.
- Related skills in this repository: `image-prompt-engineering`,
  `blog-featured-images`, `image-compression`, `image-format-conversion`,
  `image-accessibility`, `brand-visual-consistency`.
