import PageShell from "@/components/PageShell";
import CreateCaseForm from "@/components/cases/CreateCaseForm";

export const metadata = { title: "Register a new FIR" };

export default function NewCasePage() {
  return (
    <PageShell
      title="Register a new FIR"
      description="Creates a real row in the live Data Store — CaseMaster, a complainant, and optionally a victim or accused. Not a mock form."
      breadcrumbs={[{ label: "Cases", href: "/cases" }, { label: "New FIR", href: "/cases/new" }]}
    >
      <CreateCaseForm />
    </PageShell>
  );
}
