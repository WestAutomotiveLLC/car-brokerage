const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'West Automotive API running' });
});

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Route for place-bid page
app.get('/place-bid', (req, res) => {
  res.sendFile(path.join(__dirname, '../place-bid.html'));
});

// Route for my-bids page
app.get('/my-bids', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-bids.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`West Automotive Brokerage server running on port ${PORT}`);
});
