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

export const aiAnalysesTable = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").references(() => rfqsTable.id).notNull(),
  requestType: varchar("request_type", { length: 40 }).notNull(),
  confidence: integer("confidence").notNull(),
  extractedData: jsonb("extracted_data").$type<Record<string, unknown>>().notNull(),
  missingInformation: text("missing_information"),
  humanVerified: boolean("human_verified").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalysesTable);
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type AiAnalysis = typeof aiAnalysesTable.$inferSelect;