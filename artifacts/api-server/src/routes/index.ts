import { Router, type IRouter } from "express";
import healthRouter from "./health";
import crewRouter from "./crew";
import jobsRouter from "./jobs";
import tasksRouter from "./tasks";
import messagesRouter from "./messages";
import photosRouter from "./photos";
import equipmentRouter from "./equipment";
import dashboardRouter from "./dashboard";
import locationsRouter from "./locations";
import timeOffRouter from "./time-off";
import crewDocumentsRouter from "./crew-documents";
import notificationsRouter from "./notifications";
import timeEntriesRouter from "./time-entries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notificationsRouter);
router.use(timeEntriesRouter);
router.use(crewRouter);
router.use(locationsRouter);
router.use(timeOffRouter);
router.use(crewDocumentsRouter);
router.use(jobsRouter);
router.use(tasksRouter);
router.use(messagesRouter);
router.use(photosRouter);
router.use(equipmentRouter);
router.use(dashboardRouter);

export default router;
