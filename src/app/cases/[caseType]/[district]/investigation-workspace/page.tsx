import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import Placeholder from "@/components/Placeholder";
import { getCaseType, getDistrict } from "@/lib/data";

// -----------------------------------------------------------------------------
// /cases/[caseType]/[district]/investigation-workspace
// Contains: socio-economic graph, Modus Operandi (MO), and a Case Files link.
// -----------------------------------------------------------------------------
export default async function InvestigationWorkspacePage({
  params,
}: {
  params: Promise<{ caseType: string; district: string }>;
}) {
  const { caseType, district } = await params;
  const c = getCaseType(caseType);
  const d = getDistrict(district);
  if (!c || !d) notFound();

  const base = `/cases/${caseType}/${district}`;

  return (
    <PageShell
      title={`Investigation Workspace`}
      description={`${c.name} · ${d.name} — analyse the socio-economic context and modus operandi, then open the case files.`}
      breadcrumbs={[
        { label: "Cases", href: "/cases" },
        { label: c.name, href: `/cases/${caseType}/district-wise` },
        { label: d.name, href: `${base}/investigation-workspace` },
      ]}
    >
      <div className="grid gap-6">
        {/* Socio-economic graph section */}
        <Placeholder label="Socio-economic graph">
          Add a chart correlating this district&apos;s {c.name.toLowerCase()}{" "}
          cases with socio-economic indicators (income, unemployment, literacy,
          population density, etc.).
        </Placeholder>

        {/* Modus Operandi section */}
        <Placeholder label="Modus Operandi (MO)">
          Add MO analysis here: common methods, time-of-day patterns, weapons/
          tools used, recurring suspect behaviours for {c.name.toLowerCase()} in{" "}
          {d.name}.
        </Placeholder>

        {/* Link into case files */}
        <div>
          <Link
            href={`${base}/case-files`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-500"
          >
            Open Case Files →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
