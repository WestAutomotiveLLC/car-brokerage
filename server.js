const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded Supabase credentials
const SUPABASE_URL = 'https://xjbatcwgenoprbgouiyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYmF0Y3dnZW5vcHJiZ291aXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDU4MjAsImV4cCI6MjA3NzMyMTgyMH0.A9Ij8pTsy-BQhSjks5Hrfp1cDsWNBVbvwlt2LoFE4D4';

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client initialized');
console.log('🚗 West Automotive Brokerage server running on port', PORT);
console.log('📊 Supabase connected:', SUPABASE_URL);
console.log('📁 Serving files from:', path.join(__dirname, '..'));
console.log('🌐 Live at: https://car-brokerage.onrender.com');

// Middleware - Serve static files from root directory (one level up)
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      supabase: 'Connected'
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      error: error.message
    });
  }
});

// User Registration - WITH BETTER ERROR MESSAGES
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name, phone, address } = req.body;
    
    console.log('Signup attempt for:', email);
    
    // Create user in Supabase Auth only
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
          address: address || ''
        }
      }
    });

    if (error) {
      console.error('Signup error:', error.message);
      
      // Check if user already exists
      if (error.message.includes('already registered') || error.message.includes('user_exists')) {
        return res.status(400).json({ 
          success: false,
          error: 'User already exists with this email. Please try logging in instead.'
        });
      }
      
      // Check for weak password
      if (error.message.includes('password')) {
        return res.status(400).json({ 
          success: false,
          error: 'Password is too weak. Please use at least 6 characters.'
        });
      }
      
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }

    console.log('Signup successful for:', email);
    
    // Check if email confirmation is required
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return res.json({ 
        success: true, 
        message: 'User already created. Please check your email to verify your account or try logging in.',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          full_name: data.user?.user_metadata?.full_name,
          phone: data.user?.user_metadata?.phone
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        full_name: data.user?.user_metadata?.full_name,
        phone: data.user?.user_metadata?.phone
      }
    });
  } catch (error) {
    console.error('Signup catch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during registration' 
    });
  }
});

// User Login - WITH BETTER ERROR MESSAGES
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error.message);
      
      // Check for specific error types
      if (error.message.includes('Invalid login credentials')) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid email or password. Please try again.'
        });
      }
      
      if (error.message.includes('Email not confirmed')) {
        return res.status(400).json({ 
          success: false,
          error: 'Please check your email to verify your account before logging in.'
        });
      }
      
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }

    console.log('Login successful for:', email);
    
    res.json({ 
      success: true, 
      message: 'Login successful!',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
        phone: data.user.user_metadata?.phone
      },
      session: data.session
    });
  } catch (error) {
    console.error('Login catch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during login' 
    });
  }
});

// Get current user
app.get('/api/auth/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
        phone: user.user_metadata?.phone
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
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

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Bid placed successfully!',
      bid: data[0],
      requires_deposit: deposit_amount > 0,
      deposit_amount: deposit_amount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
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

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.json({ 
      success: true,
      bids: data 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get all bids (for admin view)
app.get('/api/bids', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.json({ 
      success: true,
      bids: data 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Serve HTML pages from root directory (one level up)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/place-bid', (req, res) => {
  res.sendFile(path.join(__dirname, '../place-bid.html'));
});

app.get('/my-bids', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-bids.html'));
});

// Catch-all route for any other HTML files
app.get('*.html', (req, res) => {
  const fileName = req.path.substring(1);
  res.sendFile(path.join(__dirname, '..', fileName));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server started successfully!');
});
