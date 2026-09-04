import { callGlm } from "./llm";
import type { PatternCluster } from "./moPatterns";

export type ClusterSummary = { text: string; isGlm: boolean };

const summaryCache = new Map<string, ClusterSummary>();

function deterministicSummary(cluster: PatternCluster): string {
  const sections = cluster.linkingSections.join(", ");
  const districts = [...new Set(cluster.members.map((m) => m.districtName))];
  const crimeTypes = [...new Set(cluster.members.map((m) => m.crimeTypeName))];
  const names = cluster.members.map((m) => m.scenarioTitle);

  if (cluster.strength === "exact") {
    return `These ${cluster.members.length} cases share an identical legal charge signature (${sections}), spanning ${districts.join(" and ")} district${districts.length > 1 ? "s" : ""}. The identical method across ${crimeTypes.join("/")} cases suggests a coordinated or repeat operation worth cross-investigating.`;
  }
  return `${cluster.members.length} cases — ${names.join(", ")} — share distinctive legal sections (${sections}) that appear in fewer than 4 of the 19 tracked cases. This overlap across ${districts.join(", ")} points to a possible common modus operandi beyond coincidental crime-type similarity.`;
}

export async function getPatternClusterSummary(cluster: PatternCluster): Promise<ClusterSummary> {
  if (summaryCache.has(cluster.id)) return summaryCache.get(cluster.id)!;

  const caseSummaries = cluster.members
    .map((m) => `- "${m.scenarioTitle}" (${m.crimeTypeName}, ${m.districtName}, sections: ${m.sections.join(", ")})`)
    .join("\n");

  try {
    const result = await callGlm({
      messages: [
        {
          role: "system",
          content:
            "You are an Indian police intelligence analyst. Given a cluster of cases that share legal sections, write a 2-3 sentence analytical summary explaining HOW these cases might be related operationally — what the shared sections imply about method, and why this pattern warrants cross-investigation. Be specific and professional. Do not use markdown.",
        },
        {
          role: "user",
          content: `Cluster strength: ${cluster.strength === "exact" ? "Exact section match" : "Shared distinctive sections"}\nLinking sections: ${cluster.linkingSections.join(", ")}\n\nCases:\n${caseSummaries}`,
        },
      ],
      maxTokens: 200,
      temperature: 0.3,
    });

    let text = result.ok && result.text.trim() ? result.text.trim() : "";
    const looksLikeEcho = /\*\*Task:?\*\*|Write a .* sentence|intelligence analyst/i.test(text);
    if (!text || looksLikeEcho) {
      const s: ClusterSummary = { text: deterministicSummary(cluster), isGlm: false };
      summaryCache.set(cluster.id, s);
      return s;
    }
    text = text.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
    const s: ClusterSummary = { text, isGlm: true };
    summaryCache.set(cluster.id, s);
    return s;
  } catch {
    const s: ClusterSummary = { text: deterministicSummary(cluster), isGlm: false };
    summaryCache.set(cluster.id, s);
    return s;
  }
}

export async function getPatternClusterSummaries(
  clusters: PatternCluster[]
): Promise<Map<string, ClusterSummary>> {
  const results = await Promise.all(clusters.map((c) => getPatternClusterSummary(c)));
  const map = new Map<string, ClusterSummary>();
  clusters.forEach((c, i) => map.set(c.id, results[i]));
  return map;
}
