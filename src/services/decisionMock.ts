import { DecisionCardSchema } from "@/domain/decisionSchema";
import type {
  DecisionAction,
  DecisionCard,
  DecisionComm,
  DecisionResource,
  Role,
  Severity,
} from "@/domain/types";
import { overallVenueRisk } from "@/domain/risk";
import { getGraph, getIncident, getTelemetry } from "@/lib/store";
import { nowIso, uid } from "@/lib/utils";
import { enrichIncidentContext } from "./incidents";
import { getLlmMode } from "./llm";
import { buildGroundedContext } from "./rag";

type MockInput = {
  incidentId?: string;
  prompt?: string;
  role: Role;
};

function titleForType(type: string): string {
  switch (type) {
    case "medical":
      return "Medical assist response — Gate B corridor";
    case "weather":
      return "Severe weather entry hold";
    case "crowd_surge":
      return "Open overflow + rebalance arrival wave";
    default:
      return "Ops decision brief";
  }
}

function defaultResources(
  medical?: { id: string; name: string } | null,
  staff?: { id: string; name: string } | null,
): DecisionResource[] {
  return [
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
}

function defaultActions(zoneId: string): DecisionAction[] {
  return [
    {
      who: "ops",
      step: `Acknowledge incident in ${zoneId} and freeze conflicting gate closures.`,
    },
    {
      who: "volunteer",
      step: "Deploy calm redirect phrases; keep lanes moving; radio updates every 3 minutes.",
    },
    {
      who: "staff",
      step: "Stage nearest medical/elevator path clear if needed.",
    },
  ];
}

function defaultComms(title: string, zoneId: string): DecisionComm[] {
  return [
    {
      audience: "fans_outdoor_queue",
      language: "en",
      channel: "pa",
      draft:
        "Attention guests: we are balancing entries across gates. Gate D may open for faster screening. Thank you for your patience.",
    },
    {
      audience: "fans_outdoor_queue",
      language: "es",
      channel: "pa",
      draft:
        "Atención: estamos equilibrando las entradas. La Puerta D puede abrir para un acceso más rápido. Gracias por su paciencia.",
    },
    {
      audience: "volunteers",
      language: "en",
      channel: "radio",
      draft: `Relay: ${title}. Hold positions near ${zoneId}. Escalate criticals to Ops Hub.`,
    },
  ];
}

function medicalActions(): DecisionAction[] {
  return [
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
}

function medicalComms(): DecisionComm[] {
  return [
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
}

function weatherActions(): DecisionAction[] {
  return [
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
}

function weatherComms(): DecisionComm[] {
  return [
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
}

function crowdSurgeActions(): DecisionAction[] {
  return [
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

function contentForType(
  type: string,
  title: string,
  zoneId: string,
): {
  actions: DecisionAction[];
  comms: DecisionComm[];
  sustainabilityNote: string;
} {
  const defaultNote =
    "Rebalancing to underused gates shortens curb idle time and supports higher transit boarding efficiency.";

  if (type === "medical") {
    return {
      actions: medicalActions(),
      comms: medicalComms(),
      sustainabilityNote:
        "Localized lane hold avoids full-gate shutdown and large re-queue energy spikes.",
    };
  }
  if (type === "weather") {
    return {
      actions: weatherActions(),
      comms: weatherComms(),
      sustainabilityNote:
        "Staggered restart after hold reduces simultaneous HVAC/lighting spikes and curb congestion.",
    };
  }
  if (type === "crowd_surge") {
    return {
      actions: crowdSurgeActions(),
      comms: defaultComms(title, zoneId),
      sustainabilityNote: defaultNote,
    };
  }
  return {
    actions: defaultActions(zoneId),
    comms: defaultComms(title, zoneId),
    sustainabilityNote: defaultNote,
  };
}

/** Deterministic mock decision card (default when LLM is mock/unavailable). */
export function mockDecisionCard(input: MockInput): DecisionCard {
  const enriched = input.incidentId ? enrichIncidentContext(input.incidentId) : null;
  const incident = enriched?.incident ?? getIncident(input.incidentId ?? "");
  const telemetry = getTelemetry();
  const risk = overallVenueRisk(telemetry);
  const severity: Severity = incident?.severity ?? risk.severity;
  const zoneId = incident?.zoneId ?? "zone-north";
  const medical = enriched?.resources.medical;
  const staff = enriched?.resources.staff;
  const type = incident?.type ?? "ops_brief";
  const title = titleForType(type);

  const situation =
    incident?.summary ??
    input.prompt ??
    `Venue risk ${risk.severity} (score ${risk.score}). Drivers: ${risk.drivers.join("; ") || "nominal"}.`;

  const { actions, comms, sustainabilityNote } = contentForType(type, title, zoneId);
  const resources = defaultResources(medical, staff);

  const graph = getGraph();
  const citationSeeds = [zoneId, medical?.id, staff?.id].filter(
    (id): id is string => Boolean(id),
  );
  const { citations } = buildGroundedContext(
    graph,
    `${type} ${situation} ${zoneId}`,
    citationSeeds,
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
