import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import securityRouter from "./security.js";
import reportsRouter from "./reports.js";
import usersRouter from "./users.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(securityRouter);
router.use(reportsRouter);
router.use(usersRouter);

export default router;
