import { Router, type IRouter } from "express";
import {
  GetAiReviewResponse,
  GetEmailResponse,
  GetEmailAttachmentResponse,
  ListEmailsResponse,
  ListAiReviewsResponse,
  ProcessEmailResponse,
  ReclassifyAiReviewBody,
  ReviewAiResponse,
  SyncEmailsResponse,
  UpdateAiReviewBody,
} from "@workspace/api-zod";
import {
  allocateAnalysisId,
  allocateAttachmentId,
  allocateEmailId,
  allocateHistoryId,
  phase2Emails,
  phase2Reviews,
  type Phase2Analysis,
  type Phase2Email,
  type Phase2History,
} from "../services/phase2-state";
import { analyzeRfqEmail } from "../services/rfq-analyzer";
import { listInboxMessages, listMessageAttachments, normalizeGraphMessage } from "../services/microsoft-graph";
import { processAttachmentMetadata } from "../services/attachment-processor";
import { rfqDetails, rfqs } from "../services/mock-data";
import { aiReviews } from "../services/mock-data";
import { db } from "@workspace/db";
import { emailsTable } from "@workspace/db";

const router: IRouter = Router();

function toEmailResponse(email: Phase2Email) {
  return {
    id: email.id,
    sender: email.sender,
    senderEmail: email.senderEmail,
    subject: email.subject,
    receivedAt: email.receivedAt,
    aiStatus: email.aiStatus,
    requestType: email.requestType,
    confidence: email.confidence,
    status: email.status,
  };
}

function toEmailDetail(email: Phase2Email) {
  return {
    ...toEmailResponse(email),
    recipient: email.recipient,
    cc: email.cc,
    bodyText: email.bodyText,
    bodyHtml: email.bodyHtml,
    processingStatus: email.processingStatus,
    emailClassification: email.emailClassification,
    attachments: email.attachments,
    analysis: email.analysis,
    linkedRfq: email.linkedRfq,
  };
}

function toReviewResponse(review: NonNullable<ReturnType<typeof phase2Reviews.get>>) {
  const email = phase2Emails.get(review.emailId);
  const confidence = Math.round(review.analysis.confidenceScore * 100);
  return {
    id: review.rfqId,
    rfqId: review.rfqId,
    rfqNumber: rfqs.find((rfq) => rfq.id === review.rfqId)?.rfqNumber ?? `MI-RFQ-${review.rfqId}`,
    customer: email?.sender ?? "Unknown customer",
    classification: review.analysis.requestType,
    confidence,
    reason: review.analysis.reasoningSummary,
    status: review.analysis.requiresHumanReview ? "NEEDS_REVIEW" : "APPROVED",
    emailSubject: review.emailSubject,
    createdAt: review.createdAt,
    originalEmail: email ? toEmailDetail(email) : null,
    analysis: review.analysis,
    reviewHistory: review.reviewHistory,
  };
}

function createRfqFromAnalysis(email: Phase2Email, analysis: Phase2Analysis) {
  const id = Math.max(...rfqs.map((rfq) => rfq.id), 0) + 1;
  const year = new Date().getUTCFullYear();
  const rfqNumber = `MI-RFQ-${year}-${String(id).padStart(5, "0")}`;
  const items = (analysis.extractedData.items as Array<{ partNumber?: string; description?: string; quantity?: number; condition?: string; requestedCondition?: string }> | undefined) ?? [];
  const primaryItem = items[0];
  const rfq = {
    id,
    rfqNumber,
    customer: email.sender,
    customerCompany: email.sender,
    partNumber: primaryItem?.partNumber ?? "UNKNOWN",
    source: "EMAIL" as const,
    requestType: analysis.requestType,
    confidence: Math.round(analysis.confidenceScore * 100),
    priority: analysis.confidenceScore >= 0.85 ? "MEDIUM" as const : "HIGH" as const,
    status: analysis.requiresHumanReview ? "NEEDS_HUMAN_REVIEW" as const : "PROCESSING" as const,
    createdAt: new Date().toISOString(),
    age: "Just now",
  };
  rfqs.unshift(rfq);
  rfqDetails.unshift({
    ...rfq,
    description: primaryItem?.description ?? analysis.extractedData.summary?.toString() ?? "Aviation RFQ extracted from email.",
    quantity: primaryItem?.quantity ?? 1,
    aircraft: "Not specified",
    notes: analysis.reasoningSummary,
    emailSubject: email.subject,
    sender: email.senderEmail,
    // @ts-expect-error adding items for mock rendering
    items,
  });
  
  if (db) {
    try {
      db.insert(require("@workspace/db").rfqsTable).values({
        rfqNumber,
        customerName: email.sender,
        status: rfq.status,
        priority: rfq.priority,
        source: "EMAIL",
        requestType: analysis.requestType,
        confidenceScore: rfq.confidence,
        emailId: email.id,
      }).returning({ id: require("@workspace/db").rfqsTable.id }).then(async (insertedRfq: any[]) => {
        const dbId = insertedRfq[0]?.id;
        if (dbId && items.length > 0) {
          const rfqItemsTable = require("@workspace/db").rfqItemsTable;
          const records = items.map(it => ({
            rfqId: dbId,
            partNumber: it.partNumber ?? "UNKNOWN",
            description: it.description,
            quantity: it.quantity ?? 1,
            condition: it.condition,
            requestedCondition: it.requestedCondition,
            requestType: analysis.requestType,
          }));
          await db.insert(rfqItemsTable).values(records);
        }
      }).catch(() => {});
    } catch {}
  }
  
  return rfq;
}

async function persistEmail(email: Phase2Email) {
  if (!db) return;
  try {
    await db.insert(emailsTable).values({
      messageId: email.microsoftMessageId,
      microsoftMessageId: email.microsoftMessageId,
      internetMessageId: email.internetMessageId,
      conversationId: email.conversationId,
      sender: email.sender,
      senderName: email.sender,
      senderEmail: email.senderEmail,
      recipient: email.recipient,
      recipientEmails: email.recipient ? [email.recipient] : [],
      ccEmails: email.cc ? [email.cc] : [],
      subject: email.subject,
      body: email.bodyText,
      bodyText: email.bodyText,
      bodyHtml: email.bodyHtml,
      receivedAt: new Date(email.receivedAt),
      status: email.status,
      emailType: email.emailClassification,
      processingStatus: email.processingStatus,
      aiProcessed: Boolean(email.analysis),
      rfqId: email.linkedRfq?.id,
    }).onConflictDoNothing();
  } catch {
    // Development mode remains functional even if a local database is unavailable.
  }
}

router.get("/emails", (_req, res) => {
  res.json(ListEmailsResponse.parse([...phase2Emails.values()].map(toEmailResponse)));
});

router.get("/emails/:emailId", (req, res) => {
  const email = phase2Emails.get(Number(req.params.emailId));
  if (!email) {
    res.status(404).json({ error: "Email not found" });
    return;
  }
  res.json(GetEmailResponse.parse(toEmailDetail(email)));
});

router.post("/emails/sync", async (_req, res) => {
  try {
    const messages = await listInboxMessages();
    let synced = 0;
    let duplicatesSkipped = 0;
    for (const message of messages) {
      const normalized = normalizeGraphMessage(message);
      const record: Phase2Email = {
        id: allocateEmailId(),
        sender: normalized.senderName,
        senderEmail: normalized.senderEmail,
        subject: normalized.subject,
        receivedAt: normalized.receivedAt,
        aiStatus: "PROCESSING",
        requestType: "UNKNOWN",
        confidence: 0,
        status: "PENDING_REVIEW",
        recipient: normalized.recipients.join(", "),
        cc: normalized.cc.join(", "),
        bodyText: normalized.bodyText,
        bodyHtml: normalized.bodyText,
        processingStatus: "SYNCED",
        emailClassification: "UNKNOWN",
        attachments: [],
        analysis: null,
        linkedRfq: null,
        microsoftMessageId: normalized.microsoftMessageId,
        internetMessageId: normalized.internetMessageId,
        conversationId: normalized.conversationId,
        createdAt: new Date().toISOString(),
      };
      if (normalized.hasAttachments) {
        const graphAttachments = await listMessageAttachments(normalized.microsoftMessageId);
        record.attachments = await Promise.all(graphAttachments.map((attachment) => processAttachmentMetadata({
          id: allocateAttachmentId(),
          emailId: record.id,
          fileName: attachment.name ?? "attachment",
          contentType: attachment.contentType ?? "application/octet-stream",
          fileSize: attachment.size ?? 0,
          contentBytes: attachment.contentBytes,
        })));
      }
      const result = upsertAndPersist(record);
      if (result.duplicate) duplicatesSkipped += 1;
      else synced += 1;
    }
    res.json(SyncEmailsResponse.parse({
      mode: "MICROSOFT_GRAPH",
      synced,
      duplicatesSkipped,
      failed: 0,
      message: `Microsoft Graph sync complete. ${synced} new message${synced === 1 ? "" : "s"} imported.`,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Microsoft 365 integration is not configured.";
    res.json(SyncEmailsResponse.parse({
      mode: "DEVELOPMENT",
      synced: 0,
      duplicatesSkipped: 0,
      failed: 0,
      message: `${message}. Development mode kept the existing email data unchanged.`,
    }));
  }
});

function upsertAndPersist(record: Phase2Email) {
  const existing = [...phase2Emails.values()].find(
    (item) =>
      item.microsoftMessageId === record.microsoftMessageId ||
      (record.internetMessageId && item.internetMessageId === record.internetMessageId),
  );
  if (existing) return { duplicate: true };
  phase2Emails.set(record.id, record);
  void persistEmail(record);
  return { duplicate: false };
}

router.post("/emails/demo/seed", async (_req, res) => {
  if (process.env.ENABLE_DEMO_EMAIL_PROVIDER !== 'true') {
    res.status(403).json({ error: "Demo email provider is not enabled." });
    return;
  }
  
  const demoEmails = [
    {
      subject: "RFQ: 5 each PT6A Fuel Pump",
      bodyText: "Please quote 5 units of PT6A-42 fuel pump in overhauled condition. Send lead time. Attachment contains trace documents.",
      senderName: "Demo Customer 1",
      senderEmail: "purchasing@demo1.com",
      attachment: "Trace documentation for PT6A-42 fuel pump. Form 8130-3 attached."
    },
    {
      subject: "AOG - Request for Quote - Filter Element",
      bodyText: "We need an aircraft filter part number 10101-1 urgently. Need it in NEW condition. AOG shipment required.",
      senderName: "AOG Desk",
      senderEmail: "aog@demo2.com",
      attachment: "Aircraft Filter Element Specifications: 10101-1 NEW."
    },
    {
      subject: "Landing Gear Component RFQ",
      bodyText: "Hello, looking to purchase 2 landing gear struts. Part number LG-1002. Please let me know price and condition available.",
      senderName: "Supply Chain",
      senderEmail: "supply@demo3.com",
      attachment: ""
    },
    {
      subject: "Invoice Inquiry #10294",
      bodyText: "Can you please send me a copy of the invoice for our last order? We seem to have misplaced it.",
      senderName: "Accounting",
      senderEmail: "accounting@demo4.com",
      attachment: ""
    }
  ];

  let synced = 0;
  let duplicatesSkipped = 0;

  for (const [index, demo] of demoEmails.entries()) {
    const record: Phase2Email = {
      id: allocateEmailId(),
      sender: demo.senderName,
      senderEmail: demo.senderEmail,
      subject: demo.subject,
      receivedAt: new Date(Date.now() - (index * 3600000)).toISOString(), // Staggered times
      aiStatus: "PROCESSING",
      requestType: "UNKNOWN",
      confidence: 0,
      status: "PENDING_REVIEW",
      recipient: "sales@minternational.com",
      cc: "",
      bodyText: demo.bodyText,
      bodyHtml: demo.bodyText,
      processingStatus: "SYNCED",
      emailClassification: "UNKNOWN",
      attachments: [],
      analysis: null,
      linkedRfq: null,
      microsoftMessageId: `DEMO-MSG-${index}`,
      internetMessageId: `demo-msg-${index}@demo.local`,
      conversationId: `DEMO-CONV-${index}`,
      createdAt: new Date().toISOString(),
    };

    if (demo.attachment) {
      record.attachments = [{
        id: allocateAttachmentId(),
        emailId: record.id,
        fileName: "attachment.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        processingStatus: "EXTRACTED",
        extractedText: demo.attachment,
      }];
    }

    const result = upsertAndPersist(record);
    if (result.duplicate) {
      duplicatesSkipped += 1;
    } else {
      synced += 1;
      
      // Auto-process the email with AI
      try {
        const analysis = await analyzeRfqEmail({
          emailId: record.id,
          subject: record.subject,
          bodyText: record.bodyText,
          attachmentText: demo.attachment,
          senderName: record.sender,
          senderEmail: record.senderEmail,
        });
        
        analysis.id = allocateAnalysisId();
        record.analysis = analysis;
        record.requestType = analysis.requestType;
        record.confidence = Math.round(analysis.confidenceScore * 100);
        record.emailClassification = analysis.emailClassification;
        record.processingStatus = analysis.requiresHumanReview ? "REVIEW_REQUIRED" : "PROCESSED";
        record.aiStatus = analysis.requiresHumanReview ? "PROCESSING" : "ANALYZED";
        record.status = analysis.requiresHumanReview ? "PENDING_REVIEW" : "RFQ_CREATED";
        
        const rfq = analysis.emailClassification === "RFQ" ? createRfqFromAnalysis(record, analysis) : null;
        record.linkedRfq = rfq;
        
        if (analysis.requiresHumanReview && rfq) {
          phase2Reviews.set(rfq.id, {
            rfqId: rfq.id,
            emailId: record.id,
            emailSubject: record.subject,
            createdAt: new Date().toISOString(),
            analysis,
            reviewHistory: [],
          });
        }
        await persistEmail(record);
      } catch (error) {
        record.processingStatus = "FAILED";
        record.aiStatus = "FAILED";
        await persistEmail(record);
      }
    }
  }

  res.json(SyncEmailsResponse.parse({
    mode: "DEVELOPMENT",
    synced,
    duplicatesSkipped,
    failed: 0,
    message: `Demo mode sync complete. ${synced} new demo message${synced === 1 ? "" : "s"} imported.`,
  }));
});

router.post("/emails/:emailId/process", async (req, res) => {
  const email = phase2Emails.get(Number(req.params.emailId));
  if (!email) {
    res.status(404).json({ error: "Email not found" });
    return;
  }
  email.processingStatus = "PROCESSING";
  email.aiStatus = "PROCESSING";
  try {
    const attachmentText = email.attachments.map((attachment) => attachment.extractedText ?? "").join("\n");
    const analysis = await analyzeRfqEmail({
      emailId: email.id,
      subject: email.subject,
      bodyText: email.bodyText,
      attachmentText,
      senderName: email.sender,
      senderEmail: email.senderEmail,
    });
    analysis.id = allocateAnalysisId();
    email.analysis = analysis;
    email.requestType = analysis.requestType;
    email.confidence = Math.round(analysis.confidenceScore * 100);
    email.emailClassification = analysis.emailClassification;
    email.processingStatus = analysis.requiresHumanReview ? "REVIEW_REQUIRED" : "PROCESSED";
    email.aiStatus = analysis.requiresHumanReview ? "PROCESSING" : "ANALYZED";
    email.status = analysis.requiresHumanReview ? "PENDING_REVIEW" : "RFQ_CREATED";
    const rfq = analysis.emailClassification === "RFQ" ? createRfqFromAnalysis(email, analysis) : null;
    email.linkedRfq = rfq;
    if (analysis.requiresHumanReview && rfq) {
      phase2Reviews.set(rfq.id, {
        rfqId: rfq.id,
        emailId: email.id,
        emailSubject: email.subject,
        createdAt: new Date().toISOString(),
        analysis,
        reviewHistory: [],
      });
    }
    await persistEmail(email);
    res.json(ProcessEmailResponse.parse({
      email: toEmailDetail(email),
      rfqCreated: Boolean(rfq),
      reviewRequired: analysis.requiresHumanReview,
      message: analysis.developmentMode ? "Processed in Development AI Mode." : "Processed with the configured AI provider.",
    }));
  } catch (error) {
    email.processingStatus = "FAILED";
    email.aiStatus = "FAILED";
    const message = error instanceof Error ? error.message : "AI processing failed";
    res.status(502).json({ error: message });
  }
});

router.get("/email-attachments/:attachmentId", (req, res) => {
  const id = Number(req.params.attachmentId);
  const attachment = [...phase2Emails.values()].flatMap((email) => email.attachments).find((item) => item.id === id);
  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }
  res.json(GetEmailAttachmentResponse.parse(attachment));
});

router.get("/ai-review", (_req, res) => {
  const reviews = [...phase2Reviews.values()].map(toReviewResponse);
  const fallback = aiReviews.map((item) => ({ ...item }));
  res.json(ListAiReviewsResponse.parse(reviews.length ? reviews : fallback));
});

router.get("/ai-review/:rfqId", (req, res) => {
  const review = phase2Reviews.get(Number(req.params.rfqId));
  if (!review) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  res.json(GetAiReviewResponse.parse(toReviewResponse(review)));
});

function addReviewHistory(review: NonNullable<ReturnType<typeof phase2Reviews.get>>, action: Phase2History["action"], nextType: Phase2History["newClassification"], notes: string) {
  review.reviewHistory.push({
    id: allocateHistoryId(),
    action,
    previousClassification: review.analysis.requestType,
    newClassification: nextType,
    notes,
    createdAt: new Date().toISOString(),
  });
}

router.post("/ai-review/:rfqId/approve", (req, res): void => {
  const review = phase2Reviews.get(Number(req.params.rfqId));
  if (!review) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  review.analysis.requiresHumanReview = false;
  addReviewHistory(review, "APPROVED", review.analysis.requestType, "Reviewer approved the AI result.");
  res.json(ReviewAiResponse.parse(toReviewResponse(review)));
});

router.post("/ai-review/:rfqId/reclassify", (req, res): void => {
  const review = phase2Reviews.get(Number(req.params.rfqId));
  if (!review) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  const body = ReclassifyAiReviewBody.parse(req.body);
  addReviewHistory(review, "RECLASSIFIED", body.requestType, body.notes ?? "Reviewer changed the request classification.");
  review.analysis.requestType = body.requestType;
  review.analysis.requiresHumanReview = false;
  res.json(ReviewAiResponse.parse(toReviewResponse(review)));
});

router.post("/ai-review/:rfqId/reject", (req, res): void => {
  const review = phase2Reviews.get(Number(req.params.rfqId));
  if (!review) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  addReviewHistory(review, "REJECTED", "UNKNOWN", "Reviewer marked this message as non-RFQ.");
  review.analysis.emailClassification = "NON_RFQ";
  review.analysis.requestType = "UNKNOWN";
  review.analysis.requiresHumanReview = false;
  res.json(ReviewAiResponse.parse(toReviewResponse(review)));
});

router.post("/ai-review/:rfqId/update", (req, res): void => {
  const review = phase2Reviews.get(Number(req.params.rfqId));
  if (!review) {
    res.status(404).json({ error: "Review item not found" });
    return;
  }
  const body = UpdateAiReviewBody.parse(req.body);
  if (body.requestType) review.analysis.requestType = body.requestType;
  addReviewHistory(review, "EDITED", review.analysis.requestType, body.notes ?? "Reviewer edited extracted RFQ details.");
  review.analysis.requiresHumanReview = false;
  res.json(ReviewAiResponse.parse(toReviewResponse(review)));
});

export default router;