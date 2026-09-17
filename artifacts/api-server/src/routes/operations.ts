import { Router, type IRouter } from "express";
import {
  GetDashboardResponse,
  GetRfqParams,
  GetRfqResponse,
  ListAiReviewsResponse,
  ListEmailsResponse,
  ListRfqsQueryParams,
  ListRfqsResponse,
  ReviewAiBody,
  ReviewAiParams,
  ReviewAiResponse,
  AnalyzeRfqBody,
  AnalyzeRfqResponse,
  CreateRfqBody,
  UpdateRfqBody,
  AddRfqReviewBody,
} from "@workspace/api-zod";
import { aiReviews, dashboard, emails, rfqDetails, rfqs } from "../services/mock-data";
import { phase2Emails, phase2Reviews } from "../services/phase2-state";
import { analyzeManualRfq } from "../services/rfq-analyzer";
import { db } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { rfqsTable, rfqItemsTable, customersTable, aiReviewHistoryTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  res.json(GetDashboardResponse.parse({
    ...dashboard,
    emailPipeline: [
      { label: "Email intake", value: phase2Emails.size, detail: "messages received" },
      { label: "AI classified", value: [...phase2Emails.values()].filter((email) => email.analysis).length, detail: "messages analyzed" },
      { label: "RFQs created", value: [...phase2Emails.values()].filter((email) => email.linkedRfq).length, detail: "linked records" },
      { label: "Human review", value: phase2Reviews.size, detail: "operator decisions" },
    ],
  }));
});

router.get("/rfqs", async (req, res) => {
  try {
    const query = ListRfqsQueryParams.parse(req.query);
    const search = query.search?.toLowerCase();
    
    // Fetch from Postgres
    let dbResults: any[] = [];
    if (db) {
      const rows = await db
        .select()
        .from(rfqsTable)
        .leftJoin(customersTable, eq(rfqsTable.customerId, customersTable.id))
        .leftJoin(rfqItemsTable, eq(rfqsTable.id, rfqItemsTable.rfqId));
        
      const rfqsMap = new Map();
      for (const row of rows) {
        if (!rfqsMap.has(row.rfqs.id)) {
          rfqsMap.set(row.rfqs.id, {
            id: row.rfqs.id + 1000,
            rfqNumber: row.rfqs.rfqNumber,
            customer: row.customers?.name || "Unknown",
            customerCompany: row.customers?.company || "Unknown",
            partNumber: row.rfq_items?.partNumber || "MULTIPLE",
            source: row.rfqs.source,
            requestType: row.rfqs.requestType,
            confidence: row.rfqs.confidence,
            priority: row.rfqs.priority,
            status: row.rfqs.status,
            createdAt: row.rfqs.createdAt.toISOString(),
            age: "recently",
          });
        }
      }
      dbResults = Array.from(rfqsMap.values());
    }

    const combined = [...dbResults, ...rfqs];
    
    const result = combined.filter((rfq) => {
      const searchMatch =
        !search ||
        [rfq.rfqNumber, rfq.customer, rfq.customerCompany, rfq.partNumber]
          .join(" ")
          .toLowerCase()
          .includes(search);
      return (
        searchMatch &&
        (!query.source || rfq.source === query.source) &&
        (!query.requestType || rfq.requestType === query.requestType) &&
        (!query.priority || rfq.priority === query.priority) &&
        (!query.status || rfq.status === query.status)
      );
    });
    
    res.json(ListRfqsResponse.parse(result));
  } catch (error) {
    console.error("Error listing RFQs:", error);
    res.status(500).json({ error: "Failed to list RFQs" });
  }
});

router.get("/rfqs/:rfqId", async (req, res) => {
  const { rfqId } = GetRfqParams.parse(req.params);
  
  let detail: any = null;
  if (rfqId > 1000 && db) {
    // Fetch from Postgres
    const dbId = rfqId - 1000;
    const rows = await db.select().from(rfqsTable).leftJoin(customersTable, eq(rfqsTable.customerId, customersTable.id)).leftJoin(rfqItemsTable, eq(rfqsTable.id, rfqItemsTable.rfqId)).where(eq(rfqsTable.id, dbId));
    if (rows.length > 0) {
      const row = rows[0];
      detail = {
        id: rfqId,
        rfqNumber: row.rfqs.rfqNumber,
        customer: row.customers?.name || "Unknown",
        customerCompany: row.customers?.company || "Unknown",
        customerId: row.customers?.id,
        customerPhone: row.customers?.phone || null,
        partNumber: row.rfq_items?.partNumber || "MULTIPLE",
        source: row.rfqs.source,
        requestType: row.rfqs.requestType,
        confidence: row.rfqs.confidence,
        priority: row.rfqs.priority,
        status: row.rfqs.status,
        createdAt: row.rfqs.createdAt.toISOString(),
        age: "recently",
        description: row.rfq_items?.description || "",
        quantity: row.rfq_items?.quantity || 1,
        aircraft: "Unknown",
        notes: "",
        emailSubject: "Manual Entry",
        sender: row.customers?.name || "Unknown",
        sourceEmail: null,
        analysis: null,
        reviewHistory: [],
      };
      
      const historyRows = await db.select().from(aiReviewHistoryTable).where(eq(aiReviewHistoryTable.rfqId, dbId)).orderBy(desc(aiReviewHistoryTable.createdAt));
      detail.reviewHistory = historyRows.map((h: any) => ({
        id: h.id,
        action: h.action,
        previousClassification: h.previousClassification || "UNKNOWN",
        newClassification: h.newClassification || "UNKNOWN",
        notes: h.notes || "",
        createdAt: h.createdAt.toISOString()
      }));
    }
  } else {
    detail = rfqDetails.find((rfq) => rfq.id === rfqId);
  }

  if (!detail) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }
  const sourceEmail = [...phase2Emails.values()].find((email) => email.linkedRfq?.id === rfqId);
  const review = phase2Reviews.get(rfqId);
  const enriched = sourceEmail
    ? {
        ...detail,
        sourceEmail: {
          id: sourceEmail.id,
          sender: sourceEmail.sender,
          senderEmail: sourceEmail.senderEmail,
          subject: sourceEmail.subject,
          receivedAt: sourceEmail.receivedAt,
          aiStatus: sourceEmail.aiStatus,
          requestType: sourceEmail.requestType,
          confidence: sourceEmail.confidence,
          status: sourceEmail.status,
          recipient: sourceEmail.recipient,
          cc: sourceEmail.cc,
          bodyText: sourceEmail.bodyText,
          bodyHtml: sourceEmail.bodyHtml,
          processingStatus: sourceEmail.processingStatus,
          emailClassification: sourceEmail.emailClassification,
          attachments: sourceEmail.attachments,
          analysis: sourceEmail.analysis,
          linkedRfq: sourceEmail.linkedRfq,
        },
        analysis: review?.analysis ?? sourceEmail.analysis,
        reviewHistory: review?.reviewHistory ?? [],
      }
    : { ...detail, sourceEmail: null, analysis: null, reviewHistory: detail.reviewHistory || [] };

  // Phase 7: Append Supporting Information (Catalog, Inventory, Pricing, Compliance)
  if (db) {
    try {
      const partNumber = enriched.partNumber;
      if (partNumber && partNumber !== "MULTIPLE") {
        // Fetch Catalog
        const catalogMatches = await db.select().from(partCatalogTable).where(eq(partCatalogTable.partNumber, partNumber));
        if (catalogMatches.length > 0) {
          enriched.catalog = catalogMatches[0];
          
          // Fetch Inventory
          const invMatches = await db.select().from(inventoryTable).where(eq(inventoryTable.partNumber, partNumber));
          if (invMatches.length > 0) {
            enriched.inventory = invMatches[0];
          }

          // Calculate Pricing
          const pricingReq: PricingRequest = {
            partNumber: partNumber,
            quantity: enriched.quantity || 1,
            basePrice: parseFloat(enriched.catalog.basePrice as any) || 0,
            currency: enriched.catalog.currency || "USD",
            condition: enriched.catalog.condition || "NE"
          };
          enriched.pricing = calculatePricing(pricingReq);

          // Compliance Check
          enriched.compliance = checkCompliance({
            partNumber: partNumber,
            category: enriched.catalog.category || "",
            condition: enriched.catalog.condition || "",
            certification: enriched.catalog.certification || ""
          });
          
          // RAG Context
          enriched.ragContext = await queryRag(`Information about ${partNumber}`);
        }
      }
    } catch (err) {
      console.error("Error fetching supporting info:", err);
    }
  }

  res.json(GetRfqResponse.parse(enriched));
});

router.get("/emails", (_req, res) => {
  res.json(ListEmailsResponse.parse(emails));
});

router.get("/ai-review", (_req, res) => {
  res.json(ListAiReviewsResponse.parse(aiReviews));
});

router.post("/ai-review/:rfqId/action", (req, res) => {
  const { rfqId } = ReviewAiParams.parse(req.params);
  const body = ReviewAiBody.parse(req.body);
  const review = aiReviews.find((item) => item.rfqId === rfqId);
  if (!review) {
    res.status(404).json({ error: "AI review item not found" });
    return;
  }
  if (body.action === "APPROVE") {
    review.status = "APPROVED";
  } else if (body.action === "CHANGE_CLASSIFICATION" && body.requestType) {
    review.classification = body.requestType;
    review.status = "CHANGED";
  }
  res.json(ReviewAiResponse.parse(review));
});

router.post("/rfqs/:rfqId/reviews", async (req, res) => {
  try {
    const { rfqId } = GetRfqParams.parse(req.params);
    const data = AddRfqReviewBody.parse(req.body);
    
    if (data.action === "REJECTED" && !data.notes) {
      res.status(400).json({ error: "Rejection requires notes." });
      return;
    }
    if (data.action === "REQUESTED_INFO" && !data.notes) {
      res.status(400).json({ error: "Requesting information requires notes." });
      return;
    }

    let detail: any = null;
    let isDb = false;
    let dbId = rfqId;

    if (rfqId > 1000 && db) {
      dbId = rfqId - 1000;
      const rows = await db.select().from(rfqsTable).where(eq(rfqsTable.id, dbId));
      if (rows.length > 0) {
        isDb = true;
        detail = rows[0];
      }
    } else {
      detail = rfqDetails.find((r) => r.id === rfqId) as any;
    }

    if (!detail) {
      res.status(404).json({ error: "RFQ not found" });
      return;
    }
    
    let newStatus = detail.status;
    if (data.action === "STARTED_REVIEW") newStatus = "UNDER_REVIEW";
    if (data.action === "APPROVED") newStatus = "APPROVED";
    if (data.action === "REJECTED") newStatus = "REJECTED";
    if (data.action === "REQUESTED_INFO") newStatus = "NEEDS_INFORMATION";

    if (db && isDb) {
      await db.update(rfqsTable).set({ status: newStatus }).where(eq(rfqsTable.id, dbId));
      await db.insert(aiReviewHistoryTable).values({
        rfqId: dbId,
        action: data.action,
        previousClassification: detail.requestType,
        newClassification: detail.requestType,
        notes: data.notes || "",
      });
    }

    if (!isDb) {
      detail.status = newStatus;
      const summary = rfqs.find((r) => r.id === rfqId);
      if (summary) summary.status = newStatus as any;
      if (!detail.reviewHistory) detail.reviewHistory = [];
      detail.reviewHistory.unshift({
        id: Date.now(),
        action: data.action,
        previousClassification: detail.requestType,
        newClassification: detail.requestType,
        notes: data.notes || "",
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[POST /rfqs/:rfqId/reviews] Error adding review:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
});

router.post("/rfqs/analyze", async (req, res) => {
  try {
    const body = AnalyzeRfqBody.parse(req.body);
    const result = await analyzeManualRfq(body.rawText);
    res.json(AnalyzeRfqResponse.parse(result));
  } catch (error) {
    console.error("Error analyzing manual RFQ:", error);
    res.status(500).json({ error: "Failed to analyze RFQ text" });
  }
});

router.post("/rfqs", async (req, res) => {
  try {
    const data = CreateRfqBody.parse(req.body);
    console.log("[POST /rfqs] Received body:", JSON.stringify(data, null, 2));
    
    // Backend validation: phone is required if READY_FOR_REVIEW
    if (data.status === "READY_FOR_REVIEW" && !data.customer.phone) {
      console.warn("[POST /rfqs] Missing phone number for READY_FOR_REVIEW");
      res.status(400).json({ error: "Customer phone number is required to submit RFQ" });
      return;
    }

    if (!db) {
      console.error("[POST /rfqs] Database not configured or unavailable");
      res.status(500).json({ error: "PostgreSQL database is unavailable or not configured. Cannot save RFQ." });
      return;
    }
    
    // 1. Insert Customer (Simplified without checking existing for now, or just check properly)
    let customerId: number;
    try {
      console.log("[POST /rfqs] Inserting customer:", data.customer.name);
      const customerInsert = await db.insert(customersTable).values({
        name: data.customer.name,
        company: data.customer.company,
        email: data.customer.email,
        phone: data.customer.phone,
      }).returning({ id: customersTable.id });
      customerId = customerInsert[0].id;
      console.log("[POST /rfqs] Customer inserted with ID:", customerId);
    } catch (err) {
      console.error("[POST /rfqs] Database error inserting customer:", err);
      throw err;
    }
    
    // 2. Create RFQ
    const rfqNumber = `RFQ-M-${Date.now().toString().slice(-6)}`;
    let rfqId: number;
    try {
      console.log("[POST /rfqs] Inserting RFQ:", rfqNumber);
      const rfqInsert = await db.insert(rfqsTable).values({
        rfqNumber,
        source: "PORTAL",
        customerId,
        requestType: data.requestType,
        confidence: 100, // Manual creation
        priority: "MEDIUM",
        status: data.status || "NEW",
      }).returning({ id: rfqsTable.id });
      rfqId = rfqInsert[0].id;
      console.log("[POST /rfqs] Generated RFQ ID:", rfqId);
    } catch (err) {
      console.error("[POST /rfqs] Database error inserting RFQ:", err);
      throw err;
    }
    
    // 3. Create RFQ Items
    if (data.items.length > 0) {
      try {
        console.log("[POST /rfqs] Inserting RFQ items:", data.items.length);
        await db.insert(rfqItemsTable).values(
          data.items.map((item: any) => ({
            rfqId,
            partNumber: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            condition: item.condition,
          }))
        );
        console.log("[POST /rfqs] RFQ items inserted successfully");
      } catch (err) {
        console.error("[POST /rfqs] Database error inserting RFQ items:", err);
        throw err;
      }
    }
    
    // Return a mocked RfqDetail response to satisfy OpenAPI
    const detail = {
      id: rfqId + 1000, // Offset for frontend mock data collision avoidance
      rfqNumber,
      customer: data.customer.name,
      customerCompany: data.customer.company,
      customerId: customerId,
      customerPhone: data.customer.phone || null,
      partNumber: data.items[0]?.partNumber || "MULTIPLE",
      source: "PORTAL",
      requestType: data.requestType,
      confidence: 100,
      priority: "MEDIUM",
      status: data.status || "NEW",
      createdAt: new Date().toISOString(),
      age: "just now",
      description: data.items[0]?.description || "",
      quantity: data.items[0]?.quantity || 1,
      aircraft: "Unknown",
      notes: data.notes || "",
      emailSubject: "Manual Entry",
      sender: data.customer.name,
      sourceEmail: null,
      analysis: null,
      reviewHistory: [],
    };
    
    console.log("[POST /rfqs] Successfully created RFQ. Returning response.");
    res.json(GetRfqResponse.parse(detail));
  } catch (error) {
    console.error("[POST /rfqs] Error creating RFQ:", error);
    res.status(500).json({ error: "Failed to create RFQ", details: error instanceof Error ? error.message : String(error) });
  }
});

router.patch("/rfqs/:rfqId", async (req, res) => {
  try {
    const { rfqId } = GetRfqParams.parse(req.params);
    const data = UpdateRfqBody.parse(req.body);
    
    let detail: any = null;
    let isDb = false;

    if (rfqId > 1000 && db) {
      const dbId = rfqId - 1000;
      const rows = await db.select().from(rfqsTable).leftJoin(customersTable, eq(rfqsTable.customerId, customersTable.id)).where(eq(rfqsTable.id, dbId));
      if (rows.length > 0) {
        isDb = true;
        detail = {
          id: rfqId,
          rfqNumber: rows[0].rfqs.rfqNumber,
          customerId: rows[0].customers?.id,
          customerPhone: rows[0].customers?.phone,
        };
      }
    } else {
      detail = rfqDetails.find((r) => r.id === rfqId) as any;
    }

    if (!detail) {
      res.status(404).json({ error: "RFQ not found" });
      return;
    }

    if (data.status === "READY_FOR_REVIEW") {
      const phone = data.customerPhone || detail.customerPhone;
      if (!phone) {
        res.status(400).json({ error: "Customer phone number is required to submit RFQ" });
        return;
      }
    }

    if (db) {
      if (data.status && isDb) {
        await db.update(rfqsTable).set({ status: data.status }).where(eq(rfqsTable.id, rfqId - 1000));
      } else if (data.status) {
        await db.update(rfqsTable).set({ status: data.status }).where(eq(rfqsTable.id, rfqId));
      }
      
      if (data.customerPhone && detail.customerId) {
        await db.update(customersTable).set({ phone: data.customerPhone }).where(eq(customersTable.id, detail.customerId));
      }
    }

    if (!isDb) {
      if (data.status) {
        detail.status = data.status;
        const summary = rfqs.find((r) => r.id === rfqId);
        if (summary) summary.status = data.status as any;
      }
      if (data.customerPhone !== undefined) {
        detail.customerPhone = data.customerPhone;
      }
    }

    res.json(GetRfqResponse.parse(detail));
  } catch (error) {
    console.error("Error updating RFQ:", error);
    res.status(500).json({ error: "Failed to update RFQ" });
  }
});
import { partCatalogTable, inventoryTable } from "@workspace/db/schema";
import { calculatePricing, PricingRequest } from "../services/pricing-engine";
import { checkCompliance } from "../services/compliance-check";
import { queryRag, getRagHealth } from "../services/rag-pipeline";
import { ilike } from "drizzle-orm";

router.get("/catalog/search", async (req, res) => {
  const query = (req.query.query as string) || "";
  try {
    if (db) {
      const results = await db.select().from(partCatalogTable)
        .where(ilike(partCatalogTable.partNumber, `%${query}%`));
      res.json(results);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: "Catalog search failed" });
  }
});

router.get("/inventory/:partNumber", async (req, res) => {
  const { partNumber } = req.params;
  try {
    if (db) {
      const results = await db.select().from(inventoryTable)
        .where(eq(inventoryTable.partNumber, partNumber));
      if (results.length > 0) {
        res.json(results[0]);
      } else {
        res.status(404).json({ error: "Inventory not found" });
      }
    } else {
      res.status(404).json({ error: "DB not connected" });
    }
  } catch (error) {
    res.status(500).json({ error: "Inventory fetch failed" });
  }
});

router.post("/pricing/calculate", (req, res) => {
  try {
    const data = req.body as PricingRequest;
    if (!data.partNumber || !data.quantity || !data.basePrice || !data.currency) {
      res.status(400).json({ error: "Missing required pricing fields" });
      return;
    }
    const result = calculatePricing(data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Pricing calculation failed" });
  }
});
router.get("/rag/health", async (_req, res) => {
  try {
    const health = await getRagHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "RAG health check failed" });
  }
});

export default router;