// POST /api/vote/   send or replace a ranking:
//   { voter, ranking: [1st, 2nd, 3rd], text, size, kinds, industries, why, pilot, name, office }
// DELETE /api/vote/ take it back: { voter }
// Both answer with the new tally, so the phone can say how the agent's #1 is doing.

const { KEY, IDEAS, SIZES, KINDS, PLACES, redis, ballots, tally, text, fail } = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Use POST or DELETE.' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const voter = String(body.voter ?? '');
  if (!/^[A-Za-z0-9-]{8,64}$/.test(voter)) return res.status(400).json({ error: 'Missing voter id.' });

  try {
    if (req.method === 'DELETE') {
      await redis('HDEL', KEY, voter);
      return res.status(200).json(tally(await ballots()));
    }

    const ranking = Array.isArray(body.ranking) ? body.ranking.map(String) : [];
    if (!ranking.length || ranking.length > PLACES || new Set(ranking).size !== ranking.length || !ranking.every(id => IDEAS.includes(id))) {
      return res.status(400).json({ error: 'Pick one to three ideas, each once.' });
    }
    const pick = list => (Array.isArray(list) ? KINDS.filter(kind => list.includes(kind)) : []);

    const ballot = {
      voter,
      ranking,
      // Their own idea, when "Something else" is in their top 3.
      text: ranking.includes('other') ? text(body.text, 300) : '',
      size: SIZES.includes(body.size) ? body.size : null,
      kinds: pick(body.kinds),
      // Which industries need a template, when Checkout templates is in their top 3.
      industries: ranking.includes('checkout-templates') ? pick(body.industries) : [],
      why: text(body.why, 600),
      pilot: body.pilot === true,
      name: text(body.name, 80),
      office: text(body.office, 80),
      at: new Date().toISOString(),
    };

    if (ranking.includes('other') && !ballot.text) return res.status(400).json({ error: 'Tell us what to build.' });
    if (!ballot.size) return res.status(400).json({ error: 'Pick how many merchants you work with.' });
    if (!ballot.name) return res.status(400).json({ error: 'Add your name.' });

    await redis('HSET', KEY, voter, JSON.stringify(ballot));
    return res.status(200).json(tally(await ballots()));
  } catch (error) {
    return fail(res, error);
  }
};
