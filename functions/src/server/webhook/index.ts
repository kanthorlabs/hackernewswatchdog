import { Router } from "express";
import * as telegram from "./telegram";

const router = Router();

router.post("/telegram", telegram.use());

export default router;
