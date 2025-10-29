require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  console.error('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('✅ Supabase client initialized');
console.log('💳 Stripe client initialized');
console.log('🚗 West Automotive Brokerage server running on port', PORT);
console.log('📊 Supabase connected:', process.env.SUPABASE_URL ? 'Yes' : 'No');
console.log('💳 Stripe connected:', process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No');
console.log('📁 Current directory:', __dirname);
console.log('🌐 Live at: https://car-brokerage.onrender.com');

// Function to find HTML files in multiple locations
function findHTMLFile(filename) {
  const possiblePaths = [
    path.join(__dirname, filename),
    path.join(__dirname, '..', filename),
    path.join(__dirname, '../src', filename),
    path.join(__dirname, '../../', filename),
    path.join(process.cwd(), filename)
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
    const indexFound = findHTMLFile('index.html');
    const placeBidFound = findHTMLFile('place-bid.html');
    const myBidsFound = findHTMLFile('my-bids.html');
    
    res.json({ 
      status: 'OK', 
      message: 'West Automotive API running',
      supabase: 'Connected',
      stripe: 'Connected',
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

// Create a new bid
app.post('/api/bids', async (req, res) => {
  try {
    const { lot_number, max_bid, user_id } = req.body;
    
    const deposit_amount = max_bid > 2500 ? max_bid * 0.10 : 0;
    const service_fee = 215;
    const total_amount = deposit_amount + service_fee;
    
    const { data, error } = await supabase
      .from('bids')
      .insert([
        { 
          user_id: user_id || 'demo-user-123', 
          lot_number, 
          max_bid, 
          deposit_amount,
          service_fee,
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
      message: 'Bid created! Please complete payment.',
      bid: data[0],
      requires_payment: true,
      total_amount: total_amount,
      deposit_amount: deposit_amount,
      service_fee: service_fee
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Create Stripe payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, bid_id, user_id, lot_number } = req.body;
    
    console.log('Creating payment intent for amount:', amount, 'bid:', bid_id);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bid_id: bid_id,
        user_id: user_id,
        lot_number: lot_number,
        payment_type: 'bid_payment'
      }
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Update bid with payment intent ID
    await supabase
      .from('bids')
      .update({ 
        payment_intent_id: paymentIntent.id
      })
      .eq('id', bid_id);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Confirm payment and update bid
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, bid_id } = req.body;
    
    console.log('Confirming payment:', paymentIntentId, 'for bid:', bid_id);
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      const { data, error } = await supabase
        .from('bids')
        .update({ 
          status: 'pending'
        })
        .eq('id', bid_id)
        .select();

      if (error) throw error;

      console.log('Payment confirmed and bid updated:', bid_id);

      res.json({
        success: true,
        message: 'Payment confirmed! Your bid is now pending.',
        bid: data[0]
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment not completed. Status: ' + paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

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

// Update bid status (for admin)
app.patch('/api/bids/:bid_id', async (req, res) => {
  try {
    const { bid_id } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('bids')
      .update({ status })
      .eq('id', bid_id)
      .select();

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Bid status updated',
      bid: data[0]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Payment success page
app.get('/payment-success', (req, res) => {
  const bidId = req.query.bid_id;
  const paymentSuccess = req.query.payment_intent;
  
  if (paymentSuccess && bidId) {
    res.redirect(`/my-bids?payment_success=true&bid_id=${bidId}`);
  } else {
    res.redirect('/my-bids');
  }
});

// Serve HTML pages
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
          <p>place-bid.html not found.</p>
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
          <p>my-bids.html not found.</p>
          <a href="/">Return to Home</a>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server started successfully!');
  console.log('🔍 Searching for HTML files...');
  findHTMLFile('index.html');
  findHTMLFile('place-bid.html');
  findHTMLFile('my-bids.html');
});
