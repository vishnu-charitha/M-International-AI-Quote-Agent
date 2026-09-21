import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { quotesTable, rfqsTable, rfqItemsTable, inventoryTable, partCatalogTable, customersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { isMicrosoftConfigured, sendEmailWithAttachment } from "../services/microsoft-graph";
import { rfqDetails } from "../services/mock-data";

export const quotesRouter = Router();

quotesRouter.get("/rfqs/:rfqId/quotes", async (req, res) => {
  const { rfqId } = req.params;
  const numRfqId = Number(rfqId);
  const realRfqId = numRfqId > 1000 ? numRfqId - 1000 : numRfqId;
  
  const quotes = await db.select().from(quotesTable).where(eq(quotesTable.rfqId, realRfqId)).orderBy(desc(quotesTable.createdAt));
  
  // Map back to frontend offset
  const mappedQuotes = quotes.map((q: any) => ({
    ...q,
    rfqId: numRfqId > 1000 ? q.rfqId + 1000 : q.rfqId
  }));
  
  res.json(mappedQuotes);
});

quotesRouter.post("/rfqs/:rfqId/quotes", async (req, res) => {
  const { rfqId } = req.params;
  const numRfqId = Number(rfqId);
  console.log("Generating quote for RFQ ID:", rfqId, "type:", typeof rfqId);
  
  let rfq: any = null;
  let customer: any = null;
  let item: any = null;

  if (numRfqId > 1000) {
    const realRfqId = numRfqId - 1000;
    const rfqResults = await db.select().from(rfqsTable).where(eq(rfqsTable.id, realRfqId));
    rfq = rfqResults[0];

    if (rfq) {
      // Check if a quote already exists for this realRfqId
      const existingQuotes = await db.select().from(quotesTable).where(eq(quotesTable.rfqId, realRfqId));
      if (existingQuotes.length > 0) {
        // Ensure the RFQ is synced to QUOTED even if the quote already exists
        await db.update(rfqsTable).set({ status: "QUOTED" }).where(eq(rfqsTable.id, realRfqId));

        const mappedQuote = {
          ...existingQuotes[0],
          rfqId: numRfqId > 1000 ? existingQuotes[0].rfqId + 1000 : existingQuotes[0].rfqId
        };
        res.json(mappedQuote);
        return;
      }

      const customerResults = await db.select().from(customersTable).where(eq(customersTable.id, rfq.customerId));
      customer = customerResults[0];

      const items = await db.select().from(rfqItemsTable).where(eq(rfqItemsTable.rfqId, realRfqId));
      item = items[0];
    }
  }

  if (!rfq && numRfqId <= 1000) {
    // Mock data for hardcoded RFQs (IDs <= 1000)
    rfq = { id: numRfqId, rfqNumber: `RFQ-MOCK-${numRfqId}` };
    customer = { name: "Mock Customer", companyName: "Mock Company" };
    item = { partNumber: "MOCK-PART", quantity: 1, description: "Mock Description" };
  } else if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }



  let unitPrice = 0;
  if (item) {
    const catalogResults = await db.select().from(partCatalogTable).where(eq(partCatalogTable.partNumber, item.partNumber));
    const catalogItem = catalogResults[0];
    if (catalogItem) {
      unitPrice = Number(catalogItem.basePrice || 0);
    } else {
      unitPrice = 500; // Demo fallback
    }
  }

  const quantity = item?.quantity || 1;
  const subtotal = unitPrice * quantity;
  const tax = subtotal * 0.08;
  const shippingCost = 50;
  const totalAmount = subtotal + tax + shippingCost;

  const quoteNumber = `QT-2026-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;

  const realRfqId = numRfqId > 1000 ? numRfqId - 1000 : numRfqId;

  const [newQuote] = await db.insert(quotesTable).values({
    quoteNumber,
    rfqId: realRfqId,
    customer: customer?.name || "Unknown Customer",
    customerCompany: customer?.companyName || "Unknown Company",
    partNumber: item?.partNumber || "UNKNOWN",
    description: item?.description || "Requested Part",
    quantity,
    unitPrice: unitPrice.toString(),
    subtotal: subtotal.toString(),
    discount: "0",
    shippingCost: shippingCost.toString(),
    tax: tax.toString(),
    totalAmount: totalAmount.toString(),
    currency: "USD",
    availability: "In Stock",
    leadTime: "2 Days",
    warranty: "1 Year",
    validity: "30 Days",
    status: "DRAFT"
  }).returning();

  // Map back to frontend offset
  const mappedQuote = {
    ...newQuote,
    rfqId: numRfqId > 1000 ? newQuote.rfqId + 1000 : newQuote.rfqId
  };

  // Update RFQ status to QUOTED
  if (numRfqId > 1000) {
    await db.update(rfqsTable).set({ status: "QUOTED" }).where(eq(rfqsTable.id, realRfqId));
  } else {
    const summary = rfqDetails.find((r) => r.id === numRfqId);
    if (summary) {
      summary.status = "QUOTED" as any;
    }
  }

  res.json(mappedQuote);
});

quotesRouter.get("/quotes/:quoteId", async (req, res) => {
  const { quoteId } = req.params;
  const quoteResults = await db.select().from(quotesTable).where(eq(quotesTable.id, Number(quoteId)));
  const quote = quoteResults[0];

  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  
  // Map back to frontend offset if needed (assuming frontend sends real quoteId but expects offset rfqId)
  const mappedQuote = {
    ...quote,
    rfqId: quote.rfqId ? (quote.rfqId + 1000) : quote.rfqId // For quotes created against offset RFQs, rfqId will be 1-N. So add 1000. Actually, all DB RFQs have offset. So we always add 1000 if it exists. But wait, what if the quote was made for a mock RFQ? Let's just blindly add 1000 if we assume it's from db. Actually better:
  };
  mappedQuote.rfqId = mappedQuote.rfqId + 1000;
  
  res.json(mappedQuote);
});

quotesRouter.patch("/quotes/:quoteId/status", async (req, res) => {
  const { quoteId } = req.params;
  const { status } = req.body;

  const [updatedQuote] = await db.update(quotesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(quotesTable.id, Number(quoteId)))
    .returning();

  if (updatedQuote && updatedQuote.rfqId) {
    await db.update(rfqsTable).set({ status: "QUOTED" }).where(eq(rfqsTable.id, updatedQuote.rfqId));
  }

  res.json(updatedQuote);
});

quotesRouter.post("/quotes/:quoteId/send", async (req, res) => {
  const { quoteId } = req.params;
  const { pdfBase64 } = req.body;

  if (!isMicrosoftConfigured()) {
    res.status(400).json({ error: "Microsoft 365 email integration is not configured." });
    return;
  }

  if (!pdfBase64) {
    res.status(400).json({ error: "PDF attachment is required." });
    return;
  }

  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, Number(quoteId)));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  if (quote.status !== "APPROVED") {
    res.status(400).json({ error: "Only APPROVED quotes can be sent." });
    return;
  }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, quote.rfqId));
  if (!rfq || !rfq.customerId) {
    res.status(400).json({ error: "Could not locate associated RFQ or Customer ID." });
    return;
  }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, rfq.customerId));
  if (!customer || !customer.email) {
    res.status(400).json({ error: "Customer email address is not available." });
    return;
  }

  const subject = `Quotation ${quote.quoteNumber} - M International`;
  const body = `Dear ${customer.name},

Please find attached our quotation ${quote.quoteNumber} for your requested aircraft component.

Quotation Total: $${Number(quote.totalAmount || 0).toFixed(2)}

The quotation includes the applicable pricing, availability, lead time, warranty, and validity information.

Please review the attached quotation and let us know if you would like to proceed.

Regards,
M International
Global Aviation Support & Services`;

  try {
    // pdfBase64 might come with a data URI prefix, strip it if present
    const base64Content = pdfBase64.includes("base64,") ? pdfBase64.split("base64,")[1] : pdfBase64;
    
    await sendEmailWithAttachment(
      customer.email,
      subject,
      body,
      { name: `M-International-Quote-${quote.quoteNumber}.pdf`, contentBytes: base64Content }
    );
  } catch (error: any) {
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
    return;
  }

  // Update status to SENT
  const [updatedQuote] = await db
    .update(quotesTable)
    .set({ status: "SENT", updatedAt: new Date() })
    .where(eq(quotesTable.id, Number(quoteId)))
    .returning();

  if (updatedQuote && updatedQuote.rfqId) {
    await db.update(rfqsTable).set({ status: "QUOTED" }).where(eq(rfqsTable.id, updatedQuote.rfqId));
  }

  // Map back to frontend offset
  const mappedQuote = {
    ...updatedQuote,
    rfqId: updatedQuote.rfqId + 1000
  };

  res.json(mappedQuote);
});
