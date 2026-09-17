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

import { db } from "@workspace/db";
import { integrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function isMicrosoftConfigured() {
  return !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_TENANT_ID;
}

async function getAccessToken() {
  if (!db) throw new Error("Database not connected.");
  const integrations = await db.select().from(integrationsTable).where(eq(integrationsTable.provider, "microsoft"));
  const integration = integrations[0];
  
  if (!integration || !integration.accessToken) {
    throw new Error("Microsoft OAuth tokens not found in database.");
  }
  
  // Check if token is expired or expires in next 5 minutes
  if (integration.expiresAt && new Date(integration.expiresAt.getTime() - 5 * 60000) < new Date()) {
    // Refresh token
    const tenantId = process.env.MICROSOFT_TENANT_ID!;
    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken || "",
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error("Failed to refresh Microsoft token.");
    }
    
    const tokens = await tokenResponse.json() as any;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    await db.update(integrationsTable).set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      updatedAt: new Date(),
    }).where(eq(integrationsTable.id, integration.id));
    
    return tokens.access_token as string;
  }
  
  return integration.accessToken;
}

async function graphRequest<T>(path: string, init?: ProxyInit): Promise<T> {
  const token = await getAccessToken();
  const url = `https://graph.microsoft.com${path}`;
  const response = await fetch(url, {
    method: init?.method || "GET",
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`
    },
    body: init?.body
  });
  
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Microsoft Graph request failed (${response.status}): ${message || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function getMicrosoftProfile() {
  if (!isMicrosoftConfigured()) {
    throw new Error("Microsoft credentials not configured.");
  }
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