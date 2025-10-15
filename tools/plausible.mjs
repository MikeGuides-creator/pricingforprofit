import { request } from 'undici';
import { writeFileSync } from 'node:fs';

const domain = process.env.PLAUSIBLE_DOMAIN; // 'mikeguides.co'
const token  = process.env.PLAUSIBLE_TOKEN;

async function api(path, search) {
  const u = new URL(`https://plausible.io/api/v1/${path}`);
  Object.entries(search||{}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
  const res = await request(u, { headers: { Authorization: `Bearer ${token}` }});
  return res.body.json();
}

const pages = await api('stats/breakdown', { site_id: domain, period: '30d', property: 'event:page' });
const md = [
  `# Plausible (last 30d)`,
  `## Top pages`,
  ...pages.results.slice(0,20).map(r => `- ${r['event:page']} — ${r.visitors} visitors`),
].join('\n');

writeFileSync('plausible-insights.md', md);
