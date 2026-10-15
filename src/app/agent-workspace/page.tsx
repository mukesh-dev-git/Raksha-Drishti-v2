import AgentWorkspace from "@/components/agent/AgentWorkspace";

// Agent Workspace (#16). Deliberately outside the (site) route group: like
// VS Code's "Open in Agents", it's a separate full-screen workspace rather
// than another page inside the portal's sidebar shell.
export const metadata = { title: "Agent Workspace" };

export default function AgentWorkspacePage() {
  return <AgentWorkspace />;
}
