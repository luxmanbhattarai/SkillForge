---
name: image-prompt-engineering
description: >
  Write effective prompts for AI image generators so the output matches
  the brief on subject, style, lighting, composition, and color. Use when
  a task asks for an image prompt, a better prompt for a failed generation,
  prompt variations, or a reusable prompt template for consistent visuals.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Image Prompt Engineering

## Purpose

This skill turns a vague image idea into a precise, repeatable prompt that
an image model can execute. It covers the anatomy of a good prompt, style
and composition vocabulary, negative instructions, iteration on failures,
and prompt templates for consistent series of images.

## When to Use

- A task asks for a prompt for an AI image generator.
- A generated image came out wrong and the prompt needs diagnosis and repair.
- A series of images must share one style, palette, or composition.
- A team needs a reusable prompt template for recurring visuals such as
  blog heroes, product shots, or social graphics.
- A brief needs to be translated into concrete visual language before
  anyone generates an image.

## When Not to Use

- The task needs the finished image file, not just the prompt — use
  `ai-image-generation` instead.
- The task needs a photograph of something real — no prompt can make a
  generated image a real photograph; use stock or a camera.
- The task needs a chart or diagram with exact data — use
  `infographic-generation` instead; image models cannot render data
  accurately.
- The task is about writing text prompts for a language model — this skill
  covers image prompts only.

## Prerequisites

- A brief: what the image shows, where it appears, who sees it, and what
  feeling it should create.
- The target aspect ratio or dimensions for the placement.
- The image tool that will run the prompt, if known, since tools differ
  in how they handle style words, aspect settings, and negative prompts.
- Any brand constraints: palette, style, and elements that must not appear.
- Examples of images the requester likes, when available.

## Official Documentation

- [Midjourney documentation](https://docs.midjourney.com/) — prompt
  structure, parameters, and style references for Midjourney.
- [OpenAI platform docs](https://platform.openai.com/docs) — image
  model prompting guidance for OpenAI image tools.
- [Google AI for Developers](https://ai.google.dev/) — image prompting
  guidance for Gemini image tools.
- Compatibility: image models and their prompt handling change with
  every model release — wording, parameters, and negative-prompt support
  that work on one model version may behave differently on the next. Do
  not name a specific model version from memory; check the linked docs
  for the current model, and always record the tool and model version a
  prompt was written and tested for.

## Required Workflow

1. Restate the brief as a visual description: subject, action or state,
   setting, and mood, in one or two sentences.
2. Fill in the prompt anatomy: subject, setting, style, medium, lighting,
   composition, color palette, and details.
3. Add explicit exclusions for elements that must not appear, phrased for
   the target tool (a negative prompt field where the tool has one, or
   "no ..." phrasing inside the prompt otherwise).
4. State the aspect ratio and orientation in the prompt or in the tool's
   size setting, matching the placement.
5. Deliver the prompt as a copyable block, plus a short note on which
   parts to change for variations.
6. When a generation fails, diagnose before rewriting: identify exactly
   which element went wrong (subject, style, composition, text, anatomy)
   and change only that part of the prompt.
7. Iterate one variable at a time and keep a short log of what changed
   and what improved, so the working prompt is reproducible.
8. For a series, freeze the style, lighting, and palette phrases into a
   shared template and vary only the subject and setting per image.

## Implementation Standards

- Every prompt names a concrete subject, a setting, a style or medium,
  lighting, and a composition. A prompt missing two or more of these is
  incomplete.
- Use concrete nouns and visual adjectives: "matte ceramic mug" beats
  "nice cup"; "soft window light" beats "good lighting".
- Put the most important element first. Image models weight early words
  more heavily, so the subject leads and decoration follows.
- Keep prompts focused: one subject and one clear scene. Two competing
  subjects in one prompt usually produce a muddled image.
- State the palette with named colors or a mood ("warm cream and sage
  green") rather than "nice colors".
- For text in the image, keep it to a few short words, put the exact
  wording in quotation marks, and warn that the output must be checked
  character by character.
- Record the tool the prompt was written for. A prompt tuned for one
  image model may behave differently on another.

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

- Start from a reference image when one exists: describe what makes it
  work, then reuse that description as the style block.
- Use medium words deliberately: "editorial photograph", "flat vector
  illustration", "watercolor", and "3D render" each pull the output in a
  very different direction.
- Control the background explicitly: "plain warm-white background" or
  "softly blurred kitchen" prevents cluttered, distracting scenes.
- Ask for empty space where a headline or overlay will go, for example
  "empty space on the left third for a headline".
- Build a small library of proven style blocks (one per recurring visual
  type) instead of inventing new wording for every image.
- Test a new template on two or three different subjects before adopting
  it for a whole series.

## Security Considerations

- Never write prompts that request a real, identifiable person, a
  private individual's likeness, or imagery that impersonates someone.
- Do not prompt for copyrighted characters, logos, or distinctive
  artwork in a way that reproduces protected work.
- Do not put personal data, private photos, credentials, or internal
  material into a prompt sent to a third-party image service.
- Prompts that depict children, sensitive locations, or realistic
  violence must not be written; refuse that part of the request and
  offer a safe alternative subject.
- Remind the requester to check the image tool's usage policy and
  commercial-use terms before publishing the result.

## Performance Considerations

- A precise first prompt saves generation rounds. Each failed round
  costs time and, on paid tools, money.
- Change one variable per iteration. Rewriting the whole prompt each
  time makes it impossible to learn what fixed the problem.
- Reuse proven templates for recurring visuals instead of drafting from
  scratch every time.
- Keep prompt templates short enough to scan: a template longer than a
  paragraph is hard to maintain and usually contains contradictions.

## Common Mistakes

- One-word style labels such as "professional" or "beautiful" — these
  mean different things to every model; name the medium, lighting, and
  palette instead.
- Cramming three scenes into one prompt — split them into separate
  prompts and separate images.
- Rewriting the entire prompt after one failure — diagnose the single
  broken element and change only that.
- Forgetting the aspect ratio — a square prompt for a wide hero slot
  wastes a generation and forces a bad crop.
- Assuming a prompt works the same on every tool — wording that works
  on one model may be ignored or misread on another; note the target tool.
- Asking for long or exact text — image models garble text; keep it to
  a few short words and verify every character.

## Examples

Weak prompt, and why it fails:

```text
a nice picture of a dog for a blog
```

It names no breed, setting, style, lighting, composition, or aspect
ratio, so the model guesses at all of them.

Strong prompt for the same need:

```text
Editorial photograph of a calm golden retriever lying on a beige rug
in a bright living room, soft morning window light, shallow depth of
field, warm neutral palette, 16:9 landscape composition with empty
space at the top for a headline. No people, no text, no logos.
```

Reusable template for a blog hero series (vary only the bracketed parts):

```text
Editorial photograph of [SUBJECT] in [SETTING], soft natural light,
shallow depth of field, warm neutral palette, 16:9 landscape
composition with empty space on the left for a headline. No people,
no text, no logos.
```

Negative instruction, phrased inside the prompt for tools without a
separate negative-prompt field:

```text
No people, no hands, no text, no watermarks, no cluttered background.
```

## Validation Checklist

- [ ] The prompt names a concrete subject, setting, style, lighting,
      and composition.
- [ ] The aspect ratio or orientation matches the placement.
- [ ] Exclusions cover the elements that must not appear.
- [ ] In-image text, if any, is limited to a few short words in quotes.
- [ ] The target image tool is named, or the prompt is marked tool-neutral.
- [ ] For a series, the shared style block is frozen in a template and
      only subject and setting vary.
- [ ] The prompt contains no request for a real person, copyrighted
      character, or unsafe content.
- [ ] The prompt is delivered as a copyable block with notes on what to
      vary.
- [ ] Accessibility: alt text ships with every image; generated text checked for legibility.

## Expected Deliverables

- The finished prompt as a copyable block.
- A short note on the target tool and the intended aspect ratio.
- For a failed generation: a diagnosis of what went wrong and the
  revised prompt with the change explained.
- For a series: the reusable template with the variable parts marked.
- Iteration notes, when several rounds were needed, showing what changed.

## References

- [Midjourney documentation](https://docs.midjourney.com/) — prompt
  structure and parameters.
- [OpenAI platform docs](https://platform.openai.com/docs) — image
  prompting guidance.
- [Google AI for Developers](https://ai.google.dev/) — image prompting
  guidance.
- Related skills in this repository: `ai-image-generation`,
  `blog-featured-images`, `youtube-thumbnails`, `brand-visual-consistency`.
