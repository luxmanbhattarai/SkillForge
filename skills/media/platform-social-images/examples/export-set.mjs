const sharp = require("sharp");

// Shared image: 1200x630 JPEG, compressed under WhatsApp's 600 KB limit.
await sharp("card-source.png")
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("sourdough-starter-smell-og.jpg");

// Dedicated X export: exact 2:1.
await sharp("card-source.png")
  .resize(1200, 600, { fit: "cover" })
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile("sourdough-starter-smell-card.jpg");
