#!/usr/bin/env python3
"""Generate Catalyst Data Store seed CSVs for the Police FIR schema.

SUPERSEDED — NOT the live seed. The Data Store is loaded from
catalyst/dataset-v2/ (build_seed.mjs), the 15 hand-authored scenarios. This
script's broad 406-case output is kept because P1.2 merges the two: broad
enough for statistics to mean something, deep enough for the evidence layer.

Two things here are wrong against the current schema and must be fixed as part
of that merge rather than copied forward:

  * PersonID emits scenario-local labels ("A1".."A4") that collide across
    cases. It is now a GLOBAL person register handle ("KA-Pnnnn") — one ID per
    human, stable dataset-wide, reused when the same person recurs. Re-running
    this script as-is would undo P1.1. See catalyst/DATA_STORE_SCHEMA.md
    ("Accused.PersonID — the person register").
  * GenderID emits "M"/"F"; the schema wants the numeric code (1=Male,
    2=Female, 3=Other).

Deterministic (fixed seed) so re-runs are stable. Emits one CSV per table into
catalyst/seed/. FK columns hold the parent's numeric ID — after CSV import in the
Catalyst console, convert those *ID columns to Lookup columns.

Run:  python catalyst/gen_seed.py
"""
import csv, os, random
from datetime import date, datetime, timedelta

random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), "seed")
os.makedirs(OUT, exist_ok=True)


def write(name, header, rows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"  {name:32} {len(rows):>5} rows")


# --- Masters / geography ----------------------------------------------------
write("State.csv", ["StateID", "StateName", "NationalityID", "Active"],
      [[29, "Karnataka", 1, 1]])

DISTRICTS = [
    (4401, "Bengaluru Urban"), (4402, "Mysuru"), (4403, "Belagavi"),
    (4404, "Kalaburagi"), (4405, "Dakshina Kannada"), (4406, "Tumakuru"),
    (4407, "Ballari"), (4408, "Shivamogga"),
]
write("District.csv", ["DistrictID", "DistrictName", "StateID", "Active"],
      [[i, n, 29, 1] for i, n in DISTRICTS])

write("UnitType.csv", ["UnitTypeID", "UnitTypeName", "CityDistState", "Hierarchy", "Active"],
      [[1, "Police Station", "City", 3, 1], [2, "Circle Office", "District", 2, 1],
       [3, "District HQ", "District", 1, 1]])

# one main police station per district
UNITS = [(6 + idx, f"{name} City PS", 1, did, 29) for idx, (did, name) in enumerate(DISTRICTS)]
write("Unit.csv", ["UnitID", "UnitName", "TypeID", "DistrictID", "StateID", "Active"],
      [[u, n, t, d, s, 1] for u, n, t, d, s in UNITS])

write("Rank.csv", ["RankID", "RankName", "Hierarchy", "Active"],
      [[1, "Constable", 5, 1], [2, "Sub-Inspector", 4, 1], [3, "Inspector", 3, 1], [4, "DSP", 2, 1]])

write("Designation.csv", ["DesignationID", "DesignationName", "SortOrder", "Active"],
      [[1, "Investigating Officer", 1, 1], [2, "Station House Officer", 2, 1]])

OFFICER_NAMES = ["R. Kulkarni", "S. Gowda", "A. Naik", "M. Rao", "P. Shetty",
                 "K. Hegde", "V. Patil", "N. Reddy"]
EMPLOYEES = []
for idx, (did, _name) in enumerate(DISTRICTS):
    eid = 1001 + idx
    EMPLOYEES.append([eid, did, UNITS[idx][0], 3, 1, f"KA{eid}", OFFICER_NAMES[idx],
                      "1985-06-15", 1, "2010-07-01"])
write("Employee.csv",
      ["EmployeeID", "DistrictID", "UnitID", "RankID", "DesignationID", "KGID",
       "FirstName", "EmployeeDOB", "GenderID", "AppointmentDate"], EMPLOYEES)

write("Court.csv", ["CourtID", "CourtName", "DistrictID", "StateID", "Active"],
      [[100 + idx, f"{name} District & Sessions Court", did, 29, 1]
       for idx, (did, name) in enumerate(DISTRICTS)])

# --- Lookups ----------------------------------------------------------------
write("CaseCategory.csv", ["CaseCategoryID", "LookupValue"],
      [[1, "FIR"], [3, "UDR"], [4, "PAR"], [8, "Zero FIR"]])
write("GravityOffence.csv", ["GravityOffenceID", "LookupValue"],
      [[1, "Heinous"], [2, "Non-Heinous"]])
write("CaseStatusMaster.csv", ["CaseStatusID", "CaseStatusName"],
      [[1, "Under Investigation"], [2, "Charge Sheeted"], [3, "Closed"], [4, "Open"]])

# --- Crime classification ---------------------------------------------------
write("CrimeHead.csv", ["CrimeHeadID", "CrimeGroupName", "Active"],
      [[1, "Crimes Against Property", 1], [2, "Crimes Against Body", 1], [3, "Economic Offences", 1]])
# (CrimeSubHeadID, CrimeHeadID, name, seq)  -- these back the UI "case types"
SUBHEADS = [(1, 1, "Theft"), (2, 2, "Assault"), (3, 3, "Fraud"), (4, 1, "Burglary")]
write("CrimeSubHead.csv", ["CrimeSubHeadID", "CrimeHeadID", "CrimeHeadName", "SeqID"],
      [[s, h, n, s] for s, h, n in SUBHEADS])

write("Act.csv", ["ActCode", "ActDescription", "ShortName", "Active"],
      [["IPC", "Indian Penal Code, 1860", "IPC", 1], ["NDPS", "Narcotic Drugs and Psychotropic Substances Act", "NDPS", 1]])
SECTIONS = [("IPC", "379", "Theft"), ("IPC", "411", "Dishonestly receiving stolen property"),
            ("IPC", "323", "Voluntarily causing hurt"), ("IPC", "420", "Cheating"),
            ("IPC", "457", "Lurking house-trespass / house-breaking")]
write("Section.csv", ["ActCode", "SectionCode", "SectionDescription", "Active"],
      [[a, c, d, 1] for a, c, d in SECTIONS])
# crime sub-head -> representative section
SUBHEAD_SECTION = {1: "379", 2: "323", 3: "420", 4: "457"}

# --- Core transactional: CaseMaster + children ------------------------------
YEARS = [2022, 2023, 2024, 2025, 2026]
# relative volume per district (bigger metros → more cases)
VOLUME = {4401: 5, 4402: 3, 4403: 3, 4404: 2, 4405: 2, 4406: 2, 4407: 2, 4408: 1}
# per-district clearance skew (share Charge Sheeted/Closed) → drives clearance rate
CLEARANCE = {4401: .58, 4402: .71, 4403: .64, 4404: .47, 4405: .76, 4406: .69, 4407: .28, 4408: .82}

FIRST = ["Ramesh", "Suresh", "Anita", "Priya", "Manjunath", "Lakshmi", "Farhan",
         "Deepa", "Vijay", "Kavya", "Arjun", "Sneha"]
LAST = ["Kumar", "Gowda", "Shetty", "Naik", "Rao", "Hegde", "Patil", "Reddy"]


def rand_name():
    return f"{random.choice(FIRST)} {random.choice(LAST)}"


cases, victims, accused, complainants, actsec, chargesheets = [], [], [], [], [], []
cid = vid = aid = compid = csid = 0
serial = {}  # (unit, category, year) -> running serial

for didx, (did, _dn) in enumerate(DISTRICTS):
    unit = UNITS[didx][0]
    off = EMPLOYEES[didx][0]
    court = 100 + didx
    for sub_id, head_id, _sn in SUBHEADS:
        for yr in YEARS:
            n = max(1, round(VOLUME[did] * random.uniform(0.6, 1.4)))
            for _ in range(n):
                cid += 1
                key = (unit, 1, yr)
                serial[key] = serial.get(key, 0) + 1
                crimeno = f"1{did:04d}{unit:04d}{yr}{serial[key]:05d}"
                caseno = f"{yr}{serial[key]:05d}"
                reg = date(yr, random.randint(1, 12), random.randint(1, 28))
                incident = datetime(reg.year, reg.month, reg.day, random.randint(0, 23), random.randint(0, 59))
                status = 2 if random.random() < CLEARANCE[did] else random.choice([1, 4])
                gravity = 1 if sub_id in (2,) else 2
                cases.append([
                    cid, crimeno, caseno, reg.isoformat(), off, unit, 1, gravity,
                    head_id, sub_id, status, court,
                    incident.isoformat(sep=" "), (incident + timedelta(hours=1)).isoformat(sep=" "),
                    (incident + timedelta(hours=2)).isoformat(sep=" "),
                    round(12.9 + random.uniform(-0.5, 0.5), 5), round(77.5 + random.uniform(-0.5, 0.5), 5),
                    f"{_sn} reported in {_dn}; investigation {'charge-sheeted' if status==2 else 'ongoing'}.",
                ])
                vid += 1
                victims.append([vid, cid, rand_name(), random.randint(18, 65), random.choice(["M", "F"]), "0"])
                aid += 1
                accused.append([aid, cid, rand_name(), random.randint(18, 55), random.choice(["M", "F"]), "A1"])
                compid += 1
                complainants.append([compid, cid, rand_name(), random.randint(21, 70), 1, 1, 1, random.choice([1, 2])])
                actsec.append([cid, "IPC", SUBHEAD_SECTION[sub_id], 1, 1])
                if status == 2:
                    csid += 1
                    chargesheets.append([csid, cid, (reg + timedelta(days=random.randint(30, 120))).isoformat() + " 10:00:00", "A", off])

write("CaseMaster.csv",
      ["CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "PolicePersonID",
       "PoliceStationID", "CaseCategoryID", "GravityOffenceID", "CrimeMajorHeadID",
       "CrimeMinorHeadID", "CaseStatusID", "CourtID", "IncidentFromDate", "IncidentToDate",
       "InfoReceivedPSDate", "latitude", "longitude", "BriefFacts"], cases)
write("Victim.csv", ["VictimMasterID", "CaseMasterID", "VictimName", "AgeYear", "GenderID", "VictimPolice"], victims)
write("Accused.csv", ["AccusedMasterID", "CaseMasterID", "AccusedName", "AgeYear", "GenderID", "PersonID"], accused)
write("ComplainantDetails.csv",
      ["ComplainantID", "CaseMasterID", "ComplainantName", "AgeYear", "OccupationID", "ReligionID", "CasteID", "GenderID"], complainants)
write("ActSectionAssociation.csv", ["CaseMasterID", "ActID", "SectionID", "ActOrderID", "SectionOrderID"], actsec)
write("ChargesheetDetails.csv", ["CSID", "CaseMasterID", "csdate", "cstype", "PolicePersonID"], chargesheets)

print(f"\nTotal CaseMaster rows: {len(cases)}")
