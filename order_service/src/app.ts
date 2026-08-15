import express, { Request, Response } from "express";
import orderRoutes from "./routes/order.routes";

const app = express();

app.use(express.json());
app.use("/orders", orderRoutes);

app.use((req: Request, res: Response) => {
    return res.status(404).json({ error: "Not found" });
})

export default app;