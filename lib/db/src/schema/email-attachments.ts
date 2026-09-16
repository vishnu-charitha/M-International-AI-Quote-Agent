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
import { emailsTable } from "./emails";

export const emailAttachmentsTable = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  emailId: integer("email_id").references(() => emailsTable.id).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 160 }).notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path"),
  extractedText: text("extracted_text"),
  processingStatus: varchar("processing_status", { length: 40 }).default("PENDING").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertEmailAttachmentSchema = createInsertSchema(emailAttachmentsTable);
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;
export type EmailAttachment = typeof emailAttachmentsTable.$inferSelect;