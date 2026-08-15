import { Router } from "express";
import * as OrderController from "../controllers/order.controller";

const router = Router();

router.post("/", OrderController.createOrder);

export default router;
