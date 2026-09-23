import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

export const ordersRouter = Router();

ordersRouter.get("/orders", async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const mappedOrders = orders.map((order: any) => ({
      ...order,
      rfqId: order.rfqId ? order.rfqId + 1000 : order.rfqId
    }));
    res.json(mappedOrders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

ordersRouter.get("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderId)));
    if (orders.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const order = orders[0];
    const mappedOrder = {
      ...order,
      rfqId: order.rfqId ? order.rfqId + 1000 : order.rfqId
    };
    res.json(mappedOrder);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});
