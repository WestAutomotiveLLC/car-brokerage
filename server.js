const express = require('express');
const session = require('express-session');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.FLASK_SECRET_KEY || 'car-brokerage-west-auto-2024-secret-123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/place-bid', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'place-bid.html'));
});

app.get('/my-bids', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'my-bids.html'));
});

app.get('/admin', requireAuth, (req, res) => {
  if (req.session.user.email !== 'admin@westauto.com') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Auth routes
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      req.session.user = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata.first_name,
        lastName: data.user.user_metadata.last_name
      };
      
      res.json({ 
        success: true, 
        message: 'Registration successful!',
        user: req.session.user
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data.user) {
      req.session.user = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.first_name || 'User',
        lastName: data.user.user_metadata?.last_name || ''
      };
      
      res.json({ 
        success: true, 
        message: 'Login successful!',
        user: req.session.user
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Bid routes
app.post('/api/bids', requireAuth, async (req, res) => {
  try {
    const { vehicle, bid_amount, comments } = req.body;
    
    const { data, error } = await supabase
      .from('bids')
      .insert([
        {
          user_id: req.session.user.id,
          vehicle: vehicle,
          bid_amount: parseFloat(bid_amount),
          comments: comments,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Bid placed successfully!',
      bid: data[0]
    });
  } catch (error) {
    console.error('Bid creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to place bid: ' + error.message 
    });
  }
});

app.get('/api/bids', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .eq('user_id', req.session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ bids: data || [] });
  } catch (error) {
    console.error('Bids fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

app.get('/api/all-bids', requireAuth, async (req, res) => {
  try {
    if (req.session.user.email !== 'admin@westauto.com') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        profiles (email, first_name, last_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ bids: data || [] });
  } catch (error) {
    console.error('All bids fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Payment routes
app.post('/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { amount, bidId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        bid_id: bidId,
        user_id: req.session.user.id
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/update-bid-status', requireAuth, async (req, res) => {
  try {
    const { bidId, status } = req.body;
    
    const { data, error } = await supabase
      .from('bids')
      .update({ status: status })
      .eq('id', bidId)
      .select();

    if (error) throw error;

    res.json({ 
      success: true, 
      message: `Bid ${status} successfully`,
      bid: data[0]
    });
  } catch (error) {
    console.error('Bid status update error:', error);
    res.status(500).json({ error: 'Failed to update bid status' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    session: !!req.session.user 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Live: https://car-brokerage.onrender.com`);
});
