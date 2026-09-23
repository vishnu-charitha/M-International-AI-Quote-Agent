import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { rfqsTable } from "./rfqs";
import { quotesTable } from "./quotes";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  rfqId: integer("rfq_id").references(() => rfqsTable.id).notNull(),
  quoteId: integer("quote_id").references(() => quotesTable.id).notNull(),
  customer: varchar("customer", { length: 255 }),
  customerCompany: varchar("customer_company", { length: 255 }),
  partNumber: varchar("part_number", { length: 120 }).notNull(),
  quantity: integer("quantity").notNull(),
  acceptedValue: numeric("accepted_value", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("CREATED"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
