import os
import stripe
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User, Bid
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///bids.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Stripe configuration
stripe.api_key = 'your-stripe-secret-key'  # Change this to your Stripe secret key

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('my_bids'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        name = request.form['name']
        
        if User.query.filter_by(email=email).first():
            return "User already exists"
            
        user = User(
            email=email,
            password=generate_password_hash(password),
            name=name
        )
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for('my_bids'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/place-bid')
@login_required
def place_bid():
    return render_template('place-bid.html')

@app.route('/my-bids')
@login_required
def my_bids():
    bids = Bid.query.filter_by(user_id=current_user.id).order_by(Bid.created_at.desc()).all()
    return render_template('my-bids.html', bids=bids)

@app.route('/create-payment-intent', methods=['POST'])
@login_required
def create_payment_intent():
    try:
        data = request.json
        lot_number = data['lot_number']
        max_bid = float(data['max_bid'])
        
        # Calculate amounts
        deposit_amount = max_bid * 0.1 if max_bid > 2500 else 0
        service_fee = 215
        total_amount = deposit_amount + service_fee
        
        # Create bid record
        bid = Bid(
            user_id=current_user.id,
            lot_number=lot_number,
            max_bid=max_bid,
            deposit_amount=deposit_amount,
            service_fee=service_fee
        )
        db.session.add(bid)
        db.session.commit()
        
        # Create Stripe Payment Intent
        intent = stripe.PaymentIntent.create(
            amount=int(total_amount * 100),  # Convert to cents
            currency='usd',
            metadata={
                'bid_id': bid.id,
                'user_id': current_user.id,
                'lot_number': lot_number,
                'type': 'bid_payment'
            },
            automatic_payment_methods={
                'enabled': True,
            },
        )
        
        # Update bid with payment intent ID
        bid.payment_intent_id = intent.id
        db.session.commit()
        
        return jsonify({
            'clientSecret': intent.client_secret,
            'bidId': bid.id
        })
        
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, 'your-webhook-signing-secret'  # Change this
        )
    except ValueError as e:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        return 'Invalid signature', 400

    # Handle payment success
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        bid_id = payment_intent['metadata']['bid_id']
        
        # Update bid status
        bid = Bid.query.get(bid_id)
        if bid:
            bid.status = 'pending'  # Ready for you to place on Copart
            db.session.commit()

    return jsonify({'success': True})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
