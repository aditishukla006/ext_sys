require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

const cors = require("cors");
const allowedOrigins = [
  "https://ext-sys.vercel.app",       // frontend
  "https://seller.indiamart.com"      // content script
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow curl/Postman
    // Allow any chrome-extension
    if(origin.startsWith("chrome-extension://")) return callback(null, true);
    // Check against other allowed origins
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'CORS policy: This origin is not allowed';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"]
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
