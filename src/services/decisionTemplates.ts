/**
 * Pure Decision Card content templates by incident type.
 * Kept free of store/LLM I/O so templates are easy to review and unit-test.
 */
import type { DecisionAction, DecisionComm, DecisionResource } from "@/domain/types";

export type DecisionTemplate = {
  title: string;
  actions: DecisionAction[];
  comms: DecisionComm[];
  sustainabilityNote: string;
};

const DEFAULT_SUSTAIN =
  "Rebalancing to underused gates shortens curb idle time and supports higher transit boarding efficiency.";

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

const MEDICAL: DecisionTemplate = {
  title: "Medical assist response — Gate B corridor",
  actions: [
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
  ],
  comms: [
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
  ],
  sustainabilityNote:
    "Localized lane hold avoids full-gate shutdown and large re-queue energy spikes.",
};

const WEATHER: DecisionTemplate = {
  title: "Severe weather entry hold",
  actions: [
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
  ],
  comms: [
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
  ],
  sustainabilityNote:
    "Staggered restart after hold reduces simultaneous HVAC/lighting spikes and curb congestion.",
};

const CROWD_SURGE_TITLE = "Open overflow + rebalance arrival wave";

export function templateForIncidentType(
  type: string,
  zoneId: string,
): DecisionTemplate {
  if (type === "medical") return MEDICAL;
  if (type === "weather") return WEATHER;
  if (type === "crowd_surge") {
    return {
      title: CROWD_SURGE_TITLE,
      actions: [
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
      ],
      comms: defaultComms(CROWD_SURGE_TITLE, zoneId),
      sustainabilityNote: DEFAULT_SUSTAIN,
    };
  }

  const title = "Ops decision brief";
  return {
    title,
    actions: defaultActions(zoneId),
    comms: defaultComms(title, zoneId),
    sustainabilityNote: DEFAULT_SUSTAIN,
  };
}

export function defaultResources(
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
