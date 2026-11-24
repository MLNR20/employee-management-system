// Fills the inventory with 20 sample items (laptops, monitors, phones, ...). Safe to run again: an item
// whose serial number already exists is left alone. Run from the server folder:
//   MONGO_URI=mongodb://... node scripts/seedInventory.js
// Items are never "in use" here, since that status means an employee is holding the item.
import mongoose from "mongoose";
import config from "../src/infrastructure/config/config.js";
import { ItemModel } from "../src/infrastructure/persistence/mongo/models/itemModel.js";

if (!config.dbConnection) {
  console.error("Set MONGO_URI to the database to seed.");
  process.exit(1);
}

// [name, serialNumber, category, status, location, purchaseDate, purchaseCost, notes]
const ITEMS = [
  ["Dell Latitude 5440", "LAP-0001", "Laptop", "available", "IT Storage Room", "2024-02-12", 58000, ""],
  ["Dell Latitude 5440", "LAP-0002", "Laptop", "available", "IT Storage Room", "2024-02-12", 58000, ""],
  ["Lenovo ThinkPad E14", "LAP-0003", "Laptop", "available", "IT Storage Room", "2024-05-20", 52000, ""],
  ["Lenovo ThinkPad E14", "LAP-0004", "Laptop", "maintenance", "IT Repair Bench", "2023-09-08", 52000, "Battery replacement"],
  ["MacBook Air M2", "LAP-0005", "Laptop", "available", "IT Storage Room", "2024-08-01", 74000, ""],
  ["HP EliteBook 840", "LAP-0006", "Laptop", "retired", "Archive Room", "2020-03-15", 61000, "End of life, screen damaged"],
  ["Dell P2422H 24in Monitor", "MON-0001", "Monitor", "available", "Main Office", "2023-11-02", 9500, ""],
  ["Dell P2422H 24in Monitor", "MON-0002", "Monitor", "available", "Main Office", "2023-11-02", 9500, ""],
  ["LG 27UL500 27in Monitor", "MON-0003", "Monitor", "available", "Main Office", "2024-01-18", 14500, ""],
  ["Samsung 24in Monitor", "MON-0004", "Monitor", "retired", "Archive Room", "2019-06-10", 7000, "Dead pixels"],
  ["iPhone 13", "PHN-0001", "Phone", "available", "HR Office", "2023-04-25", 42000, "Company phone"],
  ["Samsung Galaxy A54", "PHN-0002", "Phone", "available", "HR Office", "2024-03-30", 25000, "Company phone"],
  ["Samsung Galaxy A54", "PHN-0003", "Phone", "maintenance", "IT Repair Bench", "2024-03-30", 25000, "Cracked screen"],
  ["Logitech MX Keys Keyboard", "KEY-0001", "Keyboard", "available", "IT Storage Room", "2024-06-14", 6500, ""],
  ["Logitech MX Master 3 Mouse", "MSE-0001", "Mouse", "available", "IT Storage Room", "2024-06-14", 5500, ""],
  ["Epson L3250 Printer", "PRT-0001", "Printer", "available", "Main Office", "2023-07-19", 11000, "Shared printer"],
  ["Brother HL-L2375DW Printer", "PRT-0002", "Printer", "maintenance", "Accounting Office", "2022-10-05", 13500, "Paper feed jam"],
  ["Cisco 24-Port Switch", "NET-0001", "Networking", "available", "Server Room", "2022-01-21", 32000, ""],
  ["Jabra Evolve2 65 Headset", "HDS-0001", "Headset", "available", "HR Office", "2024-09-09", 9800, ""],
  ["Logitech C920 Webcam", "CAM-0001", "Webcam", "available", "IT Storage Room", "2024-07-03", 4200, ""],
];

try {
  await mongoose.connect(config.dbConnection);

  let created = 0;
  for (const [name, serialNumber, category, status, location, purchaseDate, purchaseCost, notes] of ITEMS) {
    if (await ItemModel.exists({ serialNumber })) {
      console.log(`${serialNumber}: already existed`);
      continue;
    }
    await ItemModel.create({ name, serialNumber, category, status, location, purchaseDate: new Date(purchaseDate), purchaseCost, notes });
    created++;
  }

  console.log(`Inventory items: ${ITEMS.length}, new: ${created}`);
} finally {
  await mongoose.disconnect();
}
