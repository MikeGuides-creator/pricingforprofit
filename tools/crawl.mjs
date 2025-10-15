import { request } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';

const start = process.env.START_URL;
const maxPages = Number(process.env.MAX_PAGES || 300);

const seen = new Set();
const queue = [start];
const origin = new URL(start).origin;
const results = []; // {url, status, contentType, links:[], images:[]}

async function fetchUrl(url) {
  try {
    const res = await request(url, { maxRedirections: 2 });
    const status = res.statusCode;
    const type = res.headers['content-type'] || '';
    let body = '';
    if ((type||'').includes('text/html')) body = await res.body.text();
    return { status, type, body };
  } catch (e) {
    return { status: 0, type: '', body: '' };
  }
}

function extractLinks(html, base) {
  const links = [];
  const imgs  = [];
  html.replace(/<(a)\s[^>]*?href=["']([^"']+)["']/gi, (_, __, href) => {
    try { links.push(new URL(href, base).href); } catch {}
  });
  html.replace(/<(img)\s[^>]*?src=["']([^"']+)["']/gi,  (_, __, src)  => {
    try { imgs.push(new URL(src, base).href); } catch {}
  });
  return { links, imgs };
}

while (queue.length && seen.size < maxPages) {
  const url = queue.shift();
  if (!url || seen.has(url)) continue;
  seen.add(url);

  const { status, type, body } = await fetchUrl(url);
  let links = [], images = [];
  if ((type||'').includes('text/html') && body) {
    const { links: l, imgs } = extractLinks(body, url);
    const sameOrigin = l.filter(h => h.startsWith(origin));
    queue.push(...sameOrigin);
    links = l; images = imgs;
  }
  results.push({ url, status, contentType: type, links, images });
}

mkdirSync('reports', { recursive: true });
writeFileSync('reports/latest.json', JSON.stringify({ start, crawled: results.length, results }, null, 2));
console.log(`Crawled ${results.length} pages from ${start}`);
