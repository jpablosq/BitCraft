const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const authRoutes = require("./src/routes/auth.routes");
const connectionRoutes = require("./src/routes/connection.routes");

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const app = express();
const PORT = process.env.PORT || 3000;


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "BitCraft API funcionando",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/connections", connectionRoutes);

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});