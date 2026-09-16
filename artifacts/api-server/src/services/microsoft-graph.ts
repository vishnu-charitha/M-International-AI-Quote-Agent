import { ReplitConnectors } from "@replit/connectors-sdk";

type GraphMessage = {
  id: string;
  internetMessageId?: string;
  conversationId?: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  ccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  body?: { content?: string; contentType?: string };
  bodyPreview?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
};

type GraphAttachment = {
  id: string;
  name?: string;
  contentType?: string;
  size?: number;
  contentBytes?: string;
};

type ProxyInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

async function graphRequest<T>(path: string, init?: ProxyInit): Promise<T> {
  const connectors = new ReplitConnectors();
  const response = await connectors.proxy("outlook", path, init);
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph request failed (${response.status}): ${message || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function getMicrosoftProfile() {
  return graphRequest<{ displayName?: string; mail?: string; userPrincipalName?: string }>("/v1.0/me?$select=displayName,mail,userPrincipalName");
}

export async function listInboxMessages() {
  const params = new URLSearchParams({
    "$select": "id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,body,bodyPreview,receivedDateTime,hasAttachments",
    "$orderby": "receivedDateTime desc",
    "$top": "25",
  });
  const data = await graphRequest<{ value?: GraphMessage[] }>(`/v1.0/me/mailFolders/inbox/messages?${params.toString()}`, {
    headers: { Prefer: 'outlook.body-content-type="text"' },
  });
  return data.value ?? [];
}

export async function listMessageAttachments(messageId: string) {
  const data = await graphRequest<{ value?: GraphAttachment[] }>(`/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size,contentBytes`);
  return data.value ?? [];
}

export function normalizeGraphMessage(message: GraphMessage) {
  const sender = message.from?.emailAddress;
  return {
    microsoftMessageId: message.id,
    internetMessageId: message.internetMessageId ?? null,
    conversationId: message.conversationId ?? null,
    senderName: sender?.name ?? "Unknown sender",
    senderEmail: sender?.address ?? "unknown@example.com",
    recipients: (message.toRecipients ?? []).map((item) => item.emailAddress?.address).filter(Boolean) as string[],
    cc: (message.ccRecipients ?? []).map((item) => item.emailAddress?.address).filter(Boolean) as string[],
    subject: message.subject ?? "(no subject)",
    bodyText: message.body?.content ?? message.bodyPreview ?? "",
    receivedAt: message.receivedDateTime ?? new Date().toISOString(),
    hasAttachments: Boolean(message.hasAttachments),
  };
}