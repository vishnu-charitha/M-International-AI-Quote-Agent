import { pgTable, serial, varchar, text, integer, decimal, boolean } from "drizzle-orm/pg-core";

export const partCatalogTable = pgTable("part_catalog", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 255 }).notNull().unique(),
  description: text("description"),
  aircraft: varchar("aircraft", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  manufacturerPartNumber: varchar("manufacturer_part_number", { length: 255 }),
  alternatePartNumbers: text("alternate_part_numbers"), // Comma-separated or JSON string
  category: varchar("category", { length: 255 }),
  condition: varchar("condition", { length: 100 }), // e.g. NE, NS, SV, OH, AR
  certification: varchar("certification", { length: 255 }), // e.g. FAA 8130-3, EASA Form 1, COC
  basePrice: decimal("base_price", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  supplier: varchar("supplier", { length: 255 }),
  leadTimeDays: integer("lead_time_days"),
  isDemoData: boolean("is_demo_data").default(false),
});
