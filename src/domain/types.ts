/** Core domain types for PitchRelay stadium knowledge graph + ops. */

export type NodeType =
  | "gate"
  | "zone"
  | "seat_block"
  | "amenity"
  | "transport"
  | "medical"
  | "exit"
  | "elevator"
  | "staff_post"
  | "concession"
  | "restroom"
  | "sensory";

export type EdgeKind = "walk" | "elevator" | "stairs" | "restricted" | "ramp";

export type Severity = "low" | "med" | "high" | "critical";

export type Role = "fan" | "volunteer" | "ops" | "staff";

export type IncidentStatus = "open" | "acknowledged" | "resolved" | "escalated";

export interface Coords {
  x: number;
  y: number;
}

export interface AccessibilityInfo {
  wheelchair: boolean;
  sensory?: boolean;
}

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  floor: number;
  coords: Coords;
  tags: string[];
  accessibility: AccessibilityInfo;
  zoneId?: string;
  description?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  weightMeters: number;
  crowdFactor?: number;
  ada: boolean;
  bidirectional?: boolean;
}

export interface StadiumMeta {
  venueName: string;
  city: string;
  capacity: number;
  hostProfile: string;
  floors: number;
}

export interface StadiumGraph {
  meta: StadiumMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ZoneTelemetry {
  density: number; // 0-1
  queueMin: number;
  status: "clear" | "busy" | "congested" | "closed";
}

export interface TransportTelemetry {
  hubId: string;
  etaMin: number;
  mode: string;
  delayMin: number;
}

export interface WeatherTelemetry {
  condition: string;
  tempC: number;
  alert?: string;
}

export interface SustainabilityTelemetry {
  energyKw: number;
  wasteFillPct: number;
  transitSharePct: number;
}

export interface TelemetrySnapshot {
  ts: string;
  zones: Record<string, ZoneTelemetry>;
  transport: TransportTelemetry[];
  weather: WeatherTelemetry;
  sustainability: SustainabilityTelemetry;
}

export interface DecisionAction {
  who: Role;
  step: string;
}

export interface DecisionResource {
  nodeId: string;
  label: string;
  why: string;
}

export interface DecisionComm {
  audience: string;
  language: string;
  channel: "pa" | "radio" | "push" | "signage";
  draft: string;
}

export interface DecisionCard {
  id: string;
  incidentId?: string;
  createdAt: string;
  title: string;
  severity: Severity;
  situation: string;
  actions: DecisionAction[];
  resources: DecisionResource[];
  comms: DecisionComm[];
  sustainabilityNote?: string;
  citations: string[];
  confidence: number;
}

export interface Incident {
  id: string;
  ts: string;
  type: string;
  severity: Severity;
  zoneId: string;
  summary: string;
  status: IncidentStatus;
  decisionCards: DecisionCard[];
  assignedRole?: Role;
}

export interface RouteResult {
  nodeIds: string[];
  edgeIds: string[];
  totalMeters: number;
  ada: boolean;
  steps: string[];
  from: string;
  to: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  lang?: string;
  route?: { nodeIds: string[]; ada: boolean };
  citations?: string[];
}

export interface AssistRequest {
  message: string;
  role: Role;
  lang?: string;
  ada?: boolean;
  fromNodeId?: string;
  toNodeId?: string;
}

export interface AssistResponse {
  answer: string;
  lang: string;
  route?: RouteResult;
  citations: string[];
  mode: "live" | "mock";
}

export type LlmMode = "live" | "mock";
