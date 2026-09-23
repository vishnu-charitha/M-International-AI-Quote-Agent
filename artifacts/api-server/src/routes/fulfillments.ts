import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { fulfillmentsTable, insertFulfillmentSchema, ordersTable, invoicesTable, aiReviewHistoryTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

// The generated Zod schema for updating fulfillment status. Let's just create one here or import from api-zod if available.
// If not available, we'll use z.object.
const UpdateFulfillmentStatusInput = z.object({
  status: z.enum(["READY", "PICKING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"]),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  expectedShipDate: z.string().optional()
});

export const fulfillmentsRouter = Router();

// GET /api/fulfillments
fulfillmentsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const records = await db.select().from(fulfillmentsTable).orderBy(desc(fulfillmentsTable.createdAt));
    
    // Map rfqId + 1000 for frontend
    const mapped = records.map((f: any) => ({
      ...f,
      rfqId: f.rfqId ? f.rfqId + 1000 : null
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching fulfillments:", error);
    res.status(500).json({ error: "Failed to fetch fulfillments" });
  }
});

// GET /api/fulfillments/:fulfillmentId
fulfillmentsRouter.get("/:fulfillmentId", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.fulfillmentId as string, 10);
    const [fulfillment] = await db
      .select()
      .from(fulfillmentsTable)
      .where(eq(fulfillmentsTable.id, id))
      .limit(1);

    if (!fulfillment) {
      res.status(404).json({ error: "Fulfillment not found" });
      return;
    }

    res.json({
      ...fulfillment,
      rfqId: fulfillment.rfqId ? fulfillment.rfqId + 1000 : null
    });
  } catch (error) {
    console.error("Error fetching fulfillment:", error);
    res.status(500).json({ error: "Failed to fetch fulfillment" });
  }
});

// POST /api/orders/:orderId/fulfillment
fulfillmentsRouter.post("/order/:orderId", async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId as string, 10);

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.orderId, orderId))
      .limit(1);

    if (!invoice) {
      res.status(400).json({ error: "Invoice not found for this order" });
      return;
    }

    if (invoice.paymentStatus !== "PAID") {
      res.status(400).json({ error: "Invoice payment must be completed before fulfillment can begin" });
      return;
    }

    const [existing] = await db
      .select()
      .from(fulfillmentsTable)
      .where(eq(fulfillmentsTable.orderId, orderId))
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Fulfillment already exists for this order" });
      return;
    }

    const timestampStr = Date.now().toString().slice(-4);
    const fulfillmentNumber = `FUL-2026-${timestampStr}`;

    const newFulfillment = {
      fulfillmentNumber,
      orderId: order.id,
      invoiceId: invoice.id,
      quoteId: order.quoteId,
      rfqId: order.rfqId,
      customer: order.customer,
      customerCompany: order.customerCompany,
      partNumber: order.partNumber,
      quantity: order.quantity,
      status: "READY" as const,
    };

    const parsed = insertFulfillmentSchema.parse(newFulfillment);

    const [created] = await db
      .insert(fulfillmentsTable)
      .values(parsed)
      .returning();
      
    await db.insert(aiReviewHistoryTable).values({
      rfqId: order.rfqId!,
      action: "fulfillment_created",
      previousClassification: order.status || "",
      newClassification: "READY",
      notes: `Fulfillment ${fulfillmentNumber} created`,
    });

    res.json({
      ...created,
      rfqId: created.rfqId ? created.rfqId + 1000 : null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    console.error("Error creating fulfillment:", error);
    res.status(500).json({ error: "Failed to create fulfillment" });
  }
});

// POST /api/fulfillments/:fulfillmentId/status
fulfillmentsRouter.post("/:fulfillmentId/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.fulfillmentId as string, 10);
    const body = UpdateFulfillmentStatusInput.parse(req.body);

    const [fulfillment] = await db
      .select()
      .from(fulfillmentsTable)
      .where(eq(fulfillmentsTable.id, id))
      .limit(1);

    if (!fulfillment) {
      res.status(404).json({ error: "Fulfillment not found" });
      return;
    }

    const currentStatus = fulfillment.status;
    const newStatus = body.status;
    
    // Validate transitions
    const validTransitions: Record<string, string[]> = {
      "READY": ["PICKING", "CANCELLED"],
      "PICKING": ["PACKED", "CANCELLED"],
      "PACKED": ["SHIPPED", "CANCELLED"],
      "SHIPPED": ["DELIVERED"],
      "DELIVERED": ["COMPLETED"],
      "COMPLETED": [],
      "CANCELLED": []
    };
    
    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${newStatus}` });
      return;
    }
    
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };
    
    if (newStatus === "SHIPPED") {
      if (!body.carrier || !body.trackingNumber) {
        res.status(400).json({ error: "Carrier and tracking number are required to ship" });
        return;
      }
      updateData.carrier = body.carrier;
      updateData.trackingNumber = body.trackingNumber;
      if (body.expectedShipDate) {
        updateData.expectedShipDate = new Date(body.expectedShipDate);
      }
      updateData.shippedAt = new Date();
    } else if (newStatus === "DELIVERED") {
      updateData.deliveredAt = new Date();
    } else if (newStatus === "COMPLETED") {
      updateData.completedAt = new Date();
    }
    
    const [updated] = await db
      .update(fulfillmentsTable)
      .set(updateData)
      .where(eq(fulfillmentsTable.id, id))
      .returning();
      
    await db.insert(aiReviewHistoryTable).values({
      rfqId: fulfillment.rfqId!,
      action: `fulfillment_${newStatus.toLowerCase()}`,
      previousClassification: currentStatus,
      newClassification: newStatus,
      notes: `Fulfillment marked as ${newStatus}`,
    });

    res.json({
      ...updated,
      rfqId: updated.rfqId ? updated.rfqId + 1000 : null
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    console.error("Error updating fulfillment status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});
