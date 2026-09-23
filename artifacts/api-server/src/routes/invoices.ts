import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, ordersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

export const invoicesRouter = Router();

// List invoices
invoicesRouter.get("/invoices", async (req, res) => {
  try {
    const invoices = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
    const mappedInvoices = invoices.map((inv: any) => ({
      ...inv,
      rfqId: inv.rfqId ? inv.rfqId + 1000 : inv.rfqId
    }));
    res.json(mappedInvoices);
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// Get single invoice
invoicesRouter.get("/invoices/:invoiceId", async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.id, Number(invoiceId)));
    if (invoices.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const invoice = invoices[0];
    const mappedInvoice = {
      ...invoice,
      rfqId: invoice.rfqId ? invoice.rfqId + 1000 : invoice.rfqId
    };
    res.json(mappedInvoice);
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// Create invoice from order
invoicesRouter.post("/orders/:orderId/invoices", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Check if order exists
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderId)));
    if (orders.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const order = orders[0];
    
    // Check if invoice already exists
    const existingInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, order.id));
    if (existingInvoices.length > 0) {
      const existing = existingInvoices[0];
      res.json({
        ...existing,
        rfqId: existing.rfqId ? existing.rfqId + 1000 : existing.rfqId
      });
      return;
    }
    
    // Generate invoice number
    const invoiceNumber = "INV-2026-" + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    
    const [newInvoice] = await db.insert(invoicesTable).values({
      invoiceNumber,
      orderId: order.id,
      quoteId: order.quoteId,
      rfqId: order.rfqId,
      customer: order.customer,
      customerCompany: order.customerCompany,
      customerEmail: null,
      partNumber: order.partNumber,
      quantity: order.quantity,
      totalAmount: order.acceptedValue,
      status: "DRAFT",
      paymentStatus: "UNPAID",
    }).returning();
    
    res.json({
      ...newInvoice,
      rfqId: newInvoice.rfqId ? newInvoice.rfqId + 1000 : newInvoice.rfqId
    });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Issue invoice
invoicesRouter.post("/invoices/:invoiceId/issue", async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.id, Number(invoiceId)));
    
    if (invoices.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const invoice = invoices[0];
    if (invoice.status === 'CANCELLED') {
      res.status(400).json({ error: "Cannot issue a cancelled invoice" });
      return;
    }
    
    const [updatedInvoice] = await db.update(invoicesTable)
      .set({ status: 'ISSUED', updatedAt: new Date() })
      .where(eq(invoicesTable.id, Number(invoiceId)))
      .returning();
      
    res.json({
      ...updatedInvoice,
      rfqId: updatedInvoice.rfqId ? updatedInvoice.rfqId + 1000 : updatedInvoice.rfqId
    });
  } catch (error) {
    console.error("Failed to issue invoice:", error);
    res.status(500).json({ error: "Failed to issue invoice" });
  }
});

// Simulate payment
invoicesRouter.post("/invoices/:invoiceId/payment", async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { action } = req.body;
    
    if (action !== 'PAID') {
      res.status(400).json({ error: "Invalid action" });
      return;
    }
    
    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.id, Number(invoiceId)));
    
    if (invoices.length === 0) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const [updatedInvoice] = await db.update(invoicesTable)
      .set({ status: 'PAID', paymentStatus: 'PAID', updatedAt: new Date() })
      .where(eq(invoicesTable.id, Number(invoiceId)))
      .returning();
      
    res.json({
      ...updatedInvoice,
      rfqId: updatedInvoice.rfqId ? updatedInvoice.rfqId + 1000 : updatedInvoice.rfqId
    });
  } catch (error) {
    console.error("Failed to process payment:", error);
    res.status(500).json({ error: "Failed to process payment" });
  }
});
