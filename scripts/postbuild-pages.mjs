import fs from 'node:fs';
import path from 'node:path';

const docsDir = path.resolve(process.cwd(), 'docs');
const indexPath = path.join(docsDir, 'index.html');
const manifestPath = path.join(docsDir, 'manifest.json');
const nojekyllPath = path.join(docsDir, '.nojekyll');

// 1. Ensure .nojekyll exists for _expo/ static bundle serving
fs.writeFileSync(nojekyllPath, '');

// 2. Write fullscreen PWA manifest so Home Screen install launches without toolbars
const manifest = {
  name: 'VetoID — NZ 18+ ID Scanner',
  short_name: 'VetoID',
  start_url: '/_vetoid/',
  scope: '/_vetoid/',
  display: 'fullscreen',
  orientation: 'portrait',
  background_color: '#000000',
  theme_color: '#000000',
  description:
    'Zero-retention on-device 18+ ID verification for New Zealand hospitality venues.',
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// 3. Preserve/write public Privacy Policy & Support pages required by Google Play & Apple App Store
for (const page of ['privacy.html', 'support.html']) {
  const src = path.resolve(process.cwd(), page);
  const dst = path.join(docsDir, page);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
  }
}

// 4. Inject full-screen mobile/iOS PWA meta tags into docs/index.html
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const pwaMeta = [
    '<meta name="theme-color" content="#000000" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '<meta name="apple-mobile-web-app-title" content="VetoID" />',
    '<link rel="manifest" href="/_vetoid/manifest.json" />',
  ].join('\n    ');

  if (!html.includes('apple-mobile-web-app-capable')) {
    html = html.replace('</head>', `    ${pwaMeta}\n  </head>`);
    fs.writeFileSync(indexPath, html);
  }
}

console.log('Post-build PWA fullscreen manifest & meta tags applied.');
