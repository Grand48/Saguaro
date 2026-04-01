import { Router, type IRouter } from "express";
import healthRouter from "./health";
import crewRouter from "./crew";
import jobsRouter from "./jobs";
import tasksRouter from "./tasks";
import messagesRouter from "./messages";
import photosRouter from "./photos";
import equipmentRouter from "./equipment";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(crewRouter);
router.use(jobsRouter);
router.use(tasksRouter);
router.use(messagesRouter);
router.use(photosRouter);
router.use(equipmentRouter);
router.use(dashboardRouter);

export default router;
