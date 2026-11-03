// POST /api/vote/   send or replace a ranking:
//   { voter, ranking: [1st, 2nd, 3rd], text, size, kinds, kindsOther, industries, why, pilots, name, office, kiosk }
// DELETE /api/vote/ take it back: { voter, kiosk }
// Both answer with the new tally, so the phone can say how the agent's #1 is doing, and
// the id the ballot is filed under.
//
// One phone, one ballot: the answer sets a cookie with that id, and a later ballot from the
// same phone replaces the first even if the browser has forgotten its id. The booth tablet
// sends kiosk: true, takes a fresh id every time, and never gets the cookie.

const { KEY, IDEAS, SIZES, KINDS, PLACES, redis, ballots, tally, text, fail } = require('./_store');

const COOKIE = 'solacon2_voter';
const VOTER_ID = /^[A-Za-z0-9-]{8,64}$/;

function cookieVoter(req) {
  const match = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9-]{8,64})`));
  return match ? match[1] : null;
}

function rememberVoter(req, res, voter) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${voter}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Use POST or DELETE.' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const kiosk = body.kiosk === true;
  // The cookie's id wins over the one the page sent: that's where this phone's ballot is.
  const voter = (!kiosk && cookieVoter(req)) || String(body.voter ?? '');
  if (!VOTER_ID.test(voter)) return res.status(400).json({ error: 'Missing voter id.' });

  try {
    if (req.method === 'DELETE') {
      await redis('HDEL', KEY, voter);
      return res.status(200).json({ ...tally(await ballots()), voter });
    }

    const ranking = Array.isArray(body.ranking) ? body.ranking.map(String) : [];
    if (!ranking.length || ranking.length > PLACES || new Set(ranking).size !== ranking.length || !ranking.every(id => IDEAS.includes(id))) {
      return res.status(400).json({ error: 'Pick one to three ideas, each once.' });
    }
    const pick = list => (Array.isArray(list) ? KINDS.filter(kind => list.includes(kind)) : []);
    const kinds = pick(body.kinds);

    const ballot = {
      voter,
      ranking,
      // Their own idea, when "Something else" is in their top 3.
      text: ranking.includes('other') ? text(body.text, 300) : '',
      size: SIZES.includes(body.size) ? body.size : null,
      kinds,
      // What "other" means, when they ticked it.
      kindsOther: kinds.includes('other') ? text(body.kindsOther, 80) : '',
      // Which industries need a template, when Checkout templates is in their top 3.
      industries: ranking.includes('checkout-templates') ? pick(body.industries) : [],
      why: text(body.why, 600),
      // The picks they'd bring merchants to a pilot of.
      pilots: Array.isArray(body.pilots) ? ranking.filter(id => body.pilots.includes(id)) : [],
      name: text(body.name, 80),
      office: text(body.office, 80),
      at: new Date().toISOString(),
    };

    if (ranking.includes('other') && !ballot.text) return res.status(400).json({ error: 'Tell us what to build.' });
    if (!ballot.size) return res.status(400).json({ error: 'Pick how many merchants you work with.' });
    if (!ballot.name) return res.status(400).json({ error: 'Add your name.' });

    await redis('HSET', KEY, voter, JSON.stringify(ballot));
    if (!kiosk) rememberVoter(req, res, voter);
    return res.status(200).json({ ...tally(await ballots()), voter });
  } catch (error) {
    return fail(res, error);
  }
};
