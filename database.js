const { MongoClient } = require("mongodb");
const url = process.env.MONGO_URL;
let connectDB = new MongoClient(url).connect();

module.exports = connectDB;
