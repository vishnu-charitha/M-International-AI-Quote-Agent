import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  rfqNumber: varchar("rfq_number", { length: 40 }).notNull().unique(),
  source: varchar("source", { length: 30 }).notNull(),
  customerId: integer("customer_id").references(() => customersTable.id).notNull(),
  requestType: varchar("request_type", { length: 40 }).notNull(),
  confidence: integer("confidence").notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRfqSchema = createInsertSchema(rfqsTable);
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;