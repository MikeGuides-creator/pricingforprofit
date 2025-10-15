import { readFileSync } from 'node:fs';
import { glob } from 'glob';

const files = await glob(['**/*.html','!node_modules/**','!reports/**']);

let ok = true;
for (const f of files) {
  const t = readFileSync(f,'utf8');
  // No external script domains allowed in Phase-1 suggestions
  if (/<script[^>]+src=\"https?:\/\//i.test(t)) {
    console.log(`WARN: external script found in ${f}`);
  }
  // Basic sanity: must retain closing html and body tags
  if (!/<\/body>/i.test(t) || !/<\/html>/i.test(t)) {
    console.error(`FAIL: malformed HTML in ${f}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('Diff guard passed.');
