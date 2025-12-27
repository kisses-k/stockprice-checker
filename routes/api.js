'use strict';

const StockModel = require('../models/Stock');
const fetch = require('node-fetch');
const crypto = require('crypto');

module.exports = function (app) {

  // 1. Helper function: Fetch Stock Price from Proxy
  async function getStockPrice(stock) {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
    const { symbol, latestPrice } = await response.json();
    return { symbol, price: latestPrice };
  }

  // 2. Helper function: Handle Database Logic (Find/Update Likes)
  async function saveStock(symbol, like, ip) {
    // Anonymize IP using SHA-256 hash
    const hashedIP = crypto.createHash('sha256').update(ip).digest('hex');

    // Find the stock in DB, or create it if it doesn't exist
    let stockDoc = await StockModel.findOne({ symbol: symbol });
    if (!stockDoc) {
      stockDoc = new StockModel({ symbol: symbol, likes: [] });
    }

    // If user clicked "like", add their hashed IP to the list (only if not already there)
    if (like && like === 'true') {
      if (!stockDoc.likes.includes(hashedIP)) {
        stockDoc.likes.push(hashedIP);
      }
    }
    
    await stockDoc.save();
    return stockDoc.likes.length; // Return total like count
  }

  // 3. The Main API Route
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      // In Codespaces/Proxies, the real IP is often in the 'x-forwarded-for' header
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      // CASE A: User requested TWO stocks (Array)
      if (Array.isArray(stock)) {
        const stock1Data = await getStockPrice(stock[0]);
        const stock2Data = await getStockPrice(stock[1]);

        const stock1Likes = await saveStock(stock[0], like, ip);
        const stock2Likes = await saveStock(stock[1], like, ip);

        const stockData = [
          {
            stock: stock1Data.symbol,
            price: stock1Data.price,
            rel_likes: stock1Likes - stock2Likes, // Relative difference
          },
          {
            stock: stock2Data.symbol,
            price: stock2Data.price,
            rel_likes: stock2Likes - stock1Likes,
          },
        ];

        return res.json({ stockData });
      } 
      
      // CASE B: User requested ONE stock (String)
      else {
        const { symbol, price } = await getStockPrice(stock);
        const likes = await saveStock(symbol, like, ip);
        
        return res.json({ 
          stockData: { stock: symbol, price, likes } 
        });
      }
    });
};