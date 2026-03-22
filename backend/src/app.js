import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import settlementRoutes from "./routes/settlementRoutes.js";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api", settlementRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // express.json() sets err.status = 400 on malformed JSON
    const status = err.status || 500;
    const message = err.type === 'entity.parse.failed' 
      ? "Malformed JSON in request body" 
      : "Internal Server Error";

    res.status(status).json({
        success: false,
        error: message,
    });
});

export default app;
