import { z } from "zod";

export const SeveritySchema = z.enum(["low", "med", "high", "critical"]);

export const RoleSchema = z.enum(["fan", "volunteer", "ops", "staff"]);

export const DecisionActionSchema = z.object({
  who: RoleSchema,
  step: z.string().min(1),
});

export const DecisionResourceSchema = z.object({
  nodeId: z.string().min(1),
  label: z.string().min(1),
  why: z.string().min(1),
});

export const DecisionCommSchema = z.object({
  audience: z.string().min(1),
  language: z.string().min(2),
  channel: z.enum(["pa", "radio", "push", "signage"]),
  draft: z.string().min(1),
});

export const DecisionCardSchema = z.object({
  id: z.string().min(1),
  incidentId: z.string().optional(),
  createdAt: z.string().min(1),
  title: z.string().min(1),
  severity: SeveritySchema,
  situation: z.string().min(1),
  actions: z.array(DecisionActionSchema).min(1),
  resources: z.array(DecisionResourceSchema).default([]),
  comms: z.array(DecisionCommSchema).min(1),
  sustainabilityNote: z.string().optional(),
  citations: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export const AssistBodySchema = z.object({
  message: z.string().min(1).max(2000),
  role: RoleSchema.default("fan"),
  lang: z.string().min(2).max(8).optional(),
  ada: z.boolean().optional(),
  fromNodeId: z.string().optional(),
  toNodeId: z.string().optional(),
});

export const DecisionBodySchema = z.object({
  incidentId: z.string().optional(),
  prompt: z.string().optional(),
  role: RoleSchema.default("ops"),
});

export const IncidentBodySchema = z.object({
  type: z.string().min(1),
  severity: SeveritySchema.default("med"),
  zoneId: z.string().min(1),
  summary: z.string().min(1),
  assignedRole: RoleSchema.optional(),
});

export type DecisionCardInput = z.infer<typeof DecisionCardSchema>;
