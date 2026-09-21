import { Router, type IRouter } from "express";
import healthRouter from "./health";
import operationsRouter from "./operations";
import ingestionRouter from "./ingestion";
import integrationsRouter from "./integrations";
import { quotesRouter } from "./quotes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingestionRouter);
router.use(integrationsRouter);
router.use(operationsRouter);
router.use(quotesRouter);

export default router;
