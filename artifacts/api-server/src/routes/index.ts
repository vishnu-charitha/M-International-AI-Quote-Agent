import { Router, type IRouter } from "express";
import healthRouter from "./health";
import operationsRouter from "./operations";
import ingestionRouter from "./ingestion";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ingestionRouter);
router.use(integrationsRouter);
router.use(operationsRouter);

export default router;
