// GET /api/tally/   votes per idea, plus agent and office counts, for the booth screen.
// Names and comments stay out of it; those are on the results page only.

const { ballots, tally, fail } = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }
  try {
    const result = tally(await ballots());
    // Every booth screen polls this; a few seconds of edge cache keeps the store quiet.
    res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=10');
    return res.status(200).json(result);
  } catch (error) {
    return fail(res, error);
  }
};
