import {
  addIncident,
  getIncident,
  listIncidents,
  updateIncident,
} from "@/lib/store";
import type { Incident, Role, Severity } from "@/domain/types";
import { findNearest, getNode } from "@/domain/graph";
import { getGraph } from "@/lib/store";

export function listAllIncidents() {
  return listIncidents();
}

export function createIncident(input: {
  type: string;
  severity: Severity;
  zoneId: string;
  summary: string;
  assignedRole?: Role;
}): Incident {
  return addIncident(input);
}

export function setIncidentStatus(id: string, status: Incident["status"]) {
  return updateIncident(id, { status });
}

export function escalateIncident(id: string) {
  return updateIncident(id, { status: "escalated", assignedRole: "ops" });
}

export function enrichIncidentContext(incidentId: string) {
  const incident = getIncident(incidentId);
  const graph = getGraph();
  if (!incident) return null;

  const zone = getNode(graph, incident.zoneId);
  const fromId = incident.zoneId;
  const medical = findNearest(graph, fromId, (n) => n.type === "medical", {
    adaOnly: true,
  });
  const staff = findNearest(graph, fromId, (n) => n.type === "staff_post", {
    adaOnly: true,
  });
  const exit = findNearest(graph, fromId, (n) => n.type === "exit", {
    adaOnly: true,
  });
  const elevator = findNearest(graph, fromId, (n) => n.type === "elevator", {
    adaOnly: true,
  });

  return {
    incident,
    zone,
    resources: {
      medical,
      staff,
      exit,
      elevator,
    },
  };
}
