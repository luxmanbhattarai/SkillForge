---
name: youtube-thumbnails
description: >
  Design YouTube video thumbnails that are readable at small sizes and
  honest about the video's content. Use when a task asks for a YouTube
  thumbnail, video thumbnail, or custom thumbnail for a video, at the
  standard 1280x720 size.
license: MIT
metadata:
  version: "1.0.0"
  category: media
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# YouTube Thumbnails

## Purpose

This skill produces custom YouTube thumbnails that a viewer can read
and understand at a glance, in the feed, in search results, and on a
phone. It covers the 1280x720 standard, composition, text rules,
honesty about the video's content, and consistency across a channel.

## When to Use

- A new video needs a custom thumbnail.
- An existing video's thumbnail is blurry, unreadable, or misleading.
- A channel needs a consistent thumbnail system across videos.
- A video's click-through is low and the thumbnail is being revised.
- A thumbnail needs to be checked at small sizes before upload.

## When Not to Use

- The task is a social link preview image — use `og-image-generation`
  or `twitter-card-images` instead.
- The task is a blog hero image — use `blog-featured-images` instead.
- The task is a diagram or chart inside a video — use
  `infographic-generation` instead.
- The task is the video itself (scripting, editing, titles) — this
  skill covers the thumbnail image only.

## Prerequisites

- The video title and the one idea the thumbnail should communicate.
- The thumbnail size: 1280x720 pixels (16:9).
- The channel's brand assets: logo, palette, and fonts.
- A still from the video, a photo, or a generated image to build on.
- Knowledge of who the video is for and what would make them click.

## Official Documentation

- [YouTube Help](https://support.google.com/youtube/) — official
  YouTube help, including custom thumbnail requirements.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion for thumbnails.
- [Squoosh](https://squoosh.app/) — a browser tool for resizing and
  compressing images without installing software.

## Required Workflow

1. Read the video title and name the single idea the thumbnail must
   communicate in under two seconds.
2. Choose one focal visual: a clear frame from the video, a photo, or
   an image made with `ai-image-generation`.
3. Compose at 1280x720 with one focal point, high contrast, and a
   simple background. The thumbnail competes with many others in a
   feed, so clarity beats detail.
4. Add at most a few large words that complement the title rather than
   repeating it word for word.
5. Keep essential text and the focal subject away from the bottom-right
   corner, where the video duration badge covers the thumbnail, and
   away from the edges.
6. Check the thumbnail at small sizes (around 320 and 168 pixels wide)
   to confirm it is still readable and the subject is still clear.
7. Check the thumbnail on a phone screen as well as a desktop.
8. Confirm the thumbnail is honest: it must show something the video
   actually contains. Do not promise a result, person, or event that
   is not in the video.
9. Export at 1280x720, compress, and save in a format YouTube accepts
   for thumbnails (JPEG or PNG).
10. Upload the thumbnail, confirm it renders on the video page, and
    record the design source so future thumbnails can reuse the system.

## Implementation Standards

- Thumbnails are 1280x720 pixels (16:9), the size YouTube documents
  for custom thumbnails.
- The file is a JPEG or PNG and stays within YouTube's file-size limit
  for thumbnails; check the current limit in YouTube Help before
  uploading an unusually large file.
- One focal point per thumbnail. Two competing subjects make the image
  unreadable at small sizes.
- On-thumbnail text is at most a few words, in large bold type with
  strong contrast against the background.
- Text never duplicates the video title exactly; the thumbnail and the
  title work together to say one thing.
- The duration badge covers the bottom-right corner, so nothing
  essential goes there.
- The thumbnail must be honest about the video. Misleading thumbnails
  damage trust and can violate YouTube's policies on misleading content.

## Best Practices

- Use a real frame from the video as the base when possible; viewers
  trust a thumbnail that matches what they see after clicking.
- Use faces sparingly and only when the expression is genuine and
  relevant; exaggerated expressions wear out an audience.
- Keep a consistent system across the channel: same logo position,
  same font, same color treatment, so subscribers recognize the
  channel in a feed.
- Use color contrast deliberately: the thumbnail must stand out
  against both light and dark YouTube themes.
- Test two thumbnail options when the video matters, and keep the
  winner's design notes for the next video.
- Revisit thumbnails on older videos that still get search traffic;
  a better thumbnail can revive a good video.

## Security Considerations

- Use only images the channel has the right to publish: original
  frames, licensed photos, or AI output whose terms allow publication.
- Do not use another creator's thumbnail, artwork, or logo without
  permission; that is both a copyright risk and a trust risk.
- Do not include readable private information in a thumbnail, such
  as screens, documents, addresses, or license plates.
- Do not depict a real person in a misleading or defamatory way in a
  thumbnail.
- Keep thumbnail source files in the channel's own storage, not
  hotlinked from another site.

## Performance Considerations

- Compress the thumbnail so it uploads quickly and YouTube can
  process it without delay.
- Design at exactly 1280x720; larger source files add upload time
  without improving the displayed thumbnail.
- Reuse a thumbnail template across videos to cut design time per video.
- Keep the source design file so a thumbnail can be revised without
  rebuilding it from scratch.

## Common Mistakes

- Tiny text that is unreadable in the feed — if it cannot be read at
  320 pixels wide, remove it or enlarge it.
- Repeating the full video title on the thumbnail — the title already
  appears next to the thumbnail; use the image to add something new.
- Putting the key subject in the bottom-right corner — the duration
  badge covers it.
- A cluttered thumbnail with three subjects and five text lines —
  one subject and a few words is the limit.
- A misleading thumbnail that overpromises — viewers leave quickly
  and trust drops; show what the video actually contains.
- Checking the thumbnail only at full size — it is almost always
  viewed small, so test it small.

## Examples

Example thumbnail brief, written before designing:

```text
Video: "Why Your Sourdough Starter Smells Like Nail Polish Remover"
Idea in two seconds: something is wrong with the starter, and the
fix is simple.
Focal visual: glass jar of starter, close and clear.
On-thumbnail text: "Hungry Starter?" (title carries the detail)
Avoid: cluttered kitchen background, tiny text, stock bread photos.
```

Example layout at 1280x720:

```text
+----------------------------------------------------------+
|  Background: warm kitchen, softly blurred               |
|                                                          |
|  LEFT: large jar of starter, in sharp focus              |
|  RIGHT: "Hungry Starter?" in large bold type             |
|                                                          |
|  Bottom-left: small channel mark                         |
|  Bottom-right: kept clear for the duration badge         |
+----------------------------------------------------------+
```

Example resize step with Sharp (Node.js):

```js
const sharp = require("sharp");

await sharp("thumbnail-source.png")
  .resize(1280, 720, { fit: "cover" })
  .jpeg({ quality: 88 })
  .toFile("sourdough-starter-smell-thumbnail.jpg");
```

## Validation Checklist

- [ ] The thumbnail is exactly 1280x720 pixels.
- [ ] The file is a JPEG or PNG within YouTube's size limit.
- [ ] The thumbnail communicates one idea in under two seconds.
- [ ] Text is a few large words, readable at 320 pixels wide.
- [ ] Nothing essential sits in the bottom-right corner or at the edges.
- [ ] The thumbnail was checked at small sizes and on a phone.
- [ ] The thumbnail honestly represents the video's content.
- [ ] The thumbnail was uploaded and renders on the video page.

## Expected Deliverables

- The final thumbnail file at 1280x720.
- The thumbnail brief: the one idea, the focal visual, and the text.
- The source design file or generation prompt, for future revisions.
- A note of the small-size check result.
- The upload confirmation for the video.

## References

- [YouTube Help](https://support.google.com/youtube/) — custom
  thumbnail requirements and policies.
- [Sharp documentation](https://sharp.pixelplumbing.com/) — scripted
  resizing and conversion.
- Related skills in this repository: `ai-image-generation`,
  `image-prompt-engineering`, `image-compression`,
  `image-format-conversion`, `brand-visual-consistency`.
