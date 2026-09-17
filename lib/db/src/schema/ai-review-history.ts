import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { aiAnalysesTable } from "./ai-analyses";
import { rfqsTable } from "./rfqs";
import { usersTable } from "./users";
import { emailsTable } from "./emails";

export const aiReviewHistoryTable = pgTable("ai_review_history", {
  id: serial("id").primaryKey(),
  aiAnalysisId: integer("ai_analysis_id").references(() => aiAnalysesTable.id),
  rfqId: integer("rfq_id").references(() => rfqsTable.id).notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  previousClassification: varchar("previous_classification", { length: 40 }),
  newClassification: varchar("new_classification", { length: 40 }),
  previousExtractedData: jsonb("previous_extracted_data").$type<Record<string, unknown>>(),
  updatedExtractedData: jsonb("updated_extracted_data").$type<Record<string, unknown>>(),
  emailId: integer("email_id").references(() => emailsTable.id),
  reviewerId: integer("reviewer_id").references(() => usersTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiReviewHistorySchema = createInsertSchema(aiReviewHistoryTable);
export type InsertAiReviewHistory = z.infer<typeof insertAiReviewHistorySchema>;
export type AiReviewHistory = typeof aiReviewHistoryTable.$inferSelect;