// routes/payment.js
const express = require('express');
const router = express.Router();
const stripe = require('../config/stripe');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

// Create Checkout Session
router.post('/create-checkout-session', authenticate, async (req, res) => {
  const domain = process.env.FRONTEND_DOMAIN;
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cancel`
    });
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: 'Error creating checkout session' });
  }
});

// Webhook for Subscription Events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const user = await User.findOne({ email: customer.email });
      if (user) {
        user.subscription = 'pro';
        await user.save();
      }
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;