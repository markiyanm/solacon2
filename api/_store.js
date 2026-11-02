// Shared by the What's next vote functions. Files starting with _ aren't routes.
//
// Each agent sends one ballot: their top three ideas, in order. Ballots live in one Redis
// hash, one field per phone, so sending again replaces the last one. The store is Upstash
// Redis, added to the Vercel project from its Storage tab, which sets the REST URL and token.

const crypto = require('crypto');

const KEY = 'solacon2:whats-next:rankings';

const IDEAS = ['clerk-pos', 'terminal', 'bnpl', 'cash-advance', 'checkout-templates', 'otc-cards', 'other'];
// How many merchants the agent works with, and what kinds.
const SIZES = ['few', 'dozens', 'many'];
const KINDS = ['retail', 'restaurant', 'grocery', 'pharmacy', 'medical', 'auto', 'services', 'ecommerce', 'nonprofit', 'other'];

class StoreMissing extends Error {}

async function redis(...command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new StoreMissing('No vote store is connected.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `Store returned ${response.status}`);
  return data.result;
}

async function ballots() {
  const flat = (await redis('HGETALL', KEY)) || [];
  const list = [];
  for (let i = 1; i < flat.length; i += 2) {
    try { list.push(JSON.parse(flat[i])); } catch { /* skip a damaged entry */ }
  }
  return list;
}

// A #1 pick is worth 3 points, #2 is 2, and #3 is 1.
const PLACES = 3;

// What the booth shows: points per idea and how often it was picked 1st, 2nd, and 3rd,
// and how many agents and offices took part.
function tally(list) {
  const ideas = Object.fromEntries(IDEAS.map(id => [id, { points: 0, places: Array(PLACES).fill(0) }]));
  const agents = new Set();
  const offices = new Set();
  list.forEach(b => {
    (b.ranking || []).slice(0, PLACES).forEach((id, place) => {
      if (!(id in ideas)) return;
      ideas[id].places[place]++;
      ideas[id].points += PLACES - place;
    });
    agents.add(b.voter);
    // Office is optional; agents who skip it count as agents but not as an office.
    const office = (b.office || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (office) offices.add(office);
  });
  return { ideas, agents: agents.size, offices: offices.size };
}

// Free text is trimmed and capped, and anything shaped like a card number is dropped.
function text(value, max) {
  return String(value ?? '')
    .replace(/\b(?:\d[ -]?){12,18}\d\b/g, '[number removed]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Compares the results key without leaking its length or contents through timing.
function sameSecret(given, expected) {
  const hash = value => crypto.createHash('sha256').update(String(value)).digest();
  return crypto.timingSafeEqual(hash(given), hash(expected));
}

function fail(res, error) {
  if (error instanceof StoreMissing) return res.status(503).json({ error: "Voting isn't connected yet." });
  console.error(error);
  return res.status(502).json({ error: "Couldn't reach the vote store." });
}

module.exports = { KEY, IDEAS, SIZES, KINDS, PLACES, redis, ballots, tally, text, sameSecret, fail };
