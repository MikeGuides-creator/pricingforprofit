import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2] || 'reports/latest.json', 'utf8'));
const broken = [];

for (const p of data.results) {
  if (p.status === 404 || p.status === 0) broken.push({ url: p.url, status: p.status });
}

console.log(`# Daily Site Health (${new Date().toISOString().slice(0,10)})`);
console.log(`Start: ${data.start}  `);
console.log(`Pages crawled: ${data.crawled}`);
console.log(`\n## Broken pages (status 404/0)\n`);
if (!broken.length) console.log("- None 🎉");
else broken.slice(0,200).forEach(b => console.log(`- ${b.status} → ${b.url}`));
console.log(`\n## Notes\n- Image 404 verification with HEAD checks lands in Phase-2.`);
