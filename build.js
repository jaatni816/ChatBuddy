const fs = require('fs');
const path = require('path');

const domain = process.env.DOMAIN || 'http://localhost:3000';
const baseDomain = domain.replace(/\/$/, '');

const files = [
  { path: path.join(__dirname, 'public', 'index.html'), patterns: [/http:\/\/localhost:3000\//g] },
  { path: path.join(__dirname, 'public', 'sitemap.xml'), patterns: [/http:\/\/localhost:3000\//g] },
  { path: path.join(__dirname, 'public', 'robots.txt'), patterns: [/http:\/\/localhost:3000\//g] }
];

for (const file of files) {
  if (fs.existsSync(file.path)) {
    let content = fs.readFileSync(file.path, 'utf8');
    for (const pattern of file.patterns) {
      content = content.replace(pattern, baseDomain + '/');
    }
    fs.writeFileSync(file.path, content, 'utf8');
    console.log(`Updated ${path.basename(file.path)} with DOMAIN: ${domain}`);
  }
}