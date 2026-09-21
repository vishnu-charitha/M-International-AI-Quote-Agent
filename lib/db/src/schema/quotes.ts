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

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: varchar("quote_number", { length: 40 }).notNull().unique(),
  rfqId: integer("rfq_id").references(() => rfqsTable.id).notNull(),
  customer: varchar("customer", { length: 255 }),
  customerCompany: varchar("customer_company", { length: 255 }),
  partNumber: varchar("part_number", { length: 120 }).notNull(),
  description: varchar("description", { length: 500 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  discount: numeric("discount", { precision: 12, scale: 2 }),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }),
  tax: numeric("tax", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  availability: varchar("availability", { length: 100 }),
  leadTime: varchar("lead_time", { length: 100 }),
  warranty: varchar("warranty", { length: 100 }),
  validity: varchar("validity", { length: 100 }),
  status: varchar("status", { length: 40 }).notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable);
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
