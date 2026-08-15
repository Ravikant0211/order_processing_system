import { Router } from "express";
import * as ProductController from "../controllers/product.controller";

const router = Router();

router.post("/", ProductController.createProduct);
router.get("/", ProductController.listProducts);
router.get("/:id", ProductController.getProduct);
router.patch("/:id/stock", ProductController.updateStock);


export default router;