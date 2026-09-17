import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { rfqsTable } from "./rfqs";

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  messageId: varchar("message_id", { length: 255 }).notNull().unique(),
  microsoftMessageId: varchar("microsoft_message_id", { length: 255 }),
  internetMessageId: varchar("internet_message_id", { length: 512 }),
  conversationId: varchar("conversation_id", { length: 255 }),
  sender: varchar("sender", { length: 160 }).notNull(),
  senderName: varchar("sender_name", { length: 160 }),
  senderEmail: varchar("sender_email", { length: 320 }),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  recipientEmails: text("recipient_emails").array(),
  ccEmails: text("cc_emails").array(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  emailType: varchar("email_type", { length: 40 }),
  processingStatus: varchar("processing_status", { length: 40 }).default("NEW").notNull(),
  aiProcessed: boolean("ai_processed").default(false).notNull(),
  aiConfidence: integer("ai_confidence"),
  reviewRequired: boolean("review_required").default(false).notNull(),
  errorMessage: text("error_message"),
  rfqId: integer("rfq_id").references(() => rfqsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertEmailSchema = createInsertSchema(emailsTable);
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;