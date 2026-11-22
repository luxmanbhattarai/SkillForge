---
name: social-sharing
description: >
  Make pages easy and attractive to share: share buttons and links,
  preview metadata, copy-link behavior, and share-intent URLs for
  X, Facebook, LinkedIn, WhatsApp, and email. Use when adding share
  buttons to a site, fixing shares that look wrong, or improving how
  often content gets shared. Covers native share intents, the Web
  Share API, and UTM tagging.
license: MIT
metadata:
  version: "1.0.0"
  category: metadata
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Social Sharing

## Purpose

This skill helps an agent make sharing a page easy and effective:
working share buttons that do not slow the page down, previews that
look good on each platform, and links that carry the right tracking.
The outcome is a page a reader can share in one click, with a preview
that represents the page well wherever it lands.

## When to Use

- Adding share buttons or a share menu to articles, landing pages,
  or product pages.
- Fixing shares that render the wrong preview or no preview.
- Improving how often content is shared from the site.
- Adding UTM tracking to shared links so shares can be measured.
- Replacing heavy third-party share widgets with lightweight links.

## When Not to Use

- When the task is only the preview metadata — use `open-graph` or
  `twitter-cards` for the tags themselves.
- When the task is search-engine metadata — use `seo-metadata`.
- When the task is validating metadata output — use
  `metadata-validation`.
- When the task is a social media posting strategy (what to post,
  when) — that is a marketing task, not a site implementation task.

## Prerequisites

- Access to the site's source code.
- The page's canonical URL and its Open Graph and Twitter Card tags
  (or the plan to add them).
- Knowledge of which platforms the audience actually uses.
- For tracking: the site's analytics setup and UTM conventions.

## Official Documentation

- [The Open Graph protocol](https://ogp.me/) — the preview tags
  that make shared links look right.
- [MDN — Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
  — `navigator.share` for native sharing on supported devices.
- [web.dev](https://web.dev/) — guidance on sharing and social
  metadata.

## Required Workflow

1. Confirm the preview metadata first. A share button is useless if
   the shared link renders a broken preview. Check Open Graph and
   Twitter Card tags (see `open-graph` and `twitter-cards`).
2. Choose the platforms to support, based on the audience. A short
   list that matches the audience beats a long list of buttons
   nobody clicks.
3. Implement share links as plain links to each platform's share
   intent URL, not as third-party widgets. Share intent URLs are
   simple, fast, and do not load external scripts.
4. Add the Web Share API as the primary action on devices that
   support it, with the intent links as the fallback.
5. Add UTM parameters to the shared URL consistently (source, medium,
   campaign) so shares can be measured in analytics — but keep the
   canonical URL clean and do not put UTM parameters in the
   canonical tag.
6. Test each share path: click every button, confirm the share
   dialog opens with the right URL, title, and preview, and confirm
   the shared link lands on the correct page.
7. Test on mobile, where most sharing happens, and confirm the Web
   Share API path works.
8. Measure: check analytics for referral traffic from the shared
   links and adjust the platform list if a button is never used.

## Implementation Standards

- Use plain share-intent links, not third-party share widgets.
   Third-party widgets load external scripts, track users, and slow
   the page.
- Every share link must share the page's canonical URL (plus UTM
   parameters where tracking is wanted). Never share a URL with a
   session identifier or internal parameter.
- The shared URL must be URL-encoded in the intent link. An
   unencoded URL with query parameters will break.
- Share buttons must be real links or buttons with accessible names
   ("Share on X", "Copy link"), not divs with click handlers.
- The Web Share API must be feature-detected (`if (navigator.share)`)
   and must fall back to intent links where it is not supported.
   It only works in secure contexts (HTTPS) and must be called
   from a user gesture, such as a button click; use
   `navigator.canShare()` to check data before sharing it.
- UTM parameters must follow the site's existing convention. If
   there is no convention, use `utm_source=<platform>`,
   `utm_medium=social`, and `utm_campaign=share`.
- Copy-link buttons must confirm the copy happened (a visible
   "Copied" state) and must handle clipboard permission failures
   gracefully.
- Do not assume all platforms render previews identically. Test the
  shared link on each platform that matters.

### Accessibility

- Share buttons are real buttons with accessible names ("Share on X",
  not an icon alone) and keyboard support.
- Copy-link feedback is announced (`role="status"`), not shown by
  color change alone.
- Share dialogs trap focus while open and return focus to the trigger
  on close.
- Preview metadata includes `og:image:alt` so the shared preview is
  described for screen-reader users.
- Shared baseline: `docs/ACCESSIBILITY-STANDARDS.md` (WCAG 2.2 AA);
  the full audit workflow lives in the `accessibility` skill.

## Best Practices

- Put share buttons where readers finish the content (end of an
  article) and where they decide to share (a clear, visible spot),
  not hidden in a menu.
- Keep the platform list short: three or four platforms the audience
  uses, plus copy-link, is usually enough.
- Use the Web Share API on mobile: it opens the device's native
  share sheet, which covers every app the user has installed.
- Make the copy-link button prominent; copying a link is the most
  common sharing action on desktop.
- Test shares from a real device, not just a desktop browser.
- Review the platform list periodically: audiences move, and a
  button nobody clicks is clutter.

## Security Considerations

- Share intent URLs are links to third-party sites. Use
  `rel="noopener"` on links that open in a new tab.
- Never include tokens, session identifiers, or personal data in a
  shared URL.
- UTM parameters are visible in the shared URL; do not put anything
  sensitive in them.
- The Web Share API shares whatever data you pass it; pass only the
  page's public URL, title, and description.
- Third-party share widgets track users across sites. Avoiding them
  is a privacy benefit as well as a performance one.

## Performance Considerations

- Plain intent links add no JavaScript. Third-party share widgets
  can add hundreds of kilobytes and several requests; avoid them.
- The Web Share API is built into the browser and costs nothing.
- Share buttons should not load images from third-party domains;
  use inline SVG icons or text.

## Common Mistakes

- Using a heavy third-party share widget when plain links would do.
- Sharing a URL with session parameters or internal tracking IDs.
- Forgetting to URL-encode the shared URL, so the intent link breaks.
- Putting UTM parameters in the canonical URL or the Open Graph URL.
- Adding share buttons without checking the preview metadata first,
  so shares look broken.
- No fallback when the Web Share API is unavailable.
- A dozen share buttons for platforms the audience never uses.

## Examples

Plain share-intent links for X, Facebook, LinkedIn, WhatsApp, and
email. The X intent endpoint is now `x.com/intent/post`; the old
`twitter.com/intent/tweet` URL still redirects to it. The WhatsApp
link uses the official `wa.me` format with a pre-filled message
and no phone number, so the reader picks the recipient.

```html
<!-- Share intents are plain links: no third-party scripts needed. -->
<a href="https://x.com/intent/post?url=https%3A%2F%2Fexample.com%2Fblog%2Fsourdough&text=How%20to%20Fix%20Dense%20Sourdough%20Crumb"
   target="_blank" rel="noopener">Share on X</a>

<a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com%2Fblog%2Fsourdough"
   target="_blank" rel="noopener">Share on Facebook</a>

<a href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fblog%2Fsourdough"
   target="_blank" rel="noopener">Share on LinkedIn</a>

<a href="https://wa.me/?text=How%20to%20Fix%20Dense%20Sourdough%20Crumb%20https%3A%2F%2Fexample.com%2Fblog%2Fsourdough"
   target="_blank" rel="noopener">Share on WhatsApp</a>

<a href="mailto:?subject=How%20to%20Fix%20Dense%20Sourdough%20Crumb&body=https%3A%2F%2Fexample.com%2Fblog%2Fsourdough">
  Share by email</a>
```

Web Share API with a fallback to intent links:

```js
// Use the native share sheet when available; otherwise show the
// intent links.
async function sharePage({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // The user cancelled the share sheet; nothing to do.
    }
  } else {
    document.getElementById('share-links').hidden = false;
  }
}
```

Copy-link button with confirmation:

```js
async function copyLink(url, button) {
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy link'; }, 2000);
  } catch {
    button.textContent = 'Copy failed — copy the URL from the address bar';
  }
}
```

## Validation Checklist

- [ ] Preview metadata (Open Graph and Twitter Cards) is in place
      before share buttons are added.
- [ ] Every share link opens the correct platform dialog with the
      right URL, title, and preview.
- [ ] Shared URLs are URL-encoded and contain no session data.
- [ ] UTM parameters follow the site's convention and are not in
      the canonical URL.
- [ ] The Web Share API is feature-detected with a fallback.
- [ ] Copy-link confirms success and handles failure.
- [ ] Share buttons are accessible (real links or buttons with
      names).
- [ ] No third-party share widget scripts are loaded.
- [ ] Accessibility: share buttons named and keyboard-operable; copy feedback announced.

## Expected Deliverables

- Share buttons or a share menu implemented with intent links and
  the Web Share API.
- A list of supported platforms and the reason each was chosen.
- Test results for each share path (desktop and mobile).
- UTM conventions documented for shared links.
- Notes on any platform where the preview differs.

## References

- [The Open Graph protocol](https://ogp.me/) — preview tags.
- [MDN — Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
  — native sharing.
- [web.dev](https://web.dev/) — sharing and social metadata.
- Related skills in this repository: `open-graph`, `twitter-cards`,
  `seo-metadata`, `dynamic-metadata`, `metadata-validation`.
