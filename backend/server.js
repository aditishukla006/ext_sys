require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

const cors = require("cors");
app.use(cors({
  origin: "https://ext-sys.vercel.app", // no trailing slash!
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
}));

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Mongo Error", err));

app.use("/api/keywords", require("./routes/keywords"));

app.listen(5050, () =>
  console.log("🚀 Backend running on port 5050")
);
