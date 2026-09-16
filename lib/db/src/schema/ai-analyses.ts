import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { rfqsTable } from "./rfqs";
import { emailsTable } from "./emails";

export const aiAnalysesTable = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").references(() => emailsTable.id),
  rfqId: integer("rfq_id").references(() => rfqsTable.id),
  requestType: varchar("request_type", { length: 40 }).notNull(),
  confidence: integer("confidence").notNull(),
  analysisStatus: varchar("analysis_status", { length: 40 }).default("COMPLETED").notNull(),
  emailClassification: varchar("email_classification", { length: 40 }),
  confidenceScore: integer("confidence_score"),
  extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().notNull(),
  missingInformation: text("missing_information"),
  humanVerified: boolean("human_verified").default(false).notNull(),
  reasoningSummary: text("reasoning_summary"),
  requiresHumanReview: boolean("requires_human_review").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalysesTable);
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type AiAnalysis = typeof aiAnalysesTable.$inferSelect;