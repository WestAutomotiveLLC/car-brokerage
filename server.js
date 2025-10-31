require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('✅ Supabase client initialized');
console.log('💳 Stripe client initialized');

// Session middleware
app.use(session({
  secret: process.env.FLASK_SECRET_KEY || 'car-brokerage-secret-123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

// Middleware
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(process.cwd()));
app.use(express.json());

// Helper function to sync user to database
async function syncUserToDatabase(userData) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      address: userData.address
    }, {
      onConflict: 'id'
    })
    .select();

  if (error) {
    console.error('Error syncing user to database:', error);
  }
  return data ? data[0] : null;
}

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ 
      success: false,
      error: 'Please log in to continue' 
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.session.admin && req.session.admin.loggedIn) {
    next();
  } else {
    res.status(401).json({ 
      success: false,
      error: 'Admin access required' 
    });
  }
};

// Health check
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'West Automotive API running',
    supabase: 'Connected',
    stripe: 'Connected'
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  res.json({
    success: true,
    loggedIn: !!req.session.user,
    user: req.session.user || null
  });
});

// Create a new bid
app.post('/api/bids', requireAuth, async (req, res) => {
  try {
    const { lot_number, max_bid } = req.body;
    const user_id = req.session.user.id;
    
    const deposit_amount = max_bid > 2500 ? max_bid * 0.10 : 0;
    const service_fee = 215;
    const total_amount = deposit_amount + service_fee;
    
    const { data, error } = await supabase
      .from('bids')
      .insert([
        { 
          user_id: user_id,
          lot_number, 
          max_bid: parseFloat(max_bid), 
          deposit_amount: parseFloat(deposit_amount),
          service_fee: parseFloat(service_fee),
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
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
    console.error('Create bid error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Create Stripe payment intent
app.post('/api/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { amount, bid_id, lot_number } = req.body;
    const user_id = req.session.user.id;
    
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
app.post('/api/confirm-payment', requireAuth, async (req, res) => {
  try {
    const { paymentIntentId, bid_id } = req.body;
    
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
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }

    // Create user session
    const userSession = {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name,
      phone: data.user.user_metadata?.phone
    };
    
    // Sync user to database
    await syncUserToDatabase(userSession);
    
    req.session.user = userSession;
    
    res.json({ 
      success: true, 
      message: 'Registration successful! Please check your email to verify your account.',
      user: req.session.user
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
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }

    // Create user session
    const userSession = {
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name,
      phone: data.user.user_metadata?.phone
    };
    
    // Sync user to database
    await syncUserToDatabase(userSession);
    
    req.session.user = userSession;
    
    res.json({ 
      success: true, 
      message: 'Login successful!',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login catch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during login' 
    });
  }
});

// User Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false,
        error: 'Could not log out' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Get user's bids
app.get('/api/bids/my-bids', requireAuth, async (req, res) => {
  try {
    const user_id = req.session.user.id;
    
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

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Hardcoded admin credentials
    const adminUsername = 'BodieEdelbach';
    const adminPassword = 'Trucks4ever!';
    
    if (username === adminUsername && password === adminPassword) {
      // Create admin session
      req.session.admin = {
        username: username,
        loggedIn: true,
        role: 'admin'
      };
      
      res.json({
        success: true,
        message: 'Admin login successful!'
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.admin = null;
  res.json({ 
    success: true, 
    message: 'Admin logged out successfully' 
  });
});

// Get all users with their bids (for admin)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    const usersWithBids = await Promise.all(
      users.map(async (user) => {
        const { data: bids, error: bidsError } = await supabase
          .from('bids')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bidsError) throw bidsError;

        const needsAttention = bids.some(bid => 
          bid.status === 'pending' || 
          bid.status === 'winning' ||
          bid.updated_at > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        return {
          ...user,
          bids: bids || [],
          needs_attention: needsAttention,
          total_bids: bids.length,
          active_bids: bids.filter(b => b.status === 'pending' || b.status === 'winning').length
        };
      })
    );

    res.json({ success: true, users: usersWithBids });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/admin/bids', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*, users (email, full_name, phone)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, bids: data });
  } catch (error) {
    console.error('Admin bids error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.patch('/api/admin/bids/:bid_id', requireAdmin, async (req, res) => {
  try {
    const { bid_id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('bids')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bid_id)
      .select();

    if (error) throw error;
    res.json({ success: true, message: `Bid status updated to ${status}`, bid: data[0] });
  } catch (error) {
    console.error('Update bid status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/place-bid', (req, res) => {
  res.sendFile(path.join(__dirname, 'place-bid.html'));
});

app.get('/my-bids', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-bids.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Serve global language file
app.get('/global-language.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'global-language.js'));
});

// SERVER START
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server started successfully!');
  console.log('🌐 Live at: https://car-brokerage.onrender.com');
});
