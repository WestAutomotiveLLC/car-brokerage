require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase connection by counting bids
    const { count, error } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true });

    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      supabase: 'Connected',
      database: 'Ready',
      total_bids: count || 0
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      supabase: 'Connected',
      error: error.message
    });
  }
});

// Create a new bid
app.post('/api/bids', async (req, res) => {
  try {
    const { lot_number, max_bid, user_id, notes } = req.body;
    
    // Calculate deposit if bid is over $2500
    const deposit_amount = max_bid > 2500 ? max_bid * 0.10 : 0;
    
    const { data, error } = await supabase
      .from('bids')
      .insert([
        { 
          user_id: user_id || 'demo-user-123', 
          lot_number, 
          max_bid, 
          deposit_amount,
          notes,
          status: 'pending'
        }
      ])
      .select();

    if (error) throw error;
    
    res.json({ 
      success: true, 
      bid: data[0],
      requires_deposit: deposit_amount > 0,
      deposit_amount: deposit_amount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's bids
app.get('/api/bids/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json({ bids: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all bids (for admin view)
app.get('/api/bids', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json({ bids: data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { email, full_name, phone, address } = req.body;
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          email, 
          full_name, 
          phone, 
          address
        }
      ])
      .select();

    if (error) throw error;
    
    res.json({ success: true, user: data[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/place-bid', (req, res) => {
  res.sendFile(path.join(__dirname, '../place-bid.html'));
});

app.get('/my-bids', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-bids.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 West Automotive Brokerage server running on port ${PORT}`);
  console.log(`📊 Supabase connected: ${process.env.SUPABASE_URL}`);
});
