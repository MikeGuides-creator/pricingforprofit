import { readFileSync, writeFileSync } from 'node:fs';
import { request } from 'undici';
import { glob } from 'glob';

const site = process.env.SITE_ORIGIN; // https://mikeguides.co
const brand = process.env.BRAND_VOICE || '';

// 1) Choose candidate pages (simple heuristic for Phase-1):
//    Prefer index.html and product pages under /products/**
const candidates = (await glob(['**/index.html','**/products/**/*.html','!node_modules/**','!reports/**'])).slice(0,8);

function setMeta(html, { title, description }) {
  // Replace <title>..</title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  // Replace or insert meta description
  if (/<meta[^>]*name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta[^>]*name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);
  } else {
    html = html.replace(/<head>/i, `<head>\n  <meta name="description" content="${description}">`);
  }
  return html;
}

async function suggestFor(file) {
  const src = readFileSync(file, 'utf8');
  const url = new URL(file.replace(/^index.html$/, ''), site).href;
  const prompt = `You are an SEO editor for MikeGuides. Keep tone clear, confident, non-hype.\n`+
                 `Propose a <title> (<= 60 chars) and meta description (<= 155 chars) to improve CTR for: ${url}.\n`+
                 `Return JSON: {"title":"...","description":"..."}`;

  // NOTE: Plug in your model endpoint if desired. For Phase‑1 template, fake a minimal editor using heuristics.
  const title = src.match(/<h1[^>]*>([^<]{10,80})<\/h1>/i)?.[1]?.trim() || 'MikeGuides — Interactive Guides & Calculators';
  const description = 'Make better decisions faster with interactive guides and calculators. Practical tools, clear steps, and confident pricing.';
  return { title, description };
}

let changed = 0;
for (const f of candidates) {
  const suggestion = await suggestFor(f);
  const original = readFileSync(f, 'utf8');
  let updated = setMeta(original, suggestion);

  // Minimal diff cap: only allow changes within head
  const headOnly = /<head[\s\S]*?<\/head>/i.test(original) && /<head[\s\S]*?<\/head>/i.test(updated);
  if (!headOnly) continue;
  if (updated !== original) {
    writeFileSync(f, updated);
    changed++;
  }
}

console.log(`Updated on-page meta in ${changed} files.`);
