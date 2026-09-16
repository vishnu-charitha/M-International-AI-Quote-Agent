import { Router, type IRouter } from "express";
import { GetMicrosoftStatusResponse } from "@workspace/api-zod";
import { getMicrosoftProfile } from "../services/microsoft-graph";

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
    });
  } catch {
    return GetMicrosoftStatusResponse.parse({
      connected: false,
      mailbox: null,
      lastSync: null,
      message: "Microsoft 365 integration is not configured. Add the Outlook integration to connect a real mailbox.",
      configured: false,
      developmentMode: true,
    });
  }
}

router.get("/integrations/microsoft/status", async (_req, res) => {
  res.json(await microsoftStatus());
});

router.get("/integrations/microsoft/connect", async (_req, res) => {
  res.json(await microsoftStatus());
});

router.get("/integrations/microsoft/callback", async (_req, res) => {
  res.json(await microsoftStatus());
});

router.post("/integrations/microsoft/disconnect", async (_req, res) => {
  const status = await microsoftStatus();
  res.json({
    ...status,
    message: status.connected
      ? "Microsoft 365 is managed by the secure workspace integration. Disconnect it from the connected integrations panel."
      : status.message,
  });
});

export default router;