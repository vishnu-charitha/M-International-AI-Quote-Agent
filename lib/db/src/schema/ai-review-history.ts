import { createInsertSchema } from "drizzle-zod";
import {
  integer,
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

export const aiReviewHistoryTable = pgTable("ai_review_history", {
  id: serial("id").primaryKey(),
  aiAnalysisId: integer("ai_analysis_id").references(() => aiAnalysesTable.id).notNull(),
  rfqId: integer("rfq_id").references(() => rfqsTable.id).notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  previousClassification: varchar("previous_classification", { length: 40 }).notNull(),
  newClassification: varchar("new_classification", { length: 40 }).notNull(),
  reviewerId: integer("reviewer_id").references(() => usersTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAiReviewHistorySchema = createInsertSchema(aiReviewHistoryTable);
export type InsertAiReviewHistory = z.infer<typeof insertAiReviewHistorySchema>;
export type AiReviewHistory = typeof aiReviewHistoryTable.$inferSelect;