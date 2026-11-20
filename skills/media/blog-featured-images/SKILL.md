---
name: blog-featured-images
description: >
  Choose, create, size, and optimize featured images for blog articles
  so each post has a relevant, fast-loading hero visual. Use when a task
  asks for a blog featured image, hero image, post thumbnail, article
  cover image, or cover art for a new or existing blog post.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Blog Featured Images

## Purpose

This skill gives every blog article a featured image that matches the
article's topic, loads fast, and looks right in the theme's hero slot,
in article lists, and in link previews. It covers sourcing, sizing,
cropping, compression, alt text, and naming.

## When to Use

- A new blog article needs a featured image or hero image.
- An existing article has a missing, broken, low-quality, or off-topic
  featured image.
- A blog redesign changes the hero slot dimensions and images need
  re-cropping.
- An article's featured image is also used as its social preview image
  and needs to satisfy both roles.
- A content audit finds articles without featured images.

## When Not to Use

- The task is a social preview image only, with no blog placement — use
  `og-image-generation` instead.
- The task is a diagram or chart inside the article body — use
  `infographic-generation` instead.
- The task is only about writing the image prompt — use
  `image-prompt-engineering` instead.
- The task is a video thumbnail — use `youtube-thumbnails` instead.

## Prerequisites

- The article title, topic, and the main point the image should convey.
- The blog theme's featured-image dimensions or aspect ratio, and where
  the image appears (hero slot, list cards, related posts).
- The site's image storage location and naming convention.
- Whether the featured image doubles as the Open Graph image.
- Any brand constraints on style, palette, and logo use.

## Official Documentation

- [Open Graph protocol](https://ogp.me/) — how featured images are
  reused as link previews.
- [MDN: the img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
  — responsive images, `srcset`, `sizes`, and alt text.
- [Squoosh](https://squoosh.app/) — a browser tool for resizing and
  compressing images without installing software.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion for bulk image work.

## Required Workflow

1. Read the article's title and introduction and name the single idea
   the featured image should convey.
2. Confirm the theme's featured-image dimensions and aspect ratio, and
   check how the image is cropped in list cards as well as the hero slot.
3. Source the image: a licensed stock photo, an original photo, or an
   AI-generated image made with `ai-image-generation`.
4. Check the license and record the source and attribution requirement
   with the file.
5. Crop and resize to the theme's dimensions, keeping the subject clear
   of the edges so list-card crops do not cut it off.
6. Compress the image (see `image-compression`) and save it in the
   right format for the site (see `image-format-conversion`).
7. Name the file descriptively with the article slug or topic, using
   lowercase hyphens.
8. Write alt text describing what the image shows (see
   `image-accessibility`).
9. Set the image in the article's frontmatter or CMS field, and confirm
   it renders in the hero slot, in list cards, and in a link preview.
10. If the featured image doubles as the Open Graph image, verify the
    Open Graph tags point at it and check the preview with
    `social-preview`.

## Implementation Standards

- One featured image per article, chosen for that article's topic. Do
  not reuse the same generic image across unrelated posts.
- The image must read clearly at both hero size and small list-card
  size: one focal point, uncluttered background, strong contrast.
- Keep the subject inside the central safe area so theme crops on
  different screen sizes do not cut it off.
- Avoid text baked into the image when the theme already overlays the
  title; duplicated text looks broken and cannot be translated.
- Use the site's standard dimensions for every featured image so list
  layouts stay aligned.
- Alt text describes the image content in one sentence; it does not
  repeat the article title word for word.
- Record the image source and license in the article's notes or in a
  site image log so attribution can be checked later.

## Best Practices

- Pick an image that adds meaning, not decoration: a reader should be
  able to guess the article's topic from the image alone.
- Prefer original or AI-generated images over the most popular stock
  photos, which readers have seen on many other sites.
- Keep a consistent look across featured images (similar palette,
  similar treatment) so the blog index feels like one publication.
- Leave breathing room around the subject for the theme's overlay text
  and gradient treatments.
- Check the image on a phone as well as a desktop; most blog traffic
  arrives on small screens.
- Revisit featured images during content refreshes; an outdated image
  makes a refreshed article look stale.

## Security Considerations

- Use only images the site has the right to publish: licensed stock,
  original photos, or AI output whose terms allow publication. Never
  copy an image from another site without a license.
- Honor attribution requirements in the stock license; a missing
  credit can be a license violation.
- Do not publish images containing readable private information such
  as screens, documents, license plates, or house numbers.
- Do not use images of identifiable people without consent or a model
  release covering the intended use.
- Keep image files in the site's own storage or a trusted CDN rather
  than hotlinking another site's images, which can break or be replaced.

## Performance Considerations

- Compress every featured image before publishing; an uncompressed
  hero image is often the largest single asset on a blog page.
- Serve responsive sizes with `srcset` where the theme supports it, so
  phones do not download the desktop-sized file.
- Prefer WebP or AVIF for web delivery when the site's pipeline
  supports them.
- Lazy-load featured images below the fold, but never lazy-load the
  hero image on the article page itself, since it is the largest
  contentful element.
- Set explicit width and height (or an aspect-ratio box) so the hero
  slot does not shift the layout while the image loads.

## Common Mistakes

- A generic image that could illustrate any article — pick an image
  tied to this article's specific topic.
- Uploading a multi-megabyte original — resize and compress before
  publishing.
- Text baked into the image that duplicates the overlaid title —
  keep the image clean and let the theme render the title.
- A subject placed at the edge that list-card crops cut off — keep
  the focal point central.
- Missing alt text — every featured image needs a one-sentence
  description for screen readers and search engines.
- Reusing one image across many posts — readers and search engines
  treat repeated images as filler, not content.

## Examples

Example frontmatter for an article using a featured image:

```yaml
title: "Why Your Sourdough Starter Smells Like Nail Polish Remover"
featured_image: /images/sourdough-starter-glass-jar-hero.jpg
featured_image_alt: "Glass jar of bubbling sourdough starter on a wooden counter in morning light."
```

Example responsive image markup for a hero slot:

```html
<img
  src="/images/sourdough-starter-glass-jar-hero-1200.jpg"
  srcset="/images/sourdough-starter-glass-jar-hero-800.jpg 800w,
          /images/sourdough-starter-glass-jar-hero-1200.jpg 1200w,
          /images/sourdough-starter-glass-jar-hero-1600.jpg 1600w"
  sizes="(max-width: 700px) 100vw, 1200px"
  width="1200"
  height="675"
  alt="Glass jar of bubbling sourdough starter on a wooden counter in morning light."
  fetchpriority="high"
>
```

Example resize and compress step with Sharp (Node.js):

```js
const sharp = require("sharp");

await sharp("sourdough-starter-original.jpg")
  .resize(1600, 900, { fit: "cover" })
  .jpeg({ quality: 82 })
  .toFile("sourdough-starter-glass-jar-hero.jpg");
```

## Validation Checklist

- [ ] The image matches the article's topic and main idea.
- [ ] The image is the theme's featured-image size and aspect ratio.
- [ ] The subject survives the list-card crop on mobile and desktop.
- [ ] The file is compressed and in the site's preferred format.
- [ ] The filename is descriptive, lowercase, and hyphenated.
- [ ] Alt text is set and describes the image in one sentence.
- [ ] The source and license are recorded.
- [ ] The image renders correctly in the hero slot, list cards, and
      link preview.

## Expected Deliverables

- The final featured image file at the theme's dimensions.
- Responsive sizes, if the theme uses `srcset`.
- The alt text for the image.
- The frontmatter or CMS values to set (image path and alt text).
- A note of the image source and license.

## References

- [Open Graph protocol](https://ogp.me/) — link preview behavior for
  featured images.
- [MDN: the img element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
  — responsive images and alt text.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion.
- Related skills in this repository: `ai-image-generation`,
  `image-prompt-engineering`, `og-image-generation`, `social-preview`,
  `image-compression`, `image-format-conversion`, `image-accessibility`.
