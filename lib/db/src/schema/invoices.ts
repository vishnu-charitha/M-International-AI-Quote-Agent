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
import { ordersTable } from "./orders";
import { quotesTable } from "./quotes";
import { rfqsTable } from "./rfqs";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 40 }).notNull().unique(),
  orderId: integer("order_id").references(() => ordersTable.id).notNull(),
  quoteId: integer("quote_id").references(() => quotesTable.id),
  rfqId: integer("rfq_id").references(() => rfqsTable.id),
  customer: varchar("customer", { length: 255 }),
  customerCompany: varchar("customer_company", { length: 255 }),
  customerEmail: varchar("customer_email", { length: 255 }),
  partNumber: varchar("part_number", { length: 120 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
  tax: numeric("tax", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("USD"),
  invoiceDate: timestamp("invoice_date", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: varchar("status", { length: 40 }).notNull().default("DRAFT"),
  paymentStatus: varchar("payment_status", { length: 40 }).notNull().default("UNPAID"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable);
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
