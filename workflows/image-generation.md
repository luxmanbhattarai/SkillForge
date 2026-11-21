# Image Generation

Create images for content and sharing: featured images, OG images, and
thumbnails — optimized and accessible.

## Inputs

- Image type: featured image, OG image, or thumbnail.
- Placement: the article or page it serves.
- Style guidance: brand, colors, or reference images.

## Steps

1. **Confirm the brief.** Image type, placement, dimensions, and style.
   If the message the image should convey is unclear, ask before
   generating.
2. **Generate the image** (`ai-image-generation`). Follow the skill's
   guidance on prompts and iteration. Generate for the final placement,
   not a generic size.
3. **Shape it for its placement** (`blog-featured-images`,
   `og-image-generation`, or `youtube-thumbnails`). Crop and compose for the
   required dimensions and aspect ratio.
4. **Match the brand** (`brand-guidelines` upstream) when a brand
   identity exists. Keep style consistent with existing images.
5. **Optimize for the web** (`frontend-performance`). Choose the right
   format and compress without visible quality loss.
6. **Write alt text** (`accessibility`). Describe the image's content
   and purpose accurately.
7. **Set sharing metadata** (`open-graph`, `seo-metadata`) when the
   image serves social sharing. Verify the social preview renders.
8. **Verify in place.** Check the image on the live or staging page at
   the sizes readers will see it.

## Outputs

- Image files at the required dimensions and formats.
- Alt text for each image.
- Sharing metadata where the image serves social previews.

## Checks

- [ ] Images match the required dimensions and formats.
- [ ] File sizes are reasonable for web use.
- [ ] Alt text is accurate and present for every content image.
- [ ] Social images render correctly in preview.
- [ ] Style is consistent with the site's other images.
- [ ] No image with an unclear license is used.
