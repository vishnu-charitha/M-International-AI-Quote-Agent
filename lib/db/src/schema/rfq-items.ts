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
import { rfqsTable } from "./rfqs";

export const rfqItemsTable = pgTable("rfq_items", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").references(() => rfqsTable.id).notNull(),
  partNumber: varchar("part_number", { length: 120 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  condition: varchar("condition", { length: 80 }),
  requestedCondition: varchar("requested_condition", { length: 80 }),
  certificationRequirements: jsonb("certification_requirements").$type<string[]>().default([]).notNull(),
  requestType: varchar("request_type", { length: 40 }),
  leadTimeRequirements: text("lead_time_requirements"),
  shippingRequirements: text("shipping_requirements"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRfqItemSchema = createInsertSchema(rfqItemsTable);
export type InsertRfqItem = z.infer<typeof insertRfqItemSchema>;
export type RfqItem = typeof rfqItemsTable.$inferSelect;