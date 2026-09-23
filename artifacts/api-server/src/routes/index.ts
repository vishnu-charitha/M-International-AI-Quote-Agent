import { Router, type IRouter } from "express";
import healthRouter from "./health";
import operationsRouter from "./operations";
import ingestionRouter from "./ingestion";
import integrationsRouter from "./integrations";
import { quotesRouter } from "./quotes";
import { ordersRouter } from "./orders";
import { invoicesRouter } from "./invoices";
import { fulfillmentsRouter } from "./fulfillments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingestionRouter);
router.use(integrationsRouter);
router.use(operationsRouter);
router.use(quotesRouter);
router.use(ordersRouter);
router.use(invoicesRouter);
router.use("/fulfillments", fulfillmentsRouter);
router.use("/orders", fulfillmentsRouter);

export default router;
