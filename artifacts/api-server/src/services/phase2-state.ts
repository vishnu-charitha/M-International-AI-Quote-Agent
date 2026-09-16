import { emails, rfqDetails, rfqs } from "./mock-data";

export type Phase2Attachment = {
  id: number;
  emailId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
  processingStatus: "PENDING" | "PROCESSING" | "EXTRACTED" | "FAILED" | "UNSUPPORTED";
  extractedText: string | null;
};

export type Phase2Analysis = {
  id: number;
  emailClassification: "RFQ" | "NON_RFQ" | "SUPPLIER_RESPONSE" | "CUSTOMER_INQUIRY" | "INTERNAL" | "UNKNOWN";
  requestType: "PARTS_EXCHANGE" | "NEW_PART_PURCHASE" | "REPAIR" | "OVERHAUL" | "INSPECTION" | "UNKNOWN";
  confidenceScore: number;
  reasoningSummary: string;
  requiresHumanReview: boolean;
  developmentMode: boolean;
  extractedData: Record<string, unknown>;
};

export type Phase2History = {
  id: number;
  action: "APPROVED" | "REJECTED" | "RECLASSIFIED" | "EDITED";
  previousClassification: Phase2Analysis["requestType"];
  newClassification: Phase2Analysis["requestType"];
  notes: string;
  createdAt: string;
};

export type Phase2Email = {
  id: number;
  sender: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  aiStatus: "ANALYZED" | "PROCESSING" | "FAILED";
  requestType: Phase2Analysis["requestType"];
  confidence: number;
  status: "RFQ_CREATED" | "PENDING_REVIEW" | "IGNORED";
  recipient: string;
  cc: string;
  bodyText: string;
  bodyHtml: string;
  processingStatus: "NEW" | "SYNCED" | "PROCESSING" | "PROCESSED" | "REVIEW_REQUIRED" | "FAILED" | "IGNORED";
  emailClassification: Phase2Analysis["emailClassification"];
  attachments: Phase2Attachment[];
  analysis: Phase2Analysis | null;
  linkedRfq: (typeof rfqs)[number] | null;
  microsoftMessageId: string;
  internetMessageId: string | null;
  conversationId: string | null;
  createdAt: string;
};

export const phase2Emails = new Map<number, Phase2Email>();
export const phase2Reviews = new Map<number, { rfqId: number; emailId: number; emailSubject: string; createdAt: string; analysis: Phase2Analysis; reviewHistory: Phase2History[] }>();

let nextEmailId = Math.max(...emails.map((email) => email.id)) + 1;
let nextAnalysisId = 1;
let nextAttachmentId = 1;
let nextHistoryId = 1;

const seedBodies = [
  "Please quote 2 units of PN PT6A-42 FUEL PUMP in serviceable condition. We need pricing and availability ASAP.",
  "We need repair pricing and turnaround time for PW127M STARTER. Please include teardown report requirements.",
  "Please quote overhaul for the hydraulic valve listed below. FAA 8130-3 certification requested.",
  "Please quote availability for VHF TRANSCEIVER 822-101. Standard warranty terms are acceptable.",
];

const seededRfqByEmailId: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 6 };
emails.forEach((email, index) => {
  const rfq = rfqs.find((item) => item.id === seededRfqByEmailId[email.id]) ?? null;
  const confidenceScore = email.confidence / 100;
  const requiresHumanReview = email.confidence < 85;
  const analysis: Phase2Analysis = {
    id: nextAnalysisId++,
    emailClassification: "RFQ",
    requestType: email.requestType,
    confidenceScore,
    reasoningSummary: requiresHumanReview
      ? "The email appears to be an aviation request, but the AI needs a human to confirm the classification or missing service details."
      : "Email contains a clear aviation part number, quantity, and request for quotation.",
    requiresHumanReview,
    developmentMode: true,
    extractedData: {
      customer: { name: email.sender, company: email.sender, email: email.senderEmail },
      items: [{ partNumber: rfq?.partNumber ?? "UNKNOWN", description: rfq?.partNumber ?? "Aviation component", quantity: 2, condition: "Serviceable", requestedCondition: "Serviceable" }],
      requirements: { certification: ["FAA 8130-3"], deliveryRequirement: "ASAP", urgency: email.confidence < 75 ? "HIGH" : "MEDIUM" },
      summary: seedBodies[index],
    },
  };
  const record: Phase2Email = {
    ...email,
    recipient: "sales@minternational.aero",
    cc: "",
    bodyText: seedBodies[index],
    bodyHtml: `<p>${seedBodies[index]}</p>`,
    processingStatus: requiresHumanReview ? "REVIEW_REQUIRED" : "PROCESSED",
    emailClassification: "RFQ",
    attachments: index === 1 ? [{
      id: nextAttachmentId++,
      emailId: email.id,
      fileName: "PW127M-service-request.pdf",
      contentType: "application/pdf",
      fileSize: 248320,
      processingStatus: "EXTRACTED",
      extractedText: "PW127M STARTER — repair pricing and turnaround time requested.",
    }] : [],
    analysis,
    linkedRfq: rfq,
    microsoftMessageId: `dev-message-${email.id}`,
    internetMessageId: `<dev-${email.id}@minternational.local>`,
    conversationId: `dev-thread-${email.id}`,
    createdAt: email.receivedAt,
  };
  phase2Emails.set(record.id, record);
  if (requiresHumanReview && rfq) {
    phase2Reviews.set(rfq.id, {
      rfqId: rfq.id,
      emailId: record.id,
      emailSubject: record.subject,
      createdAt: record.createdAt,
      analysis,
      reviewHistory: [],
    });
  }
});

export function allocateEmailId() {
  return nextEmailId++;
}

export function allocateAttachmentId() {
  return nextAttachmentId++;
}

export function allocateHistoryId() {
  return nextHistoryId++;
}

export function allocateAnalysisId() {
  return nextAnalysisId++;
}

export function upsertPhase2Email(email: Phase2Email) {
  const existing = [...phase2Emails.values()].find(
    (item) =>
      item.microsoftMessageId === email.microsoftMessageId ||
      (email.internetMessageId && item.internetMessageId === email.internetMessageId),
  );
  if (existing) return { email: existing, duplicate: true };
  phase2Emails.set(email.id, email);
  return { email, duplicate: false };
}