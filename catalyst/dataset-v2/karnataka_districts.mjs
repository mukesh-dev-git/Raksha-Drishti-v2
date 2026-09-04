// -----------------------------------------------------------------------------
// karnataka_districts.mjs — P1.7. The single source of truth for Karnataka's
// real districts, added 2026-09-01 when the seed went from 8 districts to all
// 31.
//
// WHY THIS MODULE EXISTS. Before P1.7 the district facts were scattered across
// four files that each had to agree by hand: lookups.json (District/Unit/Court/
// Employee rows), geo_time.mjs (STATION_LOCALITIES), bulk_cases.mjs
// (DISTRICT_WEIGHTS) and build_seed.mjs (DISTRICT_PIN_PREFIX). At 8 districts
// that was tolerable; at 31 it is four places to silently drift. Everything
// district-shaped now derives from the one table below.
//
// WHAT IS REAL HERE, AND WHAT IS NOT:
//   - District names, DistrictIDs, and the 31-district roster: REAL. Karnataka
//     has 31 districts (Vijayanagara was carved out of Ballari in Oct 2021 and
//     is the 31st). IDs 4401-4408 are unchanged from the original 8 so no
//     existing CaseMasterID/CrimeNo/PersonID is renumbered - 4409-4431 are new.
//   - Locality names and coordinates: REAL Karnataka places (taluk
//     headquarters and towns that genuinely sit inside the named district),
//     hand-checked against their real positions. This matters more than it
//     sounds: geo_time.mjs's placeIncident() scatters incidents around these
//     points, so a wrong coordinate puts a real FIR in the wrong district, or
//     in the Arabian Sea. Same standard the original 8 districts' localities
//     were held to.
//   - Police station NAMES and UnitIDs: ILLUSTRATIVE, not the real KSP station
//     roster. Karnataka has ~1,000 police stations; this seeds two per new
//     district (one town, one rural) named after the real town they'd police.
//     A real deployment reads the real Unit table from CCTNS.
//   - `weight`: calibrated against real 2024 KSP IPC crime data
//     (ka-district-ipc-2024.csv), scaled so Bengaluru Urban ≈ 120. KSP
//     commissionerates are merged into their parent revenue districts
//     (see calibrate.mjs for the full mapping). The distribution is
//     realistic but still synthetic — never present per-district totals
//     from this seed as real Karnataka crime statistics.
//
// NOTE ON POLICE vs REVENUE DISTRICTS: KSP's police units don't map 1:1 onto
// revenue districts - Bengaluru City is its own commissionerate, as are
// Hubballi-Dharwad, Mysuru City, Mangaluru City and Belagavi City. This table
// models REVENUE districts, which is what the FIR schema's DistrictID actually
// keys on and what every district-level view in the app already assumes.
// Modelling commissionerates separately is a real refinement, deliberately out
// of scope here.
// -----------------------------------------------------------------------------

/**
 * All 31 real Karnataka districts.
 *
 * `stations` is populated ONLY for the 23 districts added by P1.7. The
 * original 8 (4401-4408) keep their hand-tuned station localities in
 * geo_time.mjs's STATION_LOCALITIES exactly as they were - deliberately not
 * re-transcribed here, because those coordinates were already verified live
 * (P1.3) and copying them for tidiness would risk breaking working data for
 * no gain. geo_time.mjs merges the two sources.
 */
export const KA_DISTRICTS = [
  // --- the original 8 (IDs unchanged; localities live in geo_time.mjs) ------
  { id: 4401, name: "Bengaluru Urban", slug: "bengaluru", pinPrefix: "560", weight: 120, stations: [] },
  { id: 4402, name: "Mysuru", slug: "mysuru", pinPrefix: "570", weight: 12, stations: [] },
  { id: 4403, name: "Belagavi", slug: "belagavi", pinPrefix: "590", weight: 12, stations: [] },
  { id: 4404, name: "Kalaburagi", slug: "kalaburagi", pinPrefix: "585", weight: 9, stations: [] },
  { id: 4405, name: "Dakshina Kannada", slug: "dakshina-kannada", pinPrefix: "575", weight: 6, stations: [] },
  { id: 4406, name: "Tumakuru", slug: "tumakuru", pinPrefix: "572", weight: 11, stations: [] },
  { id: 4407, name: "Ballari", slug: "ballari", pinPrefix: "583", weight: 5, stations: [] },
  { id: 4408, name: "Shivamogga", slug: "shivamogga", pinPrefix: "577", weight: 9, stations: [] },

  // --- the 23 added by P1.7 -------------------------------------------------
  {
    id: 4409, name: "Bagalkote", slug: "bagalkote", pinPrefix: "587", weight: 4,
    stations: [
      { id: 440901, name: "Bagalkote Town PS", spreadKm: 1.5, localities: [
        ["Bagalkote", 16.1848, 75.6961], ["Navanagar", 16.1700, 75.6600], ["Vidyagiri", 16.1950, 75.7000],
      ]},
      { id: 440902, name: "Jamkhandi Rural PS", spreadKm: 5.0, localities: [
        ["Jamkhandi", 16.5047, 75.2919], ["Badami", 15.9149, 75.6767],
        ["Mudhol", 16.3333, 75.2833], ["Bilagi", 16.3450, 75.6150],
      ]},
    ],
  },
  {
    id: 4410, name: "Bengaluru Rural", slug: "bengaluru-rural", pinPrefix: "562", weight: 10,  // estimated from Bengaluru Dist
    stations: [
      { id: 441001, name: "Devanahalli PS", spreadKm: 2.5, localities: [
        ["Devanahalli", 13.2437, 77.7085], ["Vijayapura", 13.3167, 77.7833], ["Doddaballapura", 13.2957, 77.5382],
      ]},
      { id: 441002, name: "Hoskote Rural PS", spreadKm: 4.0, localities: [
        ["Hoskote", 13.0707, 77.7981], ["Nelamangala", 13.0996, 77.3936],
      ]},
    ],
  },
  {
    id: 4411, name: "Bidar", slug: "bidar", pinPrefix: "585", weight: 6,
    stations: [
      { id: 441101, name: "Bidar Town PS", spreadKm: 1.5, localities: [
        ["Bidar", 17.9106, 77.5199], ["Naubad", 17.9250, 77.5000],
      ]},
      { id: 441102, name: "Basavakalyan Rural PS", spreadKm: 5.0, localities: [
        ["Basavakalyan", 17.8746, 76.9490], ["Bhalki", 18.0433, 77.2064],
        ["Humnabad", 17.7700, 77.1300], ["Aurad", 18.2560, 77.2200],
      ]},
    ],
  },
  {
    id: 4412, name: "Chamarajanagar", slug: "chamarajanagar", pinPrefix: "571", weight: 4,
    stations: [
      { id: 441201, name: "Chamarajanagar Town PS", spreadKm: 1.5, localities: [
        ["Chamarajanagar", 11.9261, 76.9438], ["Santhemarahalli", 11.9800, 76.8700],
      ]},
      { id: 441202, name: "Kollegal Rural PS", spreadKm: 5.0, localities: [
        ["Kollegal", 12.1540, 77.1103], ["Gundlupet", 11.8113, 76.6905],
        ["Yelandur", 12.0500, 77.0333], ["Hanur", 12.0900, 77.2600],
      ]},
    ],
  },
  {
    id: 4413, name: "Chikkaballapura", slug: "chikkaballapura", pinPrefix: "562", weight: 6,
    stations: [
      { id: 441301, name: "Chikkaballapura Town PS", spreadKm: 1.5, localities: [
        ["Chikkaballapura", 13.4355, 77.7315], ["Nandi Hills", 13.3702, 77.6835],
      ]},
      { id: 441302, name: "Chintamani Rural PS", spreadKm: 5.0, localities: [
        ["Chintamani", 13.4000, 78.0500], ["Sidlaghatta", 13.3900, 77.8600],
        ["Gauribidanur", 13.6100, 77.5200], ["Bagepalli", 13.7833, 77.7833],
      ]},
    ],
  },
  {
    id: 4414, name: "Chikkamagaluru", slug: "chikkamagaluru", pinPrefix: "577", weight: 5,
    stations: [
      { id: 441401, name: "Chikkamagaluru Town PS", spreadKm: 1.8, localities: [
        ["Chikkamagaluru", 13.3161, 75.7720], ["Mudigere", 13.1333, 75.6333],
      ]},
      { id: 441402, name: "Kadur Rural PS", spreadKm: 5.0, localities: [
        ["Kadur", 13.5533, 76.0114], ["Tarikere", 13.7100, 75.8150],
        ["Sringeri", 13.4167, 75.2500], ["Koppa", 13.5333, 75.3667],
      ]},
    ],
  },
  {
    id: 4415, name: "Chitradurga", slug: "chitradurga", pinPrefix: "577", weight: 9,
    stations: [
      { id: 441501, name: "Chitradurga Town PS", spreadKm: 1.5, localities: [
        ["Chitradurga", 14.2251, 76.3980], ["Turuvanur", 14.2000, 76.4700],
      ]},
      { id: 441502, name: "Hiriyur Rural PS", spreadKm: 5.5, localities: [
        ["Hiriyur", 13.9450, 76.6180], ["Challakere", 14.3167, 76.6500],
        ["Hosadurga", 13.7950, 76.2800], ["Holalkere", 14.0450, 76.1850],
      ]},
    ],
  },
  {
    id: 4416, name: "Davanagere", slug: "davanagere", pinPrefix: "577", weight: 7,
    stations: [
      { id: 441601, name: "Davanagere City PS", spreadKm: 1.8, localities: [
        ["Davanagere", 14.4644, 75.9218], ["Vidyanagar", 14.4500, 75.9400], ["Nittuvalli", 14.4400, 75.9000],
      ]},
      { id: 441602, name: "Harihar Rural PS", spreadKm: 5.0, localities: [
        ["Harihar", 14.5127, 75.8065], ["Channagiri", 14.0242, 75.9247],
        ["Honnali", 14.2400, 75.6450], ["Jagalur", 14.5200, 76.3400],
      ]},
    ],
  },
  {
    id: 4417, name: "Dharwad", slug: "dharwad", pinPrefix: "580", weight: 7,
    stations: [
      { id: 441701, name: "Hubballi City PS", spreadKm: 2.0, localities: [
        ["Hubballi", 15.3647, 75.1240], ["Gokul Road", 15.3500, 75.1000], ["Keshwapur", 15.3600, 75.1300],
      ]},
      { id: 441702, name: "Dharwad Rural PS", spreadKm: 4.5, localities: [
        ["Dharwad", 15.4589, 75.0078], ["Kalghatgi", 15.1833, 74.9667],
        ["Navalgund", 15.5600, 75.3600], ["Kundgol", 15.2600, 75.2500],
      ]},
    ],
  },
  {
    id: 4418, name: "Gadag", slug: "gadag", pinPrefix: "582", weight: 3,
    stations: [
      { id: 441801, name: "Gadag Town PS", spreadKm: 1.5, localities: [
        ["Gadag", 15.4315, 75.6355], ["Betageri", 15.4200, 75.6200],
      ]},
      { id: 441802, name: "Ron Rural PS", spreadKm: 5.0, localities: [
        ["Ron", 15.6950, 75.7350], ["Naragund", 15.7200, 75.3900],
        ["Mundargi", 15.2050, 75.8850], ["Shirhatti", 15.2300, 75.5800],
      ]},
    ],
  },
  {
    id: 4419, name: "Hassan", slug: "hassan", pinPrefix: "573", weight: 8,
    stations: [
      { id: 441901, name: "Hassan Town PS", spreadKm: 1.8, localities: [
        ["Hassan", 13.0072, 76.0962], ["Hemavathi Nagar", 13.0200, 76.1100],
      ]},
      { id: 441902, name: "Arsikere Rural PS", spreadKm: 5.5, localities: [
        ["Arsikere", 13.3140, 76.2570], ["Channarayapatna", 12.9070, 76.3880],
        ["Belur", 13.1650, 75.8650], ["Sakleshpur", 12.9430, 75.7860],
        ["Holenarasipura", 12.7870, 76.2470],
      ]},
    ],
  },
  {
    id: 4420, name: "Haveri", slug: "haveri", pinPrefix: "581", weight: 6,
    stations: [
      { id: 442001, name: "Haveri Town PS", spreadKm: 1.5, localities: [
        ["Haveri", 14.7935, 75.4044], ["Devagiri", 14.8100, 75.3900],
      ]},
      { id: 442002, name: "Ranebennur Rural PS", spreadKm: 5.0, localities: [
        ["Ranebennur", 14.6210, 75.6290], ["Byadgi", 14.6720, 75.4870],
        ["Hirekerur", 14.4520, 75.3950], ["Savanur", 14.9700, 75.3400],
        ["Hangal", 14.7660, 75.1230],
      ]},
    ],
  },
  {
    id: 4421, name: "Kodagu", slug: "kodagu", pinPrefix: "571", weight: 3,
    stations: [
      { id: 442101, name: "Madikeri Town PS", spreadKm: 2.0, localities: [
        ["Madikeri", 12.4244, 75.7382], ["Napoklu", 12.3900, 75.6600],
      ]},
      { id: 442102, name: "Virajpet Rural PS", spreadKm: 5.0, localities: [
        ["Virajpet", 12.1960, 75.8050], ["Somwarpet", 12.5960, 75.8560],
        ["Kushalnagar", 12.4570, 75.9600], ["Gonikoppal", 12.2200, 75.8500],
      ]},
    ],
  },
  {
    id: 4422, name: "Kolar", slug: "kolar", pinPrefix: "563", weight: 6,
    stations: [
      { id: 442201, name: "Kolar Town PS", spreadKm: 1.8, localities: [
        ["Kolar", 13.1367, 78.1292], ["Kolar Gold Fields", 12.9560, 78.2750],
      ]},
      { id: 442202, name: "Bangarapet Rural PS", spreadKm: 5.0, localities: [
        ["Bangarapet", 12.9910, 78.1780], ["Malur", 13.0040, 77.9370],
        ["Mulbagal", 13.1650, 78.3930], ["Srinivaspur", 13.3400, 78.2100],
      ]},
    ],
  },
  {
    id: 4423, name: "Koppal", slug: "koppal", pinPrefix: "583", weight: 4,
    stations: [
      { id: 442301, name: "Koppal Town PS", spreadKm: 1.5, localities: [
        ["Koppal", 15.3547, 76.1544], ["Bhagyanagar", 15.3300, 76.1700],
      ]},
      { id: 442302, name: "Gangavathi Rural PS", spreadKm: 5.0, localities: [
        ["Gangavathi", 15.4310, 76.5290], ["Kushtagi", 15.7570, 76.1900],
        ["Yelburga", 15.6150, 76.0100], ["Kanakagiri", 15.5600, 76.4200],
      ]},
    ],
  },
  {
    id: 4424, name: "Mandya", slug: "mandya", pinPrefix: "571", weight: 7,
    stations: [
      { id: 442401, name: "Mandya Town PS", spreadKm: 1.8, localities: [
        ["Mandya", 12.5218, 76.8951], ["Vidyanagar", 12.5400, 76.9100],
      ]},
      { id: 442402, name: "Maddur Rural PS", spreadKm: 5.0, localities: [
        ["Maddur", 12.5830, 77.0430], ["Malavalli", 12.3830, 77.0610],
        ["Srirangapatna", 12.4180, 76.6940], ["Pandavapura", 12.5030, 76.6690],
        ["Nagamangala", 12.8170, 76.7560],
      ]},
    ],
  },
  {
    id: 4425, name: "Raichur", slug: "raichur", pinPrefix: "584", weight: 8,
    stations: [
      { id: 442501, name: "Raichur Town PS", spreadKm: 1.8, localities: [
        ["Raichur", 16.2076, 77.3463], ["Ashapur", 16.2200, 77.3600],
      ]},
      { id: 442502, name: "Sindhanur Rural PS", spreadKm: 5.5, localities: [
        ["Sindhanur", 15.7680, 76.7560], ["Manvi", 15.9910, 77.0490],
        ["Devadurga", 16.4180, 76.9350], ["Lingsugur", 16.1580, 76.5210],
      ]},
    ],
  },
  {
    id: 4426, name: "Ramanagara", slug: "ramanagara", pinPrefix: "562", weight: 6,
    stations: [
      { id: 442601, name: "Ramanagara Town PS", spreadKm: 1.8, localities: [
        ["Ramanagara", 12.7217, 77.2812], ["Ijoor", 12.7000, 77.3000],
      ]},
      { id: 442602, name: "Channapatna Rural PS", spreadKm: 4.5, localities: [
        ["Channapatna", 12.6510, 77.2070], ["Kanakapura", 12.5460, 77.4200],
        ["Magadi", 12.9570, 77.2260], ["Harohalli", 12.6600, 77.4700],
      ]},
    ],
  },
  {
    id: 4427, name: "Udupi", slug: "udupi", pinPrefix: "576", weight: 4,
    stations: [
      { id: 442701, name: "Udupi Town PS", spreadKm: 2.0, localities: [
        ["Udupi", 13.3409, 74.7421], ["Manipal", 13.3525, 74.7868], ["Malpe", 13.3500, 74.7050],
      ]},
      { id: 442702, name: "Kundapura Rural PS", spreadKm: 5.0, localities: [
        ["Kundapura", 13.6250, 74.6920], ["Karkala", 13.2150, 74.9900],
        ["Brahmavar", 13.4300, 74.7450], ["Byndoor", 13.8670, 74.6330],
      ]},
    ],
  },
  {
    id: 4428, name: "Uttara Kannada", slug: "uttara-kannada", pinPrefix: "581", weight: 5,
    stations: [
      { id: 442801, name: "Karwar Town PS", spreadKm: 2.0, localities: [
        ["Karwar", 14.8136, 74.1297], ["Baithkol", 14.8000, 74.1200],
      ]},
      { id: 442802, name: "Sirsi Rural PS", spreadKm: 6.0, localities: [
        ["Sirsi", 14.6200, 74.8350], ["Bhatkal", 13.9850, 74.5550],
        ["Kumta", 14.4260, 74.4180], ["Honnavar", 14.2800, 74.4450],
        ["Dandeli", 15.2670, 74.6170], ["Ankola", 14.6600, 74.3000],
      ]},
    ],
  },
  {
    id: 4429, name: "Vijayapura", slug: "vijayapura", pinPrefix: "586", weight: 7,
    stations: [
      { id: 442901, name: "Vijayapura City PS", spreadKm: 1.8, localities: [
        ["Vijayapura", 16.8302, 75.7100], ["Gol Gumbaz", 16.8270, 75.7360], ["Jalanagar", 16.8100, 75.7200],
      ]},
      { id: 442902, name: "Indi Rural PS", spreadKm: 5.5, localities: [
        ["Indi", 17.1770, 75.9500], ["Basavana Bagevadi", 16.5730, 75.9720],
        ["Sindagi", 16.9200, 76.2340], ["Muddebihal", 16.3380, 76.1330],
        ["Talikoti", 16.4700, 76.3100],
      ]},
    ],
  },
  {
    id: 4430, name: "Vijayanagara", slug: "vijayanagara", pinPrefix: "583", weight: 5,
    stations: [
      { id: 443001, name: "Hosapete Town PS", spreadKm: 1.8, localities: [
        ["Hosapete", 15.2689, 76.3909], ["Hampi", 15.3350, 76.4600],
      ]},
      { id: 443002, name: "Kudligi Rural PS", spreadKm: 5.5, localities: [
        ["Kudligi", 14.9040, 76.3850], ["Hagaribommanahalli", 15.0400, 76.2000],
        ["Harapanahalli", 14.7900, 75.9900], ["Huvina Hadagali", 15.0400, 75.9500],
      ]},
    ],
  },
  {
    id: 4431, name: "Yadgir", slug: "yadgir", pinPrefix: "585", weight: 4,
    stations: [
      { id: 443101, name: "Yadgir Town PS", spreadKm: 1.5, localities: [
        ["Yadgir", 16.7700, 77.1376], ["Yadgir Extension", 16.7800, 77.1500],
      ]},
      { id: 443102, name: "Shahapur Rural PS", spreadKm: 5.5, localities: [
        ["Shahapur", 16.6980, 76.8420], ["Shorapur", 16.5200, 76.7570],
        ["Gurmitkal", 16.8600, 77.3900], ["Hunasagi", 16.3800, 76.6300],
      ]},
    ],
  },
];

/** The 23 districts P1.7 added - the ones that carry `stations` here. */
export const NEW_DISTRICTS = KA_DISTRICTS.filter((d) => d.stations.length > 0);

/** `{ [DistrictID]: pinPrefix }` for build_seed.mjs's synthetic addresses. */
export const DISTRICT_PIN_PREFIX = Object.fromEntries(
  KA_DISTRICTS.map((d) => [d.id, d.pinPrefix])
);

/** `[[DistrictID, weight], ...]` for bulk_cases.mjs's pickWeighted(). */
export const DISTRICT_WEIGHTS = KA_DISTRICTS.map((d) => [d.id, d.weight]);

/** STATION_LOCALITIES-shaped entries for the new districts' stations only -
 *  geo_time.mjs merges these over its own hand-tuned table for 4401-4408. */
export const NEW_STATION_LOCALITIES = Object.fromEntries(
  NEW_DISTRICTS.flatMap((d) =>
    d.stations.map((s) => [s.id, { spreadKm: s.spreadKm, localities: s.localities }])
  )
);
