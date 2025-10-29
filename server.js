const express = require('express');
const path = require('path');
const fs = require('fs');
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
console.log('📁 Current directory:', __dirname);
console.log('🌐 Live at: https://car-brokerage.onrender.com');

// Function to find HTML files in multiple locations
function findHTMLFile(filename) {
  const possiblePaths = [
    path.join(__dirname, filename),           // Same directory as server.js
    path.join(__dirname, '..', filename),     // One level up
    path.join(__dirname, '../src', filename), // In src folder
    path.join(__dirname, '../../', filename), // Two levels up
    path.join(process.cwd(), filename)        // Current working directory
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Found ${filename} at: ${filePath}`);
      return filePath;
    }
  }
  
  console.log(`❌ ${filename} not found in any location`);
  return null;
}

// Middleware - Try multiple static file locations
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(process.cwd()));
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test file locations
    const indexFound = findHTMLFile('index.html');
    const placeBidFound = findHTMLFile('place-bid.html');
    const myBidsFound = findHTMLFile('my-bids.html');
    
    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      supabase: 'Connected',
      files: {
        index: !!indexFound,
        placeBid: !!placeBidFound,
        myBids: !!myBidsFound
      }
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      error: error.message
    });
  }
});

// Serve HTML pages with dynamic file finding
app.get('/', (req, res) => {
  const filePath = findHTMLFile('index.html');
  if (filePath) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`
      <html>
        <body>
          <h1>West Automotive Brokerage</h1>
          <p>index.html not found. Please check your file structure.</p>
          <p>Current directory: ${__dirname}</p>
        </body>
      </html>
    `);
  }
});

app.get('/place-bid', (req, res) => {
  const filePath = findHTMLFile('place-bid.html');
  if (filePath) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`
      <html>
        <body>
          <h1>Place Bid - Page Not Found</h1>
          <p>place-bid.html not found. Please check your file structure.</p>
          <a href="/">Return to Home</a>
        </body>
      </html>
    `);
  }
});

app.get('/my-bids', (req, res) => {
  const filePath = findHTMLFile('my-bids.html');
  if (filePath) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`
      <html>
        <body>
          <h1>My Bids - Page Not Found</h1>
          <p>my-bids.html not found. Please check your file structure.</p>
          <a href="/">Return to Home</a>
        </body>
      </html>
    `);
  }
});

// Keep all your existing API routes (signup, login, bids, etc.)
// User Registration
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name, phone, address } = req.body;
    
    console.log('Signup attempt for:', email);
    
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
      
      if (error.message.includes('already registered') || error.message.includes('user_exists')) {
        return res.status(400).json({ 
          success: false,
          error: 'User already exists with this email. Please try logging in instead.'
        });
      }
      
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

// User Login
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

// Create a new bid
app.post('/api/bids', async (req, res) => {
  try {
    const { lot_number, max_bid, user_id, notes } = req.body;
    
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

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server started successfully!');
  
  // Test file locations on startup
  console.log('🔍 Searching for HTML files...');
  findHTMLFile('index.html');
  findHTMLFile('place-bid.html');
  findHTMLFile('my-bids.html');
});
