import { DecisionCardSchema } from "@/domain/decisionSchema";
import type { DecisionCard, Role, Severity } from "@/domain/types";
import { attachDecisionCard, getIncident, getTelemetry } from "@/lib/store";
import { nowIso, uid } from "@/lib/utils";
import { enrichIncidentContext } from "./incidents";
import { buildGroundedContext } from "./rag";
import { getGraph } from "@/lib/store";
import { getLlmMode, llmComplete } from "./llm";
import { overallVenueRisk } from "@/domain/risk";

function mockDecisionCard(input: {
  incidentId?: string;
  prompt?: string;
  role: Role;
}): DecisionCard {
  const enriched = input.incidentId ? enrichIncidentContext(input.incidentId) : null;
  const incident = enriched?.incident ?? getIncident(input.incidentId ?? "");
  const telemetry = getTelemetry();
  const risk = overallVenueRisk(telemetry);
  const severity: Severity = incident?.severity ?? risk.severity;
  const zoneId = incident?.zoneId ?? "zone-north";
  const medical = enriched?.resources.medical;
  const staff = enriched?.resources.staff;
  const type = incident?.type ?? "ops_brief";

  const title =
    type === "medical"
      ? "Medical assist response — Gate B corridor"
      : type === "weather"
        ? "Severe weather entry hold"
        : type === "crowd_surge"
          ? "Open overflow + rebalance arrival wave"
          : "Ops decision brief";

  const situation =
    incident?.summary ??
    input.prompt ??
    `Venue risk ${risk.severity} (score ${risk.score}). Drivers: ${risk.drivers.join("; ") || "nominal"}.`;

  const resources = [
    medical
      ? {
          nodeId: medical.id,
          label: medical.name,
          why: "Nearest medical / AED resource on ADA path",
        }
      : {
          nodeId: "med-b",
          label: "Medical Post B",
          why: "Primary AED cabinet east side",
        },
    staff
      ? {
          nodeId: staff.id,
          label: staff.name,
          why: "Closest volunteer/staff post for ground truth",
        }
      : {
          nodeId: "staff-north",
          label: "Volunteer Post North",
          why: "Default coordination post",
        },
  ];

  let actions = [
    {
      who: "ops" as Role,
      step: `Acknowledge incident in ${zoneId} and freeze conflicting gate closures.`,
    },
    {
      who: "volunteer" as Role,
      step: "Deploy calm redirect phrases; keep lanes moving; radio updates every 3 minutes.",
    },
    {
      who: "staff" as Role,
      step: "Stage nearest medical/elevator path clear if needed.",
    },
  ];

  let comms = [
    {
      audience: "fans_outdoor_queue",
      language: "en",
      channel: "pa" as const,
      draft:
        "Attention guests: we are balancing entries across gates. Gate D may open for faster screening. Thank you for your patience.",
    },
    {
      audience: "fans_outdoor_queue",
      language: "es",
      channel: "pa" as const,
      draft:
        "Atención: estamos equilibrando las entradas. La Puerta D puede abrir para un acceso más rápido. Gracias por su paciencia.",
    },
    {
      audience: "volunteers",
      language: "en",
      channel: "radio" as const,
      draft: `Relay: ${title}. Hold positions near ${zoneId}. Escalate criticals to Ops Hub.`,
    },
  ];

  let sustainabilityNote =
    "Rebalancing to underused gates shortens curb idle time and supports higher transit boarding efficiency.";

  if (type === "medical") {
    actions = [
      {
        who: "volunteer",
        step: "Stay with guest; clear 3m space; request Medical Post B AED if unresponsive.",
      },
      {
        who: "ops",
        step: "Dispatch medical; hold Gate B lane 2; keep East Elevator clear for egress if transport needed.",
      },
      {
        who: "staff",
        step: "Meet responders at Gate B; guide via ADA walk to Medical Post B.",
      },
    ];
    comms = [
      {
        audience: "nearby_fans",
        language: "en",
        channel: "pa",
        draft:
          "Guests near Gate B: please step aside for medical staff. Other lanes remain open.",
      },
      {
        audience: "nearby_fans",
        language: "es",
        channel: "pa",
        draft:
          "Invitados cerca de la Puerta B: por favor den paso al personal médico. Otras filas siguen abiertas.",
      },
      {
        audience: "nearby_fans",
        language: "fr",
        channel: "radio",
        draft:
          "Près de la porte B: écartez-vous pour les secours. Les autres files restent ouvertes.",
      },
    ];
    sustainabilityNote = "Localized lane hold avoids full-gate shutdown and large re-queue energy spikes.";
  }

  if (type === "weather") {
    actions = [
      {
        who: "ops",
        step: "Declare weather hold; pause outdoor screening queues; move fans under cover.",
      },
      {
        who: "volunteer",
        step: "Use weather-hold phrases EN/ES/FR; no outdoor queue growth; assist ADA guests first.",
      },
      {
        who: "fan",
        step: "Remain under covered concourse edges; follow staff; do not block emergency exits.",
      },
    ];
    comms = [
      {
        audience: "all_fans",
        language: "en",
        channel: "pa",
        draft:
          "For your safety we are briefly holding entries due to lightning in the area. Please stay under cover and follow staff directions.",
      },
      {
        audience: "all_fans",
        language: "es",
        channel: "pa",
        draft:
          "Por su seguridad, las entradas están en pausa por rayos en la zona. Permanezcan bajo techo y sigan al personal.",
      },
      {
        audience: "all_fans",
        language: "fr",
        channel: "pa",
        draft:
          "Pour votre sécurité, les entrées sont suspendues brièvement en raison d'éclairs. Restez à l'abri et suivez le personnel.",
      },
    ];
    sustainabilityNote =
      "Staggered restart after hold reduces simultaneous HVAC/lighting spikes and curb congestion.";
  }

  if (type === "crowd_surge") {
    actions = [
      {
        who: "ops",
        step: "Open Gate D overflow; redirect Metro arrivals via west signage to balance Gate A/B.",
      },
      {
        who: "volunteer",
        step: "At Gate A/B deploy redirect phrases toward Gate C/D; keep ADA lane priority.",
      },
      {
        who: "staff",
        step: "Add screening capacity at Gate D; monitor South Concourse density.",
      },
    ];
  }

  const graph = getGraph();
  const { citations } = buildGroundedContext(
    graph,
    `${type} ${situation} ${zoneId}`,
    [zoneId, medical?.id, staff?.id].filter(Boolean) as string[],
  );

  const card: DecisionCard = {
    id: uid("dec"),
    incidentId: input.incidentId,
    createdAt: nowIso(),
    title,
    severity,
    situation,
    actions,
    resources,
    comms,
    sustainabilityNote,
    citations: citations.length ? citations : ["data/kb/safety.md", "data/kb/gates.md"],
    confidence: getLlmMode() === "mock" ? 0.82 : 0.9,
  };

  return DecisionCardSchema.parse(card);
}

async function liveDecisionCard(input: {
  incidentId?: string;
  prompt?: string;
  role: Role;
}): Promise<DecisionCard | null> {
  const graph = getGraph();
  const enriched = input.incidentId ? enrichIncidentContext(input.incidentId) : null;
  const incident = enriched?.incident;
  const telemetry = getTelemetry();
  const query = [incident?.summary, input.prompt, incident?.type, incident?.zoneId]
    .filter(Boolean)
    .join(" ");
  const nodeIds = [
    incident?.zoneId,
    enriched?.resources.medical?.id,
    enriched?.resources.staff?.id,
  ].filter(Boolean) as string[];
  const { context, citations } = buildGroundedContext(graph, query || "stadium ops", nodeIds);

  const system = `You are PitchRelay Decision Service for Unity Arena match-day ops.
Return ONLY valid JSON matching this schema:
{
  "title": string,
  "severity": "low"|"med"|"high"|"critical",
  "situation": string,
  "actions": [{"who":"ops"|"volunteer"|"fan"|"staff","step":string}],
  "resources": [{"nodeId":string,"label":string,"why":string}],
  "comms": [{"audience":string,"language":string,"channel":"pa"|"radio"|"push"|"signage","draft":string}],
  "sustainabilityNote": string,
  "confidence": number
}
Ground every claim in the provided context. Include at least 2 actions and 2 comms (prefer EN+ES).`;

  const user = `Role requesting: ${input.role}
Incident: ${JSON.stringify(incident ?? null)}
Telemetry snapshot ts=${telemetry.ts} weather=${JSON.stringify(telemetry.weather)}
Context:
${context}
${input.prompt ? `Additional prompt: ${input.prompt}` : ""}`;

  const raw = await llmComplete(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { json: true },
  );
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DecisionCard>;
    const card: DecisionCard = DecisionCardSchema.parse({
      id: uid("dec"),
      incidentId: input.incidentId,
      createdAt: nowIso(),
      title: parsed.title ?? "Decision",
      severity: parsed.severity ?? incident?.severity ?? "med",
      situation: parsed.situation ?? incident?.summary ?? "Ops brief",
      actions: parsed.actions ?? [],
      resources: parsed.resources ?? [],
      comms: parsed.comms ?? [],
      sustainabilityNote: parsed.sustainabilityNote,
      citations: citations,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.75,
    });
    return card;
  } catch (err) {
    console.error("[decisions] live card parse failed", err);
    return null;
  }
}

export async function generateDecisionCard(input: {
  incidentId?: string;
  prompt?: string;
  role?: Role;
}): Promise<{ card: DecisionCard; mode: "live" | "mock" }> {
  const role = input.role ?? "ops";
  let mode: "live" | "mock" = "mock";
  let card: DecisionCard | null = null;

  if (getLlmMode() === "live") {
    card = await liveDecisionCard({ ...input, role });
    if (card) mode = "live";
  }
  if (!card) {
    card = mockDecisionCard({ ...input, role });
    mode = "mock";
  }

  attachDecisionCard(input.incidentId, card);
  return { card, mode };
}
