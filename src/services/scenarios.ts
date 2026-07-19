import fs from "fs";
import path from "path";
import { dataPath } from "@/lib/paths";
import { addIncident, mergeTelemetryDelta } from "@/lib/store";
import type { DecisionCard, Incident, Role, Severity, TelemetrySnapshot } from "@/domain/types";
import { generateDecisionCard } from "./decisions";

export interface ScenarioFile {
  id: string;
  name: string;
  description: string;
  telemetryDelta?: Partial<TelemetrySnapshot> & {
    zones?: Record<string, Partial<TelemetrySnapshot["zones"][string]>>;
  };
  incidents?: Array<{
    type: string;
    severity: Severity;
    zoneId: string;
    summary: string;
    assignedRole?: Role;
  }>;
}

export function listScenarios(): ScenarioFile[] {
  const dir = dataPath("scenarios");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      return JSON.parse(raw) as ScenarioFile;
    });
}

export function getScenario(id: string): ScenarioFile | undefined {
  return listScenarios().find((s) => s.id === id);
}

export async function runScenario(id: string): Promise<{
  scenario: { id: string; name: string; description: string };
  telemetry?: TelemetrySnapshot;
  incidents: Incident[];
  decisionCards: DecisionCard[];
}> {
  const scenario = getScenario(id);
  if (!scenario) {
    throw new Error(`Unknown scenario: ${id}`);
  }

  let telemetry: TelemetrySnapshot | undefined;
  if (scenario.telemetryDelta) {
    telemetry = mergeTelemetryDelta(scenario.telemetryDelta);
  }

  const incidents: Incident[] = [];
  const cards: DecisionCard[] = [];

  for (const inc of scenario.incidents ?? []) {
    const created = addIncident({
      type: inc.type,
      severity: inc.severity,
      zoneId: inc.zoneId,
      summary: inc.summary,
      assignedRole: inc.assignedRole,
    });
    incidents.push(created);
    const { card } = await generateDecisionCard({
      incidentId: created.id,
      role: inc.assignedRole ?? "ops",
    });
    cards.push(card);
  }

  return {
    scenario: { id: scenario.id, name: scenario.name, description: scenario.description },
    telemetry,
    incidents,
    decisionCards: cards,
  };
}
