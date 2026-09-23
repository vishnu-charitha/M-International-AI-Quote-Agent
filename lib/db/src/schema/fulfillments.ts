import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { invoicesTable } from "./invoices";
import { quotesTable } from "./quotes";
import { rfqsTable } from "./rfqs";

export const fulfillmentsTable = pgTable("fulfillments", {
  id: serial("id").primaryKey(),
  fulfillmentNumber: varchar("fulfillment_number", { length: 40 }).notNull().unique(),
  orderId: integer("order_id").references(() => ordersTable.id).notNull().unique(),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id).notNull(),
  quoteId: integer("quote_id").references(() => quotesTable.id),
  rfqId: integer("rfq_id").references(() => rfqsTable.id),
  customer: varchar("customer", { length: 255 }),
  customerCompany: varchar("customer_company", { length: 255 }),
  partNumber: varchar("part_number", { length: 120 }).notNull(),
  quantity: integer("quantity").notNull(),
  status: varchar("status", { length: 40 }).notNull().default("READY"),
  warehouseLocation: varchar("warehouse_location", { length: 255 }),
  assignedTo: varchar("assigned_to", { length: 255 }),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  carrier: varchar("carrier", { length: 255 }),
  expectedShipDate: timestamp("expected_ship_date", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFulfillmentSchema = createInsertSchema(fulfillmentsTable);
export type InsertFulfillment = z.infer<typeof insertFulfillmentSchema>;
export type Fulfillment = typeof fulfillmentsTable.$inferSelect;
