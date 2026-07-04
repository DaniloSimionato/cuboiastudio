import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as icons from 'simple-icons';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '..', 'public', 'app-icons');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// ── Overrides / Custom Multi-Colored Logos ─────────────────────────────
const overrides = {
  'google-calendar.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#FFF"/>
  <path d="M10 6v36h28V6H10Zm19.5 28.5c0 1.9-1.6 3.5-3.5 3.5s-3.5-1.6-3.5-3.5V15h7v19.5Z" fill="#4285F4"/>
  <path d="M10 6v12h28V6H10Z" fill="#34A853"/>
  <path d="M38 18H10v4h28v-4Z" fill="#EA4335"/>
  <path d="M10 22h7v16H10V22Z" fill="#FBBC05"/>
</svg>
  `.trim(),

  'gmail.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#FFF"/>
  <path d="M6 10v28h36V10H6Zm31 4L24 23.5 11 14h26ZM9 15.5l15 11 15-11V35H9V15.5Z" fill="#EA4335"/>
</svg>
  `.trim(),

  'google-sheets.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#107C41"/>
  <path d="M12 8h24v32H12V8Z" fill="#107C41"/>
  <path d="M16 14h16v4H16v-4Zm0 6h16v4H16v-4Zm0 6h16v4H16v-4Zm0 6h16v4H16v-4Z" fill="white"/>
  <path d="M24 8v32M12 20h24M12 26h24M12 32h24" stroke="#107C41" strokeWidth="1.5"/>
</svg>
  `.trim(),

  'google-docs.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#2684FC"/>
  <path d="M14 10h20v28H14V10Z" fill="white"/>
  <path d="M18 16h12v2H18v-2Zm0 5h12v2H18v-2Zm0 5h12v2H18v-2Zm0 5h8v2H18v-2Z" fill="#2684FC"/>
</svg>
  `.trim(),

  'google-drive.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#FFF"/>
  <path d="M17.5 9h13l11 19H30.5L17.5 9Z" fill="#FFCC00"/>
  <path d="M5.5 29.5l7-12 11 19H12.5l-7-7Z" fill="#4285F4"/>
  <path d="M23.5 27.5l6-11 13 22H16.5l7-11Z" fill="#0F9D58"/>
</svg>
  `.trim(),

  'instagram.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="url(#ig-grad-export)"/>
  <rect x="10" y="10" width="28" height="28" rx="8" stroke="white" strokeWidth="2.5"/>
  <circle cx="24" cy="24" r="6" stroke="white" strokeWidth="2.5"/>
  <circle cx="33" cy="15" r="1.5" fill="white"/>
  <defs>
    <linearGradient id="ig-grad-export" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#FED01A"/>
      <stop offset="0.3" stopColor="#F77737"/>
      <stop offset="0.6" stopColor="#FD1D1D"/>
      <stop offset="1" stopColor="#C13584"/>
    </linearGradient>
  </defs>
</svg>
  `.trim(),

  'facebook-messenger.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#FFF"/>
  <path d="M24 6C13.52 6 5 13.88 5 23.6c0 5.54 2.74 10.49 7.03 13.65V44l6.53-3.61c1.7.48 3.49.72 5.47.72 10.52 0 19-7.88 19-17.61S34.52 6 24 6Zm2.2 22.2-4.9-5.25-9.6 5.25 10.55-11.22 4.9 5.25 9.6-5.25L26.2 28.2Z" fill="url(#msgr-grad-export)"/>
  <defs>
    <linearGradient id="msgr-grad-export" x1="5" y1="44" x2="43" y2="6" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#006FFF"/>
      <stop offset="0.5" stopColor="#7522FF"/>
      <stop offset="1" stopColor="#FF5C87"/>
    </linearGradient>
  </defs>
</svg>
  `.trim(),

  'mercado-livre.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#FFE600"/>
  <path d="M10 28c4-8 10-10 14-4s8 0 14-6M12 32c4-8 10-8 14-2s6 2 10-2" stroke="#2D3280" strokeWidth="3" strokeLinecap="round"/>
</svg>
  `.trim(),

  'slack.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#4A154B"/>
  <circle cx="16" cy="16" r="4" fill="#36C5F0"/>
  <circle cx="32" cy="16" r="4" fill="#2EB67D"/>
  <circle cx="16" cy="32" r="4" fill="#E01E5A"/>
  <circle cx="32" cy="32" r="4" fill="#ECB22E"/>
</svg>
  `.trim(),

  'webhook.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#2C3E50"/>
  <path d="M16 14h16v4H16v-4Zm0 8h16v4H16v-4Zm0 8h10v4H16v-4Z" fill="white"/>
</svg>
  `.trim(),

  'rd-station.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#0080FF"/>
  <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="4"/>
  <circle cx="24" cy="24" r="4" fill="white"/>
</svg>
  `.trim(),

  'olx.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#8E44AD"/>
  <circle cx="16" cy="24" r="6" stroke="white" strokeWidth="4"/>
  <path d="M24 16v16M32 16l6 16M38 16l-6 16" stroke="white" strokeWidth="4" strokeLinecap="round"/>
</svg>
  `.trim(),

  'pipedrive.svg': `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#00B887"/>
  <path d="M12 24h24M24 12l12 12-12 12" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
  `.trim(),
};

// Slugs mapping to Simple Icons keys
const simpleIconsMap = {
  'shopee.svg': 'siShopee',
  'whatsapp.svg': 'siWhatsapp',
  'discord.svg': 'siDiscord',
  'notion.svg': 'siNotion',
  'hubspot.svg': 'siHubspot',
  'trello.svg': 'siTrello',
  'asana.svg': 'siAsana',
  'zapier.svg': 'siZapier',
  'make.svg': 'siMake',
  'chatwoot.svg': 'siChatwoot',
};

function colorizeSimpleIcon(icon) {
  const color = `#${icon.hex}`;
  let svg = icon.svg;

  // Add fill color to the parent svg element
  if (svg.includes('fill=')) {
    svg = svg.replace(/fill="[^"]*"/g, `fill="${color}"`);
  } else {
    svg = svg.replace('<svg ', `<svg fill="${color}" `);
  }

  // Also replace fill="currentColor" inside path or svg
  svg = svg.replaceAll('fill="currentColor"', `fill="${color}"`);

  return svg;
}

// 1. Process Overrides
for (const [filename, content] of Object.entries(overrides)) {
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[Override] Created: ${filename}`);
}

// 2. Process Simple Icons
for (const [filename, iconKey] of Object.entries(simpleIconsMap)) {
  const icon = icons[iconKey];
  const filePath = path.join(targetDir, filename);

  if (icon) {
    const coloredSvg = colorizeSimpleIcon(icon);
    fs.writeFileSync(filePath, coloredSvg, 'utf8');
    console.log(`[SimpleIcons] Created: ${filename} (Hex: #${icon.hex})`);
  } else {
    // Elegant fallback if not found in simple-icons
    const fallbackColor = '#94A3B8';
    const fallbackSvg = `
<svg viewBox="0 0 24 24" fill="${fallbackColor}" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="4" fill="${fallbackColor}"/>
  <path d="M12 2L2 22h20L12 2Z" fill="white"/>
</svg>
    `.trim();
    fs.writeFileSync(filePath, fallbackSvg, 'utf8');
    console.log(`[Fallback] Created: ${filename} (SimpleIcon ${iconKey} not found)`);
  }
}

console.log('Successfully completed exporting all app icons to public/app-icons/');
