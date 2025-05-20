
// File: src/app/api/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Ensure your Stripe secret key is set as an environment variable
// For local development, this will be in your .env.local file
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10', // Use the latest API version
});

export async function POST(request: Request) {
  try {
    const { amount, currency = 'aud' } = await request.json(); // Expect amount in cents, e.g., 5000 for $50.00 AUD

    if (!amount || amount < 50) { // Stripe has minimum charge amounts (e.g., $0.50 AUD)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      // You can add metadata here if needed, e.g.,
      // metadata: { bookingId: 'YOUR_INTERNAL_BOOKING_ID' }
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error('Error creating PaymentIntent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}