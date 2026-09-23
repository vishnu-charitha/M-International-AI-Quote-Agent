import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { rfqsTable } from "./rfqs";

export const emailOutboxTable = pgTable("email_outbox", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id"), // Removed FK to allow mock data IDs (<= 1000)
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  bodyText: text("body_text").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("DEVELOPMENT_MODE_LOGGED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
