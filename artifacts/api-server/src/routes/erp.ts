
import { Router, type IRouter, type Response } from "express";

const router: IRouter = Router();

const ERP_BASE_URL = process.env.DUMMY_ERP_BASE_URL;
const ERP_CLIENT_ID = process.env.DUMMY_ERP_CLIENT_ID;
const ERP_CLIENT_SECRET = process.env.DUMMY_ERP_CLIENT_SECRET;
const ERP_SCOPE = process.env.DUMMY_ERP_SCOPE;

interface ErpTokenResponse {
  access_token?: string;
}

async function getErpToken(): Promise<string> {
  if (
    !ERP_BASE_URL ||
    !ERP_CLIENT_ID ||
    !ERP_CLIENT_SECRET ||
    !ERP_SCOPE
  ) {
    throw new Error("Dummy ERP environment variables are missing");
  }

  const response = await fetch(
    `${ERP_BASE_URL}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: ERP_CLIENT_ID,
        client_secret: ERP_CLIENT_SECRET,
        scope: ERP_SCOPE,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Dummy ERP authentication failed (${response.status})`,
    );
  }

  const data = (await response.json()) as ErpTokenResponse;

  if (!data.access_token) {
    throw new Error("Dummy ERP returned no access token");
  }

  return data.access_token;
}

async function getErpData(path: string): Promise<unknown> {
  if (!ERP_BASE_URL) {
    throw new Error("DUMMY_ERP_BASE_URL is not configured");
  }

  const token = await getErpToken();

  const response = await fetch(`${ERP_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `Dummy ERP request failed (${response.status})`,
    );
  }

  return response.json();
}

function handleErpError(res: Response, error: unknown): void {
  const message =
    error instanceof Error ? error.message : "Unknown error";

  console.error("[Dummy ERP]", message);

  const configurationError =
    message.includes("environment variables") ||
    message.includes("not configured");

  res.status(configurationError ? 500 : 502).json({
    error: configurationError
      ? "Dummy ERP configuration error"
      : "Dummy ERP request failed",
    message,
  });
}

router.get("/erp/customers", async (_req, res) => {
  try {
    res.json(await getErpData("/data/CustomersV3"));
  } catch (error) {
    handleErpError(res, error);
  }
});

router.get("/erp/products", async (_req, res) => {
  try {
    res.json(await getErpData("/data/ReleasedProductsV2"));
  } catch (error) {
    handleErpError(res, error);
  }
});

router.get("/erp/inventory/:itemNumber", async (req, res) => {
  try {
    const itemNumber = String(req.params.itemNumber ?? "").trim();

    if (!/^[A-Za-z0-9-]+$/.test(itemNumber)) {
      res.status(400).json({ error: "Invalid item number" });
      return;
    }

    const query = new URLSearchParams({ itemNumber });

    const data = await getErpData(
      `/data/OnHandInventory?${query.toString()}`,
    );

    res.json(data);
  } catch (error) {
    handleErpError(res, error);
  }
});

export default router;
