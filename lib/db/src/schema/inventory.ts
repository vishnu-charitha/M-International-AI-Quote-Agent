import { pgTable, serial, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 255 }).notNull(),
  availableQty: integer("available_qty").notNull().default(0),
  reservedQty: integer("reserved_qty").notNull().default(0),
  warehouseLocation: varchar("warehouse_location", { length: 255 }),
  supplier: varchar("supplier", { length: 255 }),
  condition: varchar("condition", { length: 100 }),
  expectedReplenishmentDate: timestamp("expected_replenishment_date"),
  isDemoData: boolean("is_demo_data").default(false),
});
