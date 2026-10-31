// POST /api/vote/   cast or update a vote: { voter, idea, size, kinds, why, text, pilot, name, office }
// DELETE /api/vote/ take it back: { voter, idea }
// Both answer with the new tally, so the phone can say how many agents agree.

const { KEY, IDEAS, SIZES, KINDS, redis, ballots, tally, text, fail } = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Use POST or DELETE.' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const voter = String(body.voter ?? '');
  const idea = String(body.idea ?? '');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(voter)) return res.status(400).json({ error: 'Missing voter id.' });
  if (!IDEAS.includes(idea)) return res.status(400).json({ error: 'Unknown idea.' });
  const field = `${voter}:${idea}`;

  const ballot = {
    voter,
    idea,
    name: text(body.name, 80),
    office: text(body.office, 80),
    size: SIZES.includes(body.size) ? body.size : null,
    kinds: Array.isArray(body.kinds) ? KINDS.filter(kind => body.kinds.includes(kind)) : [],
    why: text(body.why, 600),
    text: text(body.text, 300),
    pilot: body.pilot === true,
    at: new Date().toISOString(),
  };

  if (req.method === 'POST') {
    if (!ballot.name) return res.status(400).json({ error: 'Add your name.' });
    if (idea === 'other' ? !ballot.text : !ballot.size) {
      return res.status(400).json({ error: idea === 'other' ? 'Tell us what to build.' : 'Pick how many merchants.' });
    }
  }

  try {
    if (req.method === 'POST') await redis('HSET', KEY, field, JSON.stringify(ballot));
    else await redis('HDEL', KEY, field);
    return res.status(200).json(tally(await ballots()));
  } catch (error) {
    return fail(res, error);
  }
};
