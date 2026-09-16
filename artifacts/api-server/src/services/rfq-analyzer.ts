import type { Phase2Analysis } from "./phase2-state";

type AnalysisInput = {
  emailId: number;
  subject: string;
  bodyText: string;
  attachmentText: string;
  senderName: string;
  senderEmail: string;
};

function developmentAnalysis(input: AnalysisInput): Phase2Analysis {
  const content = `${input.subject}\n${input.bodyText}\n${input.attachmentText}`.toLowerCase();
  const partNumber = content.match(/\b(?:pn|part(?:\s+number)?)[:\s-]*([a-z0-9]+(?:-[a-z0-9]+)+)\b/i)?.[1]?.toUpperCase() ?? "UNKNOWN";
  const quantity = Number(content.match(/\b(?:qty|quantity|units?)[:\s]*(\d+)\b/i)?.[1] ?? 1);
  const requestType = content.includes("overhaul")
    ? "OVERHAUL"
    : content.includes("repair")
      ? "REPAIR"
      : content.includes("exchange") || content.includes("core")
        ? "PARTS_EXCHANGE"
        : partNumber === "UNKNOWN"
          ? "UNKNOWN"
          : "NEW_PART_PURCHASE";
  const confidenceScore = partNumber === "UNKNOWN" ? 0.48 : requestType === "UNKNOWN" ? 0.62 : 0.95;
  const requiresHumanReview = confidenceScore < 0.85 || partNumber === "UNKNOWN";
  return {
    id: input.emailId,
    emailClassification: partNumber === "UNKNOWN" && !content.includes("quote") ? "UNKNOWN" : "RFQ",
    requestType,
    confidenceScore,
    reasoningSummary: requiresHumanReview
      ? "Development analysis detected incomplete RFQ details and routed the request for human review."
      : "Development analysis found RFQ language, a part number, and a quantity.",
    requiresHumanReview,
    developmentMode: true,
    extractedData: {
      customer: { name: input.senderName, email: input.senderEmail },
      items: [{ partNumber, description: "Aviation component", quantity, condition: "Serviceable", requestedCondition: "Serviceable" }],
      requirements: { certification: [], deliveryRequirement: content.includes("asap") ? "ASAP" : "STANDARD", urgency: content.includes("urgent") || content.includes("asap") ? "HIGH" : "MEDIUM" },
      summary: input.bodyText.slice(0, 240),
    },
  };
}

export async function analyzeRfqEmail(input: AnalysisInput): Promise<Phase2Analysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return developmentAnalysis(input);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You classify aviation aftermarket emails. Return only JSON with emailClassification, requestType, confidenceScore (0 to 1), customer, items, requirements, summary, requiresHumanReview, and reasoningSummary. Never include private chain-of-thought; reasoningSummary must be one concise sentence. Use requestType PARTS_EXCHANGE, NEW_PART_PURCHASE, REPAIR, OVERHAUL, or UNKNOWN.",
        },
        {
          role: "user",
          content: JSON.stringify({ subject: input.subject, body: input.bodyText, attachmentText: input.attachmentText }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`AI provider request failed (${response.status})`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no analysis");
  const parsed = JSON.parse(content) as Omit<Phase2Analysis, "id" | "developmentMode">;
  return { ...parsed, id: input.emailId, developmentMode: false };
}