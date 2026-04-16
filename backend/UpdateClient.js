const mongoose = require("mongoose");
require("dotenv").config();

async function updateClients() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const result = await mongoose.connection.collection("clients").updateMany(
      {},
      {
        $set: {
          deactivatedAt: null,
          deactivationReason: null,
          canReactivate: true
        }
      }
    );
    
    console.log(`✅ ${result.modifiedCount} documents updated`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

updateClients();