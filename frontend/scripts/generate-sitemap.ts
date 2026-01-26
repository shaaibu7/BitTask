// This is a placeholder script for sitemap generation
// Usage: ts-node scripts/generate-sitemap.ts

import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://bittask.app';
const PAGES_DIR = path.join(process.cwd(), 'app');

console.log(`Generating sitemap for ${BASE_URL}...`);

// Mock generation logic
const staticPages = [
    '',
    '/marketplace',
    '/create',
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${staticPages
        .map((route) => {
            return `
    <url>
        <loc>${BASE_URL}${route}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>
        `;
        })
        .join('')}
</urlset>
`;

// fs.writeFileSync('public/sitemap.xml', sitemap);
console.log('Sitemap generated!');
