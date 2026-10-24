import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

async function makeIco(pngBuffers, outputPath) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // image type (1 = icon)
  header.writeUInt16LE(count, 4); // number of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  const imageBuffers = [];

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data

    dirEntries.push(entry);
    imageBuffers.push(buffer);
    offset += buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
  fs.writeFileSync(outputPath, icoBuffer);
  console.log('✓ Generated ICO:', outputPath, `(${icoBuffer.length} bytes)`);
}

async function run() {
  const symbolPath = 'public/nadikomuniti/01_branding/logo-symbol.webp';
  const logoHeaderPath = 'public/nadikomuniti/01_branding/logo-header-horizontal.webp';
  const heroMockupPath = 'public/nadikomuniti/hero/nadikomuniti-hero-transparent.webp';

  // Ensure directories exist
  fs.mkdirSync('public/icons', { recursive: true });
  fs.mkdirSync('public/nadikomuniti/og', { recursive: true });

  // 1. Generate Favicons
  console.log('\n--- 1. Generating Favicons ---');
  // Trim empty margins from logo symbol so it fills the icon canvas cleanly
  const trimmedSymbol = await sharp(symbolPath).trim().toBuffer();
  
  const png16 = await sharp(trimmedSymbol)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const png32 = await sharp(trimmedSymbol)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const png48 = await sharp(trimmedSymbol)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Save favicon.ico to public/ and src/app/
  await makeIco(
    [{ buffer: png16, size: 16 }, { buffer: png32, size: 32 }, { buffer: png48, size: 48 }],
    'public/favicon.ico'
  );
  await makeIco(
    [{ buffer: png16, size: 16 }, { buffer: png32, size: 32 }, { buffer: png48, size: 48 }],
    'src/app/favicon.ico'
  );

  // Save 32x32 standard browser icon to public/favicon-32x32.png and src/app/icon.png
  await sharp(trimmedSymbol)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon-32x32.png');
  await sharp(trimmedSymbol)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('src/app/icon.png');
  console.log('✓ Generated public/favicon-32x32.png and src/app/icon.png');

  // 2. Generate Mobile Home Screen & PWA Icons
  console.log('\n--- 2. Generating Mobile App & PWA Icons ---');
  // Apple Touch Icon: 180x180 with clean safe margin (~15% padding)
  await sharp(trimmedSymbol)
    .resize(144, 144, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 18,
      bottom: 18,
      left: 18,
      right: 18,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // Crisp white backing for iOS home screens
    })
    .png()
    .toFile('public/icons/apple-touch-icon.png');
  // Also copy to src/app/apple-icon.png for Next.js auto-route
  fs.copyFileSync('public/icons/apple-touch-icon.png', 'src/app/apple-icon.png');
  console.log('✓ Generated public/icons/apple-touch-icon.png and src/app/apple-icon.png (180x180)');

  // 192x192 Standard PWA Icon (with ~18% padding on pure white rounded/circular container)
  await sharp(trimmedSymbol)
    .resize(148, 148, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 22,
      bottom: 22,
      left: 22,
      right: 22,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile('public/icons/icon-192.png');
  console.log('✓ Generated public/icons/icon-192.png (192x192)');

  // 512x512 Standard PWA Icon
  await sharp(trimmedSymbol)
    .resize(396, 396, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 58,
      bottom: 58,
      left: 58,
      right: 58,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile('public/icons/icon-512.png');
  console.log('✓ Generated public/icons/icon-512.png (512x512)');

  // 512x512 Maskable PWA Icon
  // W3C Maskable Icon standard: safe zone is an inner circle with 80% diameter (409px)
  // We place the symbol centered at 320x320 inside 512x512 canvas (padding 96px on all sides)
  await sharp(trimmedSymbol)
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 96,
      bottom: 96,
      left: 96,
      right: 96,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile('public/icons/maskable-icon-512.png');
  console.log('✓ Generated public/icons/maskable-icon-512.png (512x512 maskable)');

  // 3. Generate Official 1200x630 Open Graph Image
  console.log('\n--- 3. Generating Open Graph Image (1200x630) ---');
  const ogWidth = 1200;
  const ogHeight = 630;

  const svgBackground = `
    <svg width="${ogWidth}" height="${ogHeight}" viewBox="0 0 ${ogWidth} ${ogHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0B1324" />
          <stop offset="45%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#080D1A" />
        </linearGradient>
        <radialGradient id="glowTopLeft" cx="15%" cy="20%" r="55%">
          <stop offset="0%" stop-color="#BA1B1D" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#BA1B1D" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowBottomRight" cx="85%" cy="80%" r="60%">
          <stop offset="0%" stop-color="#F97316" stop-opacity="0.20" />
          <stop offset="100%" stop-color="#F97316" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Base gradient -->
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#bgGrad)" />

      <!-- Subtle ambient lighting -->
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#glowTopLeft)" />
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#glowBottomRight)" />

      <!-- Sleek outer border outline -->
      <rect x="1" y="1" width="${ogWidth - 2}" height="${ogHeight - 2}" rx="0" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.5" />
      
      <!-- Subtle architectural accent lines -->
      <line x1="80" y1="48" x2="1120" y2="48" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
      <line x1="80" y1="582" x2="1120" y2="582" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" />
    </svg>
  `;

  const svgTextOverlay = `
    <svg width="${ogWidth}" height="${ogHeight}" viewBox="0 0 ${ogWidth} ${ogHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .badge {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .title {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -0.025em;
          fill: #FFFFFF;
        }
        .description {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 17px;
          font-weight: 400;
          line-height: 1.5;
          fill: #94A3B8;
        }
        .pill-text {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          font-weight: 600;
          fill: #CBD5E1;
        }
      </style>

      <!-- Category Tagline Badge -->
      <rect x="80" y="86" width="166" height="30" rx="15" fill="rgba(186, 27, 29, 0.28)" stroke="rgba(251, 146, 60, 0.55)" stroke-width="1" />
      <text x="163" y="106" text-anchor="middle" class="badge" fill="#FED7AA">CONNECT &amp; RELAX</text>

      <!-- Main Headline -->
      <text x="80" y="278" class="title">A Smarter, More</text>
      <text x="80" y="332" class="title">Connected Community.</text>

      <!-- Supporting description -->
      <text x="80" y="386" class="description">Your connected hub for local updates, reporting issues,</text>
      <text x="80" y="414" class="description">discovering services and supporting your neighbourhood.</text>

      <!-- Township Feature Badges -->
      <g transform="translate(80, 476)">
        <rect x="0" y="0" width="136" height="36" rx="8" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <text x="68" y="23" text-anchor="middle" class="pill-text">Resilience Map</text>

        <rect x="148" y="0" width="150" height="36" rx="8" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <text x="223" y="23" text-anchor="middle" class="pill-text">Circular Exchange</text>

        <rect x="310" y="0" width="138" height="36" rx="8" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <text x="379" y="23" text-anchor="middle" class="pill-text">Local Services</text>
      </g>
    </svg>
  `;

  // Scale Logo Header (x: 80, y: 136)
  const logoBuffer = await sharp(logoHeaderPath)
    .resize({ width: 340 })
    .png()
    .toBuffer();

  // Scale Mockup (x: 620, y: 92)
  const mockupBuffer = await sharp(heroMockupPath)
    .resize({ width: 530 })
    .png()
    .toBuffer();

  const ogPath = 'public/nadikomuniti/og/og-image.png';
  await sharp(Buffer.from(svgBackground))
    .composite([
      { input: logoBuffer, left: 80, top: 136 },
      { input: Buffer.from(svgTextOverlay), left: 0, top: 0 },
      { input: mockupBuffer, left: 620, top: 92 },
    ])
    .png({ quality: 95 })
    .toFile(ogPath);

  // Also write to src/app/opengraph-image.png so Next.js auto-generates opengraph-image route!
  fs.copyFileSync(ogPath, 'src/app/opengraph-image.png');
  fs.copyFileSync(ogPath, 'public/og-image.png');
  console.log('✓ Generated public/nadikomuniti/og/og-image.png and src/app/opengraph-image.png (1200x630)');

  // Also copy all generated assets to artifact dir for visual inspection
  const artifactDir = 'C:\\Users\\shams\\.gemini\\antigravity-ide\\brain\\3bfcbe22-f13b-494f-be48-b56dd34556f3';
  fs.copyFileSync(ogPath, path.join(artifactDir, 'phase03_og_image_preview.png'));
  fs.copyFileSync('public/icons/icon-192.png', path.join(artifactDir, 'phase03_icon_192.png'));
  fs.copyFileSync('public/icons/icon-512.png', path.join(artifactDir, 'phase03_icon_512.png'));
  fs.copyFileSync('public/icons/apple-touch-icon.png', path.join(artifactDir, 'phase03_apple_touch_icon.png'));
  console.log('✓ Copied preview artifacts to artifact directory');

  console.log('\nAll branding, favicon and icon assets generated successfully!');
}

run().catch(console.error);
