import { google } from 'googleapis';
import { writeFileSync } from 'node:fs';

const siteUrl = process.env.GSC_SITE_URL; // e.g., 'https://mikeguides.co'
const jwt = new google.auth.JWT(
  process.env.GCP_CLIENT_EMAIL,
  undefined,
  (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/webmasters.readonly']
);
const webmasters = google.searchconsole('v1');
await jwt.authorize();

const end = new Date();
const start = new Date(Date.now() - 28*24*3600*1000);
const startPrev = new Date(Date.now() - 56*24*3600*1000);
const endPrev = new Date(Date.now() - 28*24*3600*1000);

async function query(startDate, endDate, dimensions=['page','query']) {
  const { data } = await webmasters.searchanalytics.query({
    auth: jwt,
    siteUrl,
    requestBody: { startDate: startDate.toISOString().slice(0,10), endDate: endDate.toISOString().slice(0,10), dimensions, rowLimit: 5000 }
  });
  return data.rows || [];
}

function aggregateByPage(rows) {
  const m = new Map();
  for (const r of rows) {
    const page = r.keys[0];
    const clicks = r.clicks||0, imps=r.impressions||0, pos=r.position||0;
    const v = m.get(page) || { clicks:0, imps:0, posSum:0, n:0 };
    v.clicks += clicks; v.imps += imps; v.posSum += pos; v.n += 1;
    m.set(page, v);
  }
  return [...m.entries()].map(([page, v]) => ({ page, clicks:v.clicks, impressions:v.imps, ctr: v.imps? v.clicks/v.imps : 0, avgPos: v.posSum/v.n }));
}

const rows = await query(start, end, ['page','query']);
const prev = await query(startPrev, endPrev, ['page','query']);
const nowAgg = aggregateByPage(rows);
const prevAgg = aggregateByPage(prev);
const prevMap = new Map(prevAgg.map(p => [p.page, p]));

const declines = nowAgg
  .map(p => ({ ...p, deltaClicks: p.clicks - (prevMap.get(p.page)?.clicks||0), deltaCTR: p.ctr - (prevMap.get(p.page)?.ctr||0) }))
  .filter(p => p.deltaClicks < 0 || p.deltaCTR < -0.02)
  .sort((a,b) => a.deltaCTR - b.deltaCTR);

let md = `# GSC Insights (${start.toISOString().slice(0,10)} → ${end.toISOString().slice(0,10)})\n\n`;
md += `## Priority pages (declining clicks/CTR)\n`;
if (!declines.length) md += "- None 🎉\n";
else declines.slice(0,20).forEach(p => { md += `- ${p.page}\n  - clicks: ${p.clicks} (${p.deltaClicks>=0?'+':''}${p.deltaClicks}) CTR: ${(p.ctr*100).toFixed(1)}% (${(p.deltaCTR*100).toFixed(1)}pp)\n`; });

writeFileSync('gsc-insights.md', md);
