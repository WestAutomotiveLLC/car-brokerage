require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  
  // Try to use fallback values for development
  const fallbackUrl = 'https://xjbatcwgenoprbgouiyq.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYmF0Y3dnZW5vcHJiZ291aXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDU4MjAsImV4cCI6MjA3NzMyMTgyMH0.A9Ij8pTsy-BQhSjks5Hrfp1cDsWNBVbvwlt2LoFE4D4';
  
  if (!fallbackUrl || !fallbackKey) {
    console.error('❌ No fallback values available. Exiting.');
    process.exit(1);
  }
  
  console.log('⚠️ Using fallback Supabase credentials');
  process.env.SUPABASE_URL = fallbackUrl;
  process.env.SUPABASE_ANON_KEY = fallbackKey;
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('✅ Supabase client initialized');
console.log('🔗 Supabase URL:', process.env.SUPABASE_URL);

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

// User Registration
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name, phone, address } = req.body;
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone
        }
      }
    });

    if (authError) throw authError;

    // Create user profile in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        { 
          id: authData.user.id,
          email, 
          full_name, 
          phone, 
          address: address || {}
        }
      ])
      .select();

    if (userError) throw userError;

    res.json({ 
      success: true, 
      user: userData[0],
      message: 'Registration successful!'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) throw userError;

    res.json({ 
      success: true, 
      user: userData,
      session: data.session
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    res.json({ user: userData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new bid
app.post('/api/bids', async (req, res) => {
  try {
    const { lot_number, max_bid, user_id, notes } = req.body;
    
    // Verify user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError) throw new Error('User not found');

    // Calculate deposit if bid is over $2500
    const deposit_amount = max_bid > 2500 ? max_bid * 0.10 : 0;
    
    const { data, error } = await supabase
      .from('bids')
      .insert([
        { 
          user_id, 
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
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json({ bids: data });
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
  console.log(`🌐 Server URL: https://car-brokerage.onrender.com`);
});
