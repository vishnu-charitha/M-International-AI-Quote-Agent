export interface ComplianceRequest {
  partNumber: string;
  category: string;
  condition: string;
  certification: string;
}

export type ComplianceStatus = "PASSED" | "NEEDS_REVIEW" | "MISSING_DOCUMENTATION";

export interface ComplianceResponse {
  status: ComplianceStatus;
  reasons: string[];
}

export function checkCompliance(req: ComplianceRequest): ComplianceResponse {
  const reasons: string[] = [];
  let status: ComplianceStatus = "PASSED";

  if (!req.certification) {
    status = "MISSING_DOCUMENTATION";
    reasons.push("Missing certification documentation (e.g., 8130-3 or EASA Form 1).");
  } else {
    // Simulated checks based on condition and cert
    if (req.condition === "NE" && !req.certification.includes("COC") && !req.certification.includes("8130") && !req.certification.includes("EASA")) {
      status = "NEEDS_REVIEW";
      reasons.push(`Condition NE usually requires COC, but found ${req.certification}.`);
    }

    if (req.category === "Engine" && !req.certification.includes("8130-3") && !req.certification.includes("EASA Form 1")) {
      status = "NEEDS_REVIEW";
      reasons.push(`Engine parts require FAA 8130-3 or EASA Form 1. Found: ${req.certification}.`);
    }
  }

  return { status, reasons };
}
