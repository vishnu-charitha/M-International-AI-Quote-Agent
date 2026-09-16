import type { Phase2Attachment } from "./phase2-state";

const supportedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

export function processAttachmentMetadata(
  attachment: Omit<Phase2Attachment, "processingStatus" | "extractedText"> & { contentBytes?: string },
): Phase2Attachment {
  if (!supportedTypes.has(attachment.contentType)) {
    return { ...attachment, processingStatus: "UNSUPPORTED", extractedText: null };
  }
  const decoded = attachment.contentBytes
    ? Buffer.from(attachment.contentBytes, "base64").toString("utf8")
    : "";
  const isTextLike = attachment.contentType === "text/plain" || attachment.contentType === "text/csv";
  return {
    id: attachment.id,
    emailId: attachment.emailId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    fileSize: attachment.fileSize,
    processingStatus: isTextLike && decoded ? "EXTRACTED" : "PROCESSING",
    extractedText: isTextLike && decoded ? decoded.slice(0, 20000) : null,
  };
}