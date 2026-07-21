// -----------------------------------------------------------------------------
// INVESTIGATION DATA — seeded mock generator
// -----------------------------------------------------------------------------
// Deterministic "fake but plausible" data for the Investigation Workspace
// (relationship graph, timeline, evidence, AI panel) and the Case File
// Flipbook. Everything is derived from a seeded RNG keyed by
// caseType + district (+ caseId for a specific file) so the same route
// always renders the same board, but every district / crime-type / case
// combination looks different.
//
// TODO: teammate — replace generator output with real API data, keeping
// the same shapes (InvestigationData / CaseFileContent) so components
// don't need to change.
// -----------------------------------------------------------------------------

export type EntityType =
  | "suspect"
  | "victim"
  | "witness"
  | "vehicle"
  | "location"
  | "phone"
  | "bank"
  | "evidence"
  | "case";

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  sub?: string;
  risk?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface Suspect {
  id: string;
  name: string;
  alias: string;
  age: number;
  gender: string;
  riskScore: number;
  status: "At Large" | "In Custody" | "Under Surveillance" | "Released on Bail";
  description: string;
}

export interface Victim {
  id: string;
  name: string;
  age: number;
  gender: string;
  address: string;
  occupation: string;
  statement: string;
  injuries: string;
}

export interface Witness {
  id: string;
  name: string;
  statement: string;
  reliability: "High" | "Medium" | "Low";
}

export interface Vehicle {
  id: string;
  plate: string;
  makeModel: string;
  color: string;
  note: string;
}

export interface LocationEntity {
  id: string;
  name: string;
  address: string;
  role: string;
}

export interface PhoneRecord {
  id: string;
  number: string;
  owner: string;
  note: string;
}

export interface BankAccountEntity {
  id: string;
  accountNo: string;
  bank: string;
  holder: string;
  note: string;
}

export type EvidenceType =
  | "CCTV Footage"
  | "Forensic Report"
  | "Call Detail Record"
  | "Fingerprint Analysis"
  | "Seized Document"
  | "Photograph";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  date: string;
  relatedIds: string[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  relatedIds: string[];
}

export interface AIInsight {
  modusOperandi: string;
  patternAnalysis: string[];
  similarCases: { id: string; title: string; similarity: number; district: string }[];
  keySuspectIds: string[];
  riskScore: number;
  insights: string[];
  recommendedActions: string[];
}

export interface InvestigationData {
  caseType: string;
  district: string;
  sections: string[];
  entities: {
    suspects: Suspect[];
    victims: Victim[];
    witnesses: Witness[];
    vehicles: Vehicle[];
    locations: LocationEntity[];
    phones: PhoneRecord[];
    banks: BankAccountEntity[];
  };
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  ai: AIInsight;
}

export interface CaseFileContent {
  caseId: string;
  caseType: string;
  district: string;
  status: string;
  cover: {
    firNumber: string;
    title: string;
    dateFiled: string;
    officerInCharge: string;
    policeStation: string;
    sections: string[];
  };
  incidentSummary: {
    date: string;
    time: string;
    location: string;
    narrative: string;
    complainant: string;
  };
  crimeScene: {
    location: string;
    description: string;
    itemsRecovered: string[];
    sceneNotes: string;
  };
  victim: Victim;
  suspects: Suspect[];
  witnesses: Witness[];
  evidence: EvidenceItem[];
  investigationNotes: { date: string; note: string; officer: string }[];
  aiAnalysis: AIInsight;
  similarCases: { id: string; title: string; similarity: number; district: string }[];
  finalReport: {
    summary: string;
    conclusion: string;
    recommendation: string;
    status: string;
    officer: string;
    date: string;
  };
}

// --- seeded RNG --------------------------------------------------------------

function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RNG = () => number;

function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(rng: RNG, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickMany<T>(rng: RNG, arr: readonly T[], n: number): T[] {
  return shuffle(rng, arr).slice(0, Math.min(n, arr.length));
}

// --- name / reference pools ---------------------------------------------------

const MALE_NAMES = [
  "Rohan", "Arjun", "Vikram", "Sanjay", "Anil", "Rahul", "Karan", "Suresh",
  "Ajay", "Manoj", "Deepak", "Ravi", "Amit", "Vijay", "Nikhil", "Farhan",
  "Irfan", "Gurpreet", "Harish", "Naveen",
];
const FEMALE_NAMES = [
  "Priya", "Anjali", "Neha", "Pooja", "Kavita", "Sunita", "Meera", "Divya",
  "Sneha", "Ritu", "Asha", "Rekha", "Shalini", "Fatima", "Simran", "Lakshmi",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Yadav", "Reddy", "Nair", "Kulkarni",
  "Iyer", "Mehta", "Chauhan", "Joshi", "Patil", "Desai", "Rao", "Khan",
  "Malhotra", "Bhatt", "Menon", "Das",
];
const ALIASES = [
  "Chintu", "Bunty", "Lala", "Pappu", "Tinku", "Guddu", "Bhaiya", "Sonu",
  "Babu", "Chotu", "Raja", "Munna",
];
const LOCALITIES = [
  "MG Road", "Station Bazaar", "Nehru Colony", "Industrial Area", "Old Town",
  "Riverside Layout", "Model Town", "Civil Lines", "Sector 12", "Ashok Nagar",
  "Gandhi Market", "Lake View Road", "New Colony", "Ring Road", "Shastri Nagar",
];
const OCCUPATIONS = [
  "shopkeeper", "auto driver", "office clerk", "college student", "homemaker",
  "shop owner", "delivery agent", "software engineer", "farmer", "tailor",
];
const VEHICLES = [
  "Maruti Suzuki Swift", "Hero Splendor", "Bajaj Pulsar", "Honda Activa",
  "Tata Nano", "Mahindra Bolero", "TVS Apache", "Royal Enfield Classic",
  "Maruti Suzuki Alto",
];
const COLORS = ["Black", "White", "Red", "Silver", "Blue", "Grey", "Maroon"];
const BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Punjab National Bank",
  "Axis Bank", "Bank of Baroda",
];

const SECTIONS_BY_CASE_TYPE: Record<string, string[]> = {
  theft: ["379 IPC – Theft", "411 IPC – Dishonestly receiving stolen property"],
  assault: [
    "323 IPC – Voluntarily causing hurt",
    "324 IPC – Hurt by dangerous weapon",
    "506 IPC – Criminal intimidation",
  ],
  fraud: ["420 IPC – Cheating", "468 IPC – Forgery", "471 IPC – Using forged document"],
  burglary: [
    "457 IPC – House-breaking by night",
    "380 IPC – Theft in dwelling house",
  ],
};

const MO_BY_CASE_TYPE: Record<string, string> = {
  theft: "Offenders operate in pairs during peak crowd hours, targeting unattended bags and two-wheelers parked near markets. Stolen items are typically fenced within 24–48 hours through a known local receiver network.",
  assault: "Altercations escalate rapidly from verbal disputes, often near liquor vends or late-night eateries, with a blunt weapon of opportunity used. Repeat offenders frequently return to the same locality within weeks.",
  fraud: "Victims are approached with a fabricated investment or KYC-update pretext, then persuaded to share OTPs or transfer funds to mule accounts that are drained and closed within hours.",
  burglary: "Entry is forced through rear windows or terraces during hours when the household is known (via reconnaissance) to be vacant, with electronics and jewellery prioritised over bulky items.",
};

const CASE_TYPE_LABELS: Record<string, string> = {
  theft: "Theft",
  assault: "Assault",
  fraud: "Fraud",
  burglary: "Burglary",
};

// --- graph edge helper ---------------------------------------------------

let edgeCounter = 0;
function edge(source: string, target: string, relation: string): GraphEdge {
  edgeCounter += 1;
  return { id: `E-${edgeCounter}`, source, target, relation };
}

// --- main generator --------------------------------------------------------

export function getInvestigationData(
  caseTypeSlug: string,
  districtSlug: string
): InvestigationData {
  const seed = hashString(`${caseTypeSlug}::${districtSlug}`);
  const rng = mulberry32(seed);
  edgeCounter = hashString(`${caseTypeSlug}::${districtSlug}`) % 1000;

  const caseTypeLabel = CASE_TYPE_LABELS[caseTypeSlug] ?? "Case";
  const sections = SECTIONS_BY_CASE_TYPE[caseTypeSlug] ?? ["IPC section pending"];

  const fullName = () =>
    `${pick(rng, rng() > 0.5 ? MALE_NAMES : FEMALE_NAMES)} ${pick(rng, LAST_NAMES)}`;

  // --- suspects ---
  const suspectCount = pickInt(rng, 3, 4);
  const suspects: Suspect[] = Array.from({ length: suspectCount }).map((_, i) => {
    const name = fullName();
    return {
      id: `SUS-${i + 1}`,
      name,
      alias: pick(rng, ALIASES),
      age: pickInt(rng, 19, 46),
      gender: name.split(" ")[0] && MALE_NAMES.includes(name.split(" ")[0]) ? "Male" : "Female",
      riskScore: pickInt(rng, 35, 96),
      status: pick(rng, ["At Large", "In Custody", "Under Surveillance", "Released on Bail"] as const),
      description: `Previously flagged in ${pickInt(rng, 1, 4)} prior ${caseTypeLabel.toLowerCase()} case(s) within ${districtSlug} jurisdiction. Known to frequent ${pick(rng, LOCALITIES)}.`,
    };
  });

  // --- victims ---
  const victimCount = pickInt(rng, 1, 2);
  const victims: Victim[] = Array.from({ length: victimCount }).map((_, i) => ({
    id: `VIC-${i + 1}`,
    name: fullName(),
    age: pickInt(rng, 20, 65),
    gender: rng() > 0.5 ? "Male" : "Female",
    address: `${pickInt(rng, 1, 200)}, ${pick(rng, LOCALITIES)}`,
    occupation: pick(rng, OCCUPATIONS),
    statement: `Reported the incident occurred while returning from ${pick(rng, LOCALITIES)} in the evening. Described the encounter as sudden and did not initially recognise the perpetrator(s).`,
    injuries: caseTypeSlug === "assault" ? "Bruising and minor lacerations, treated as outpatient." : "None reported.",
  }));

  // --- witnesses ---
  const witnessCount = pickInt(rng, 2, 3);
  const witnesses: Witness[] = Array.from({ length: witnessCount }).map((_, i) => ({
    id: `WIT-${i + 1}`,
    name: fullName(),
    statement: `Was present near ${pick(rng, LOCALITIES)} at the time and recalls seeing ${pick(rng, ["a person matching the suspect's description", "two individuals leaving the scene hurriedly", "a parked vehicle idling nearby", "a heated exchange moments before the incident"])}.`,
    reliability: pick(rng, ["High", "Medium", "Low"] as const),
  }));

  // --- vehicles ---
  const vehicleCount = pickInt(rng, 1, 2);
  const vehicles: Vehicle[] = Array.from({ length: vehicleCount }).map((_, i) => ({
    id: `VEH-${i + 1}`,
    plate: `${districtSlug.slice(0, 2).toUpperCase()}-${pickInt(rng, 10, 99)}-${pick(rng, ["A", "B", "C", "D"])}-${pickInt(rng, 1000, 9999)}`,
    makeModel: pick(rng, VEHICLES),
    color: pick(rng, COLORS),
    note: "Registered to a residence within 3km of the crime scene.",
  }));

  // --- locations ---
  const localityPicks = pickMany(rng, LOCALITIES, 3);
  const locations: LocationEntity[] = [
    { id: "LOC-1", name: `${localityPicks[0]}, ${districtSlug} District`, address: `Near ${localityPicks[0]}`, role: "Crime Scene" },
    { id: "LOC-2", name: `${localityPicks[1]}, ${districtSlug} District`, address: `${localityPicks[1]} Police Outpost`, role: "Suspect Last Seen" },
    { id: "LOC-3", name: `${localityPicks[2]}, ${districtSlug} District`, address: `${localityPicks[2]} Market`, role: "Evidence Recovery Point" },
  ];

  // --- phones & bank accounts (linked to suspects) ---
  const phones: PhoneRecord[] = suspects.slice(0, 2).map((s, i) => ({
    id: `PHN-${i + 1}`,
    number: `+91 9${pickInt(rng, 10000, 99999)}${pickInt(rng, 10000, 99999)}`,
    owner: s.name,
    note: `${pickInt(rng, 3, 18)} calls exchanged with other flagged numbers in the past 30 days.`,
  }));
  const banks: BankAccountEntity[] = suspects.slice(0, 1).map((s, i) => ({
    id: `BNK-${i + 1}`,
    accountNo: `XXXXXX${pickInt(rng, 1000, 9999)}`,
    bank: pick(rng, BANKS),
    holder: s.name,
    note: caseTypeSlug === "fraud" ? "Flagged as a mule account — multiple rapid inbound/outbound transfers." : "Under financial trail review.",
  }));

  // --- case files reference (reuse existing FIR ids for continuity) ---
  const caseNodes: GraphNode[] = [
    { id: "CF-FIR-1001", type: "case", label: "FIR-1001" },
    { id: "CF-FIR-1002", type: "case", label: "FIR-1002" },
    { id: "CF-FIR-1003", type: "case", label: "FIR-1003" },
  ];

  // --- evidence ---
  const evidenceTypes: EvidenceType[] = [
    "CCTV Footage", "Forensic Report", "Call Detail Record", "Fingerprint Analysis", "Seized Document", "Photograph",
  ];
  const evidence: EvidenceItem[] = evidenceTypes.map((type, i) => {
    const related: string[] = [];
    if (type === "CCTV Footage") related.push(locations[0].id, suspects[0]?.id);
    if (type === "Forensic Report") related.push(locations[0].id, victims[0]?.id);
    if (type === "Call Detail Record") related.push(phones[0]?.id ?? suspects[0]?.id, suspects[1]?.id ?? suspects[0]?.id);
    if (type === "Fingerprint Analysis") related.push(locations[2]?.id, suspects[pickInt(rng, 0, suspects.length - 1)]?.id);
    if (type === "Seized Document") related.push(banks[0]?.id ?? suspects[0]?.id);
    if (type === "Photograph") related.push(locations[0].id, vehicles[0]?.id ?? locations[1].id);

    const titles: Record<EvidenceType, string> = {
      "CCTV Footage": `${localityPicks[0]} junction camera — ${pickInt(rng, 6, 11)}:${pick(rng, ["05", "20", "34", "47"])} PM`,
      "Forensic Report": "FSL biological trace analysis",
      "Call Detail Record": "CDR — 30 day tower dump",
      "Fingerprint Analysis": "Latent print lift, recovery point",
      "Seized Document": "Bank statement / transaction log",
      "Photograph": "Scene photography set",
    };
    const descriptions: Record<EvidenceType, string> = {
      "CCTV Footage": "Shows a figure matching the suspect description near the scene shortly before the reported time.",
      "Forensic Report": "Trace evidence collected from the scene submitted for forensic comparison.",
      "Call Detail Record": "Tower dump cross-referenced against known suspect and associate numbers.",
      "Fingerprint Analysis": "Partial latent print recovered and queued for AFIS comparison.",
      "Seized Document": "Financial records seized during the follow-up search, under forensic audit.",
      "Photograph": "Wide and close-up photographs documenting the scene and recovered items.",
    };

    return {
      id: `EVD-${i + 1}`,
      type,
      title: titles[type],
      description: descriptions[type],
      date: `2026-0${pickInt(rng, 1, 7)}-${pickInt(rng, 10, 28)}`,
      relatedIds: related.filter(Boolean),
    };
  });

  // --- timeline ---
  const timeline: TimelineEvent[] = [
    {
      id: "TL-1",
      date: "2026-06-14", time: "21:10",
      title: "Incident reported",
      description: `Complaint received at ${districtSlug} District station regarding a ${caseTypeLabel.toLowerCase()} incident near ${locations[0].name}.`,
      relatedIds: [victims[0]?.id, locations[0].id].filter(Boolean) as string[],
    },
    {
      id: "TL-2",
      date: "2026-06-15", time: "09:40",
      title: "FIR registered",
      description: `FIR filed under ${sections[0]}. Investigation team assigned.`,
      relatedIds: [locations[0].id],
    },
    {
      id: "TL-3",
      date: "2026-06-15", time: "14:00",
      title: "Scene canvassed, CCTV pulled",
      description: `CCTV footage collected from ${locations[0].name} and adjoining junctions.`,
      relatedIds: [evidence[0]?.id, locations[0].id],
    },
    {
      id: "TL-4",
      date: "2026-06-17", time: "11:20",
      title: "Witness statements recorded",
      description: `Statements recorded from ${witnesses.length} witnesses present in the vicinity.`,
      relatedIds: witnesses.map((w) => w.id),
    },
    {
      id: "TL-5",
      date: "2026-06-19", time: "16:30",
      title: "Suspect identified via CDR / CCTV match",
      description: `Cross-referencing call records and footage narrowed focus to ${suspects[0]?.name} (alias "${suspects[0]?.alias}").`,
      relatedIds: [suspects[0]?.id, phones[0]?.id].filter(Boolean) as string[],
    },
    {
      id: "TL-6",
      date: "2026-06-22", time: "08:15",
      title: "Forensic report received",
      description: "FSL report matched trace evidence to the recovery point, corroborating the suspect timeline.",
      relatedIds: [evidence[1]?.id, locations[2]?.id].filter(Boolean) as string[],
    },
    {
      id: "TL-7",
      date: "2026-06-25", time: "19:45",
      title: "Follow-up action taken",
      description: `${suspects[0]?.status === "In Custody" ? "Suspect apprehended and taken into custody." : "Surveillance intensified pending further corroboration."}`,
      relatedIds: [suspects[0]?.id].filter(Boolean) as string[],
    },
  ];

  // --- graph ---
  const nodes: GraphNode[] = [
    ...suspects.map((s) => ({ id: s.id, type: "suspect" as const, label: s.name, sub: `alias "${s.alias}"`, risk: s.riskScore })),
    ...victims.map((v) => ({ id: v.id, type: "victim" as const, label: v.name, sub: v.occupation })),
    ...witnesses.map((w) => ({ id: w.id, type: "witness" as const, label: w.name, sub: "Witness" })),
    ...vehicles.map((v) => ({ id: v.id, type: "vehicle" as const, label: v.plate, sub: v.makeModel })),
    ...locations.map((l) => ({ id: l.id, type: "location" as const, label: l.name.split(",")[0], sub: l.role })),
    ...phones.map((p) => ({ id: p.id, type: "phone" as const, label: p.number, sub: "Phone" })),
    ...banks.map((b) => ({ id: b.id, type: "bank" as const, label: b.bank, sub: b.accountNo })),
    ...evidence.map((e) => ({ id: e.id, type: "evidence" as const, label: e.type, sub: e.title })),
    ...caseNodes,
  ];

  const edges: GraphEdge[] = [];
  suspects.forEach((s, i) => {
    edges.push(edge(s.id, locations[0].id, "linked to scene"));
    if (victims[0]) edges.push(edge(s.id, victims[0].id, i === 0 ? "primary suspect of" : "associate of"));
    if (i > 0) edges.push(edge(suspects[0].id, s.id, "known associate"));
  });
  victims.forEach((v) => edges.push(edge(v.id, locations[0].id, "incident location")));
  witnesses.forEach((w) => {
    edges.push(edge(w.id, locations[0].id, "present at"));
    edges.push(edge(w.id, suspects[0].id, "identified"));
  });
  vehicles.forEach((v) => edges.push(edge(v.id, suspects[0].id, "registered to")));
  phones.forEach((p) => {
    const owner = suspects.find((s) => s.name === p.owner);
    if (owner) edges.push(edge(p.id, owner.id, "owned by"));
  });
  banks.forEach((b) => {
    const holder = suspects.find((s) => s.name === b.holder);
    if (holder) edges.push(edge(b.id, holder.id, "held by"));
  });
  locations.slice(1).forEach((l) => edges.push(edge(l.id, suspects[0].id, "connected to")));
  evidence.forEach((e) => {
    e.relatedIds.forEach((rid) => edges.push(edge(e.id, rid, "evidence of")));
  });
  caseNodes.forEach((cn, i) => {
    edges.push(edge(cn.id, suspects[i % suspects.length].id, "case involves"));
    edges.push(edge(cn.id, locations[0].id, "filed for"));
  });

  // --- AI insight ---
  const riskScore = Math.round(
    suspects.reduce((sum, s) => sum + s.riskScore, 0) / suspects.length
  );
  const ai: AIInsight = {
    modusOperandi: MO_BY_CASE_TYPE[caseTypeSlug] ?? "Pattern under analysis.",
    patternAnalysis: [
      `${pickInt(rng, 58, 82)}% of ${caseTypeLabel.toLowerCase()} cases in ${districtSlug} District occur between 7 PM and midnight.`,
      `Repeat locations cluster within 1.5km of ${locations[0].name.split(",")[0]}.`,
      `${pickInt(rng, 2, 5)} cases in the last quarter share a matching vehicle description or suspect alias.`,
    ],
    similarCases: [
      { id: "FIR-0892", title: `${caseTypeLabel} — ${pick(rng, LOCALITIES)}`, similarity: pickInt(rng, 72, 91), district: districtSlug },
      { id: "FIR-0774", title: `${caseTypeLabel} — ${pick(rng, LOCALITIES)}`, similarity: pickInt(rng, 60, 85), district: districtSlug },
      { id: "FIR-0651", title: `${caseTypeLabel} — near ${pick(rng, LOCALITIES)}`, similarity: pickInt(rng, 55, 78), district: districtSlug },
    ],
    keySuspectIds: suspects.slice(0, Math.min(2, suspects.length)).map((s) => s.id),
    riskScore,
    insights: [
      `Suspect "${suspects[0]?.alias}" shares a phone tower ping with a suspect from FIR-0892 on the night of the incident.`,
      `Vehicle ${vehicles[0]?.plate ?? "N/A"} was flagged near two other unresolved cases in the district this quarter.`,
      `Financial trail on ${banks[0]?.bank ?? "the linked account"} shows activity consistent with the district's known fencing network.`,
    ],
    recommendedActions: [
      "Issue lookout circular for the identified vehicle and primary suspect.",
      "Cross-verify CDR tower dump against FIR-0892 and FIR-0774 suspect numbers.",
      "Request AFIS comparison priority on the recovered latent print.",
      "Schedule joint interrogation with the investigating officer of similar cases.",
    ],
  };

  return {
    caseType: caseTypeLabel,
    district: districtSlug,
    sections,
    entities: { suspects, victims, witnesses, vehicles, locations, phones, banks },
    evidence,
    timeline,
    graph: { nodes, edges },
    ai,
  };
}

// --- case-file (flipbook) generator ------------------------------------------

export function getCaseFileContent(
  caseTypeSlug: string,
  districtSlug: string,
  caseId: string
): CaseFileContent {
  const base = getInvestigationData(caseTypeSlug, districtSlug);
  const seed = hashString(`${caseTypeSlug}::${districtSlug}::${caseId}`);
  const rng = mulberry32(seed);
  const caseTypeLabel = CASE_TYPE_LABELS[caseTypeSlug] ?? "Case";

  const victim = base.entities.victims[0] ?? {
    id: "VIC-1", name: "Unknown", age: 0, gender: "-", address: "-", occupation: "-", statement: "-", injuries: "-",
  };

  const officers = ["Insp. R. Kulkarni", "SI P. Nair", "Insp. A. Fernandes", "SI M. Bhatt"];
  const stations = [`${districtSlug} District Police Station`, `${districtSlug} City Outpost`];

  return {
    caseId,
    caseType: caseTypeLabel,
    district: districtSlug,
    status: pick(rng, ["Open", "Under Investigation", "Closed"]),
    cover: {
      firNumber: caseId,
      title: `${caseTypeLabel} — ${base.entities.locations[0].name}`,
      dateFiled: "2026-06-15",
      officerInCharge: pick(rng, officers),
      policeStation: pick(rng, stations),
      sections: base.sections,
    },
    incidentSummary: {
      date: "2026-06-14",
      time: "21:10",
      location: base.entities.locations[0].name,
      narrative: `On the evening of 14 June 2026, a ${caseTypeLabel.toLowerCase()} incident was reported near ${base.entities.locations[0].name}. The complainant, ${victim.name}, stated that the incident occurred while returning home. Preliminary inquiry indicates the involvement of ${base.entities.suspects.length} suspect(s) known to the local investigation unit.`,
      complainant: victim.name,
    },
    crimeScene: {
      location: base.entities.locations[0].name,
      description: `The scene is a ${pick(rng, ["busy market frontage", "residential lane", "roadside near a bus stop", "commercial complex entrance"])} with partial CCTV coverage. Scene was secured within ${pickInt(rng, 20, 60)} minutes of the report.`,
      itemsRecovered: pickMany(rng, [
        "Broken mobile phone screen",
        "Torn fabric sample",
        "Footwear impression cast",
        "Discarded weapon (blunt object)",
        "Two shell-fragment pieces",
        "CCTV time-stamp log printout",
      ], 3),
      sceneNotes: "Scene photographs and measurements logged in evidence register; area released to public after forensic clearance.",
    },
    victim: victim as Victim,
    suspects: base.entities.suspects,
    witnesses: base.entities.witnesses,
    evidence: base.evidence,
    investigationNotes: [
      { date: "2026-06-15", note: "FIR registered and case assigned to investigation unit.", officer: pick(rng, officers) },
      { date: "2026-06-17", note: "Witness statements recorded; canvassing of nearby CCTV completed.", officer: pick(rng, officers) },
      { date: "2026-06-20", note: "Suspect movement pattern cross-checked against CDR tower dump.", officer: pick(rng, officers) },
      { date: "2026-06-23", note: "Forensic report received and attached to case file.", officer: pick(rng, officers) },
    ],
    aiAnalysis: base.ai,
    similarCases: base.ai.similarCases,
    finalReport: {
      summary: `Investigation into ${caseId} identified ${base.entities.suspects[0]?.name} (alias "${base.entities.suspects[0]?.alias}") as the primary suspect, corroborated by CCTV, CDR, and forensic evidence.`,
      conclusion: base.entities.suspects[0]?.status === "In Custody"
        ? "Suspect apprehended; case moving toward chargesheet filing."
        : "Suspect identified; apprehension pending further surveillance and corroboration.",
      recommendation: "Recommend chargesheet under listed sections pending final forensic confirmation and custodial interrogation.",
      status: pick(rng, ["Under Investigation", "Chargesheet in Progress", "Closed"]),
      officer: pick(rng, officers),
      date: "2026-06-25",
    },
  };
}

// --- cross-panel highlight helper --------------------------------------------
// Given the currently "active" entity (a graph node id, or a timeline event
// id), returns the set of ids that should be highlighted across the graph,
// timeline, and evidence panels.

export function computeHighlightSet(
  activeId: string | null,
  data: Pick<InvestigationData, "graph" | "timeline">
): Set<string> {
  if (!activeId) return new Set();

  if (activeId.startsWith("TL-")) {
    const event = data.timeline.find((t) => t.id === activeId);
    return new Set([activeId, ...(event?.relatedIds ?? [])]);
  }

  const set = new Set<string>([activeId]);
  data.graph.edges.forEach((e) => {
    if (e.source === activeId) set.add(e.target);
    if (e.target === activeId) set.add(e.source);
  });
  // also pull in any timeline events that reference this entity
  data.timeline.forEach((t) => {
    if (t.relatedIds.includes(activeId)) set.add(t.id);
  });
  return set;
}

// --- selected-entity detail lookup -------------------------------------------
// Normalises any graph node (or timeline event) into a display-ready detail
// object for the "selected entity" rail beside the network graph.

export interface EntityDetail {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  fields: { label: string; value: string }[];
  description?: string;
  relatedCount: number;
}

export function getEntityDetail(data: InvestigationData, id: string): EntityDetail | null {
  const relatedCount = data.graph.edges.filter((e) => e.source === id || e.target === id).length;
  const { suspects, victims, witnesses, vehicles, locations, phones, banks } = data.entities;

  const s = suspects.find((x) => x.id === id);
  if (s)
    return {
      id, type: "suspect", title: s.name, subtitle: `alias “${s.alias}”`,
      fields: [
        { label: "Age", value: `${s.age}` },
        { label: "Gender", value: s.gender },
        { label: "Status", value: s.status },
        { label: "Risk", value: `${s.riskScore}/100` },
      ],
      description: s.description, relatedCount,
    };

  const v = victims.find((x) => x.id === id);
  if (v)
    return {
      id, type: "victim", title: v.name, subtitle: v.occupation,
      fields: [
        { label: "Age", value: `${v.age}` },
        { label: "Gender", value: v.gender },
        { label: "Address", value: v.address },
        { label: "Injuries", value: v.injuries },
      ],
      description: v.statement, relatedCount,
    };

  const w = witnesses.find((x) => x.id === id);
  if (w)
    return {
      id, type: "witness", title: w.name, subtitle: `${w.reliability} reliability`,
      fields: [], description: w.statement, relatedCount,
    };

  const veh = vehicles.find((x) => x.id === id);
  if (veh)
    return {
      id, type: "vehicle", title: veh.plate, subtitle: veh.makeModel,
      fields: [{ label: "Colour", value: veh.color }], description: veh.note, relatedCount,
    };

  const l = locations.find((x) => x.id === id);
  if (l)
    return {
      id, type: "location", title: l.name, subtitle: l.role,
      fields: [{ label: "Address", value: l.address }], relatedCount,
    };

  const p = phones.find((x) => x.id === id);
  if (p)
    return {
      id, type: "phone", title: p.number, subtitle: `Owner: ${p.owner}`,
      fields: [], description: p.note, relatedCount,
    };

  const b = banks.find((x) => x.id === id);
  if (b)
    return {
      id, type: "bank", title: b.bank, subtitle: b.accountNo,
      fields: [{ label: "Holder", value: b.holder }], description: b.note, relatedCount,
    };

  const ev = data.evidence.find((x) => x.id === id);
  if (ev)
    return {
      id, type: "evidence", title: ev.title, subtitle: ev.type,
      fields: [{ label: "Logged", value: ev.date }], description: ev.description, relatedCount,
    };

  const cn = data.graph.nodes.find((x) => x.id === id && x.type === "case");
  if (cn)
    return {
      id, type: "case", title: cn.label, subtitle: "Linked case file",
      fields: [], description: "A related case file connected to this investigation.", relatedCount,
    };

  const tl = data.timeline.find((x) => x.id === id);
  if (tl)
    return {
      id, type: "evidence", title: tl.title, subtitle: `${tl.date} · ${tl.time}`,
      fields: [], description: tl.description, relatedCount: tl.relatedIds.length,
    };

  return null;
}
