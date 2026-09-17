import { Router, type IRouter } from "express";
import { GetMicrosoftStatusResponse } from "@workspace/api-zod";
import { getMicrosoftProfile } from "../services/microsoft-graph";

import crypto from "crypto";
import { integrationsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function microsoftStatus() {
  try {
    const profile = await getMicrosoftProfile();
    return GetMicrosoftStatusResponse.parse({
      connected: true,
      mailbox: profile.mail ?? profile.userPrincipalName ?? null,
      lastSync: null,
      message: "Microsoft 365 mailbox connected through the secure Outlook integration.",
      configured: true,
      developmentMode: false,
      demoModeEnabled: process.env.ENABLE_DEMO_EMAIL_PROVIDER === 'true',
    });
  } catch {
    return GetMicrosoftStatusResponse.parse({
      connected: false,
      mailbox: null,
      lastSync: null,
      message: "Microsoft 365 credentials not configured (Mock/Development fallback active).",
      configured: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_TENANT_ID),
      developmentMode: true,
      demoModeEnabled: process.env.ENABLE_DEMO_EMAIL_PROVIDER === 'true',
    });
  }
}

router.get("/integrations/microsoft/status", async (_req, res) => {
  res.json(await microsoftStatus());
});

router.get("/integrations/microsoft/connect", async (req, res) => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/integrations/microsoft/callback`;
  
  if (!clientId || !tenantId) {
    res.status(400).send("Microsoft OAuth credentials not configured in environment.");
    return;
  }
  
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");
  
  res.cookie("oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 10 });
  res.cookie("oauth_verifier", verifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 10 });
  
  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("response_mode", "query");
  authUrl.searchParams.append("scope", "offline_access Mail.Read User.Read");
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge", challenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  
  res.redirect(authUrl.toString());
});

router.get("/integrations/microsoft/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const savedState = req.cookies?.oauth_state;
  const verifier = req.cookies?.oauth_verifier;
  
  if (error) {
    res.status(400).send(`OAuth error: ${error_description}`);
    return;
  }
  
  if (!code || !state || !savedState || state !== savedState || !verifier) {
    res.status(400).send("Invalid OAuth state or missing code.");
    return;
  }
  
  res.clearCookie("oauth_state");
  res.clearCookie("oauth_verifier");
  
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/integrations/microsoft/callback`;
  
  try {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "offline_access Mail.Read User.Read",
        code: code as string,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
    
    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      res.status(400).send(`Failed to exchange token: ${err}`);
      return;
    }
    
    const tokens = await tokenResponse.json() as any;
    if (db) {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await db.insert(integrationsTable).values({
        provider: "microsoft",
        tenantId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      }).onConflictDoUpdate({
        target: integrationsTable.provider,
        set: {
          tenantId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    }
    
    // Redirect back to frontend
    res.redirect("/settings/integrations");
  } catch (err) {
    res.status(500).send("Internal server error during OAuth callback.");
  }
});

router.post("/integrations/microsoft/disconnect", async (_req, res) => {
  if (db) {
    await db.delete(integrationsTable).where(eq(integrationsTable.provider, "microsoft"));
  }
  res.json({
    connected: false,
    mailbox: null,
    lastSync: null,
    message: "Microsoft 365 connection has been removed.",
    configured: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_TENANT_ID),
    developmentMode: false,
    demoModeEnabled: process.env.ENABLE_DEMO_EMAIL_PROVIDER === 'true',
  });
});

router.post("/integrations/microsoft/config", async (req, res) => {
  const { mailbox } = req.body;
  if (!mailbox || typeof mailbox !== "string") {
    res.status(400).send("Mailbox is required.");
    return;
  }
  
  if (db) {
    await db.update(integrationsTable)
      .set({ mailbox, updatedAt: new Date() })
      .where(eq(integrationsTable.provider, "microsoft"));
  }
  
  res.json(await microsoftStatus());
});

export default router;