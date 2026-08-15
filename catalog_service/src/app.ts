import express from "express";
import productRoutes from "./routes/product.routes";

const app = express();

app.use(express.json());
app.use("/products", productRoutes);

app.use((req, res) => {
    return res.status(404).json({ error: "Not found" });
})

export default app;