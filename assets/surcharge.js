// Surcharge rules shared by /surcharging/ and /surcharging/rules/, from the "Surcharge Rules"
// and "Surcharging (Sola Terminal)" pages in Confluence (Fee Rules API enrollment checks).
// Card present follows the merchant's state; card not present follows the cardholder's billing state.

// Card brand cap, and the lower caps some states set.
const SOLA_SURCHARGE_CAP = 3;
const SOLA_SURCHARGE_STATE_CAPS = { CO: 2 };

// Merchants here can't enroll, and online sales billed here aren't surcharged.
const SOLA_SURCHARGE_BLOCKED = ['CA', 'CT', 'MA', 'ME', 'PR'];

// Processors that support surcharging today.
const SOLA_SURCHARGE_PROCESSORS = ['Fiserv', 'Elavon', 'Vantiv', 'FD North (FACS)', 'Go Plus', 'Cardknox Go'];

const SOLA_STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'Washington, DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', PR: 'Puerto Rico', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
