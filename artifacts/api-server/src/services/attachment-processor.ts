import type { Phase2Attachment } from "./phase2-state";
if (typeof global !== "undefined" && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix { constructor() {} };
}
const pdfParse = require("pdf-parse");
import * as xlsx from "xlsx";

const supportedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

export async function processAttachmentMetadata(
  attachment: Omit<Phase2Attachment, "processingStatus" | "extractedText"> & { contentBytes?: string },
): Promise<Phase2Attachment> {
  if (!supportedTypes.has(attachment.contentType)) {
    return { ...attachment, processingStatus: "UNSUPPORTED", extractedText: null };
  }
  
  if (!attachment.contentBytes) {
    return { ...attachment, processingStatus: "FAILED", extractedText: null };
  }
  
  const buffer = Buffer.from(attachment.contentBytes, "base64");
  let extractedText: string | null = null;
  let processingStatus: "EXTRACTED" | "FAILED" | "ENCRYPTED" | "CORRUPT" = "EXTRACTED";
  
  try {
    if (attachment.contentType === "application/pdf") {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (attachment.contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || attachment.contentType === "text/csv") {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      extractedText = xlsx.utils.sheet_to_csv(worksheet);
    } else if (attachment.contentType === "text/plain") {
      extractedText = buffer.toString("utf8");
    }
    
    if (extractedText) {
      extractedText = extractedText.slice(0, 50000); // Limit length
    } else {
      processingStatus = "FAILED";
    }
  } catch (error) {
    processingStatus = "FAILED";
  }

  return {
    id: attachment.id,
    emailId: attachment.emailId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    fileSize: attachment.fileSize,
    processingStatus,
    extractedText,
  };
}