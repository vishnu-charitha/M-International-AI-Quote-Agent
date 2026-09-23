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

import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const AnalysisSchema = z.object({
  emailClassification: z.enum(["RFQ", "UNKNOWN", "OTHER"]),
  requestType: z.enum(["PARTS_EXCHANGE", "NEW_PART_PURCHASE", "REPAIR", "OVERHAUL", "UNKNOWN"]),
  confidenceScore: z.number().min(0).max(1),
  requiresHumanReview: z.boolean(),
  reasoningSummary: z.string(),
  extractedData: z.object({
    customer: z.object({
      name: z.string().nullish(),
      email: z.string().nullish(),
    }),
    items: z.array(z.object({
      partNumber: z.string(),
      description: z.string().nullish(),
      quantity: z.number(),
      condition: z.string().nullish(),
      requestedCondition: z.string().nullish(),
    })),
    requirements: z.object({
      deliveryRequirement: z.string().nullish(),
      urgency: z.string().nullish(),
    }),
    summary: z.string(),
  }),
});

export async function analyzeRfqEmail(input: AnalysisInput): Promise<Phase2Analysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OPENROUTER_API_KEY is required in production mode");
    }
    return developmentAnalysis(input);
  }
  
  const openai = new OpenAI({ 
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
  
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  
  const response = await openai.chat.completions.create({
    model: model,
    response_format: zodResponseFormat(AnalysisSchema, "analysis"),
    messages: [
      {
        role: "system",
        content: "You classify aviation aftermarket emails. Extract RFQ details. If missing critical info like part numbers, set requiresHumanReview to true. Return only structured data.",
      },
      {
        role: "user",
        content: JSON.stringify({ subject: input.subject, body: input.bodyText, attachmentText: input.attachmentText }),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no analysis");
  
  const parsed = JSON.parse(content) as Omit<Phase2Analysis, "id" | "developmentMode">;
  return { ...parsed, id: input.emailId, developmentMode: false };
}

export async function analyzeManualRfq(rawText: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OPENROUTER_API_KEY is required in production mode");
    }
    // Fallback logic for manual RFQ
    const content = rawText.toLowerCase();
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
    const missingInformation = partNumber === "UNKNOWN" ? ["Part number is missing"] : [];
    
    return {
      customer: { name: "Manual Entry", company: "Unknown", email: "manual@example.com", phone: "" },
      items: [{ partNumber, description: "Aviation component", quantity, condition: "Serviceable" }],
      requirements: { deliveryRequirement: content.includes("asap") ? "ASAP" : "STANDARD", urgency: content.includes("urgent") || content.includes("asap") ? "HIGH" : "MEDIUM" },
      requestType,
      confidenceScore,
      missingInformation,
    };
  }
  
  const openai = new OpenAI({ 
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
  
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  
  const response = await openai.chat.completions.create({
    model: model,
    response_format: zodResponseFormat(z.object({
      customer: z.object({
        name: z.string().default("Unknown"),
        company: z.string().default("Unknown"),
        email: z.string().default("unknown@example.com"),
        phone: z.string().default(""),
      }),
      items: z.array(z.object({
        partNumber: z.string().default("UNKNOWN"),
        description: z.string().default(""),
        quantity: z.number().default(1),
        condition: z.string().default(""),
      })),
      requirements: z.object({
        deliveryRequirement: z.string().default(""),
        urgency: z.string().default(""),
      }),
      requestType: z.enum(["PARTS_EXCHANGE", "NEW_PART_PURCHASE", "REPAIR", "OVERHAUL", "UNKNOWN"]).default("UNKNOWN"),
      confidenceScore: z.number().min(0).max(1),
      missingInformation: z.array(z.string()),
    }), "analysis"),
    messages: [
      {
        role: "system",
        content: "You classify manual aviation aftermarket RFQs. Extract RFQ details. Identify any missing critical information like part numbers or customer details. Return only structured data.",
      },
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no analysis");
  
  return JSON.parse(content);
}

export async function extractCustomerReplyInfo(rawText: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OPENROUTER_API_KEY is required in production mode");
    }
    // Fallback regex extraction for development without API key
    const phoneMatch = rawText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
    const addressMatch = rawText.match(/\d+[\w\s,]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr)[\w\s,]+(?:[A-Z]{2}\s+\d{5})?/i);
    
    return {
      name: null,
      company: null,
      email: null,
      phone: phoneMatch ? phoneMatch[0] : null,
      address: addressMatch ? addressMatch[0].trim() : null,
    };
  }

  const openai = new OpenAI({ 
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
  
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const response = await openai.chat.completions.create({
    model,
    response_format: zodResponseFormat(z.object({
      name: z.string().nullable(),
      company: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      address: z.string().nullable(),
    }), "customer_info"),
    messages: [
      {
        role: "system",
        content: "You extract customer contact information from an email reply. The text may contain conversational parts and a signature. Only extract the explicit details provided. If a field is not present, set it to null. Return only structured data.",
      },
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI provider returned no analysis");
  
  return JSON.parse(content) as {
    name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}