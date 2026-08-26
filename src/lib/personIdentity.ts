// -----------------------------------------------------------------------------
// Reads PersonIdentity.json (built by catalyst/dataset-v2/build_seed.mjs §7) -
// synthetic KYC-style fields (masked Aadhaar, phone, address) for every
// person in the global register. Fully fabricated (the real FIR schema has
// no such columns - see that generator's own comment for the full reasoning
// and DATA_STORE_SCHEMA.md for the confirmed-empty search), but baked to a
// stable file rather than computed per-render, so it reads like real,
// stored identity data attached to a person, not a placeholder.
// -----------------------------------------------------------------------------
import personIdentityRaw from "./nosql-seed/PersonIdentity.json";

export type PersonIdentity = {
  personId: string;
  name: string;
  aadhaarMasked: string;
  phone: string;
  address: string | null;
  districtId: number | null;
  districtName: string | null;
};

const IDENTITY = personIdentityRaw as Record<string, PersonIdentity>;

/** Registered identity details for `personId`, or null if this person isn't
 *  in the global Accused register (e.g. a Victim/Complainant - see
 *  personFusion.ts's note on why those have no global personId yet). */
export function getPersonIdentity(personId: string): PersonIdentity | null {
  return IDENTITY[personId] ?? null;
}
