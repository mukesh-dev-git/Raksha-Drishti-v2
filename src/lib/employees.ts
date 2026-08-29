// -----------------------------------------------------------------------------
// P9.2 - real roster for IO assignment. Employee/Rank/Designation are real,
// already-imported Data Store tables (catalyst/README.md §2), not
// fabricated - bundled the same way scenarioMeta.json/caseFacts.json are so
// the assignment picker doesn't need a live query to show a real officer's
// name/rank/district. 12 employees, real coverage of every district the
// seeded dataset uses (see build_seed.mjs §8).
// -----------------------------------------------------------------------------
import employeesRaw from "./nosql-seed/employees.json";

export type Employee = {
  employeeId: number;
  name: string;
  rankName: string;
  designationName: string;
  districtId: number;
  districtName: string;
};

const EMPLOYEES = employeesRaw as Employee[];

export function getEmployees(): Employee[] {
  return EMPLOYEES;
}

export function getEmployee(employeeId: number): Employee | null {
  return EMPLOYEES.find((e) => e.employeeId === employeeId) ?? null;
}

/** This district's officers first, everyone else after - for a picker where
 *  the case's own jurisdiction is the natural default, not a random order. */
export function getEmployeesByDistrict(districtId: number | null): Employee[] {
  if (districtId === null) return EMPLOYEES;
  const here = EMPLOYEES.filter((e) => e.districtId === districtId);
  const elsewhere = EMPLOYEES.filter((e) => e.districtId !== districtId);
  return [...here, ...elsewhere];
}
