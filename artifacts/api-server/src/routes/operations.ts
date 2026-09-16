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
} from "@workspace/api-zod";
import { aiReviews, dashboard, emails, rfqDetails, rfqs } from "../services/mock-data";
import { phase2Emails, phase2Reviews } from "../services/phase2-state";

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

router.get("/rfqs", (req, res) => {
  const query = ListRfqsQueryParams.parse(req.query);
  const search = query.search?.toLowerCase();
  const result = rfqs.filter((rfq) => {
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
});

router.get("/rfqs/:rfqId", (req, res) => {
  const { rfqId } = GetRfqParams.parse(req.params);
  const detail = rfqDetails.find((rfq) => rfq.id === rfqId);
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
    : { ...detail, sourceEmail: null, analysis: null, reviewHistory: [] };
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

export default router;