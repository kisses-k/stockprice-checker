const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  likes: { type: [String], default: [] } // Stores an array of hashed IP addresses
});

module.exports = mongoose.model('Stock', StockSchema);