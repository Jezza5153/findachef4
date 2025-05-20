
// File: src/app/api/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Ensure your Stripe secret key is set as an environment variable
// For local development, this will be in your .env.local file
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Initialize Stripe only if the key is available
let stripe: Stripe | null = null;
if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-04-10', // Use the latest API version
  });
}

export async function POST(request: Request) {
  // Move the check inside the POST function
  if (!stripeSecretKey || !stripe) {
    console.error("Stripe Secret Key is not defined. Please set STRIPE_SECRET_KEY in your environment variables.");
    return NextResponse.json({ error: 'Stripe is not configured on the server. STRIPE_SECRET_KEY might be missing.' }, { status: 500 });
  }
  try {
    const { amount, currency = 'aud', requestId, customerId } = await request.json(); // Expect amount in cents

    if (!amount || amount < 50) { // Stripe has minimum charge amounts (e.g., $0.50 AUD)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { 
        requestId: requestId,
        customerId: customerId 
      }
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error('Error creating PaymentIntent:', error);
    return NextResponse.json({ error: error.message || "Failed to create payment intent." }, { status: 500 });
  }
}
