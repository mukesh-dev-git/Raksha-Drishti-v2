import { redirect } from "next/navigation";

// Root "/" simply forwards to the dashboard.
export default function Home() {
  redirect("/dashboard");
}
