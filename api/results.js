// GET /api/results/   every vote, for the product team.
// Send the RESULTS_KEY from the Vercel project's environment as "Authorization: Bearer <key>".

const { ballots, tally, sameSecret, fail } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }

  const expected = process.env.RESULTS_KEY;
  if (!expected) return res.status(503).json({ error: "The results key isn't set yet." });
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!given || !sameSecret(given, expected)) return res.status(401).json({ error: "That key doesn't match." });

  try {
    const list = (await ballots()).sort((a, b) => b.at.localeCompare(a.at));
    return res.status(200).json({ ...tally(list), ballots: list });
  } catch (error) {
    return fail(res, error);
  }
};
