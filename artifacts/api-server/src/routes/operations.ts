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

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  res.json(GetDashboardResponse.parse(dashboard));
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
  res.json(GetRfqResponse.parse(detail));
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