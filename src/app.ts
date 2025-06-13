import express from "express";
import dotenv from "dotenv";
import contactRouter from "./routes/contact.route";

dotenv.config();

const app: express.Application = express();

app.use(express.json());

app.use("/identity", contactRouter);

export default app;
