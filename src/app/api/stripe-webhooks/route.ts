
// File: src/app/api/stripe-webhooks/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase'; // Assuming firebase-admin is NOT configured here. This needs to be admin SDK.
import { collection, doc, updateDoc, serverTimestamp, writeBatch, Timestamp, getDoc, addDoc } from 'firebase/firestore';
import type { Booking, CalendarEvent, CustomerRequest } from '@/types';

// Initialize Stripe with your SECRET key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to convert to Firestore Timestamp if it's a Date object
const ensureTimestamp = (date: any): Timestamp => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  if (date instanceof Timestamp) {
    return date;
  }
  // Fallback for string or number representation (less ideal)
  if (typeof date === 'string' || typeof date === 'number') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return Timestamp.fromDate(parsedDate);
    }
  }
  // If all else fails, or if it's already a Firestore-like object with seconds/nanos
  if (date && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Timestamp(date.seconds, date.nanoseconds);
  }
  console.warn("ensureTimestamp: Could not convert date, returning current time as fallback:", date);
  return Timestamp.now(); // Fallback, consider error handling
};


export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  let event: Stripe.Event;

  try {
    const body = await request.text();
    if (!sig || !webhookSecret) {
      console.error('STRIPE WEBHOOK ERROR: Missing Stripe signature or webhook secret.');
      return NextResponse.json({ error: 'Webhook Error: Missing signature or secret.' }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log('STRIPE WEBHOOK: Received event:', event.type, event.id);

  } catch (err: any) {
    console.error(`STRIPE WEBHOOK ERROR: Error constructing event: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
      console.log(`STRIPE WEBHOOK: PaymentIntent ${paymentIntentSucceeded.id} was successful!`);
      
      // Extract metadata (e.g., requestId)
      const requestId = paymentIntentSucceeded.metadata?.requestId;
      const customerId = paymentIntentSucceeded.metadata?.customerId; // Assuming you pass this too
      
      if (!requestId || !customerId) {
        console.error('STRIPE WEBHOOK ERROR: Missing requestId or customerId in PaymentIntent metadata for', paymentIntentSucceeded.id);
        // Still return 200 to Stripe to acknowledge receipt, but log critical error
        return NextResponse.json({ received: true, error: 'Missing metadata in PaymentIntent' });
      }

      try {
        const requestDocRef = doc(db, 'customerRequests', requestId);
        const requestSnap = await getDoc(requestDocRef);

        if (!requestSnap.exists()) {
          console.error('STRIPE WEBHOOK ERROR: CustomerRequest not found for requestId:', requestId);
          return NextResponse.json({ received: true, error: 'CustomerRequest not found' });
        }
        
        const customerRequestData = requestSnap.data() as CustomerRequest;
        const activeProposal = customerRequestData.activeProposal;

        if (!activeProposal || !activeProposal.chefId) {
          console.error('STRIPE WEBHOOK ERROR: No active proposal or chefId found for CustomerRequest:', requestId);
          return NextResponse.json({ received: true, error: 'No active proposal on request' });
        }

        // Check if booking already exists for this paymentIntent to prevent duplicates
        // This requires querying the bookings collection. For now, we assume it's a new booking if this webhook fires.
        // Consider adding a unique constraint or check if your app logic allows multiple bookings from one request.

        const batch = writeBatch(db);
        const bookingDocRef = doc(collection(db, "bookings")); // Generate new Booking ID

        // Fetch customer profile for name (optional, but good for denormalization)
        let customerName = "Valued Customer";
        const customerProfileDocRef = doc(db, "users", customerId);
        const customerProfileSnap = await getDoc(customerProfileDocRef);
        if (customerProfileSnap.exists()) {
          customerName = customerProfileSnap.data()?.name || customerName;
        }
        
        const newBookingData: Omit<Booking, 'id'> = {
            customerId: customerRequestData.customerId,
            customerName: customerName,
            chefId: activeProposal.chefId,
            chefName: activeProposal.chefName,
            chefAvatarUrl: activeProposal.chefAvatarUrl || undefined,
            eventTitle: activeProposal.menuTitle || customerRequestData.eventType || "Booked Event",
            eventDate: ensureTimestamp(customerRequestData.eventDate),
            pax: customerRequestData.pax,
            totalPrice: activeProposal.menuPricePerHead * customerRequestData.pax,
            pricePerHead: activeProposal.menuPricePerHead,
            status: 'confirmed',
            menuTitle: activeProposal.menuTitle,
            location: customerRequestData.location || undefined,
            requestId: requestId,
            paymentIntentId: paymentIntentSucceeded.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        batch.set(bookingDocRef, newBookingData);

        // Create Chef's CalendarEvent
        const calendarEventData: Omit<CalendarEvent, 'id'|'createdAt'|'updatedAt'> = {
            chefId: activeProposal.chefId,
            date: ensureTimestamp(customerRequestData.eventDate),
            title: `Booking: ${newBookingData.eventTitle}`,
            customerName: newBookingData.customerName,
            pax: newBookingData.pax,
            menuName: newBookingData.menuTitle || 'Custom Event',
            pricePerHead: newBookingData.pricePerHead || 0,
            location: newBookingData.location,
            notes: `Booking for request ${requestId}. Booking ID: ${bookingDocRef.id}`,
            status: 'Confirmed',
            isWallEvent: false, // This booking originated from a CustomerRequest
        };
        const chefCalendarEventDocRef = doc(db, `users/${activeProposal.chefId}/calendarEvents`, bookingDocRef.id);
        batch.set(chefCalendarEventDocRef, { ...calendarEventData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

        // Update CustomerRequest status to 'booked'
        batch.update(requestDocRef, { status: 'booked', updatedAt: serverTimestamp() });
        
        // Add a system message to the customer request chat
        const messagesCollectionRef = collection(requestDocRef, "messages");
        const systemMessageRef = doc(messagesCollectionRef);
        batch.set(systemMessageRef, {
            requestId: requestId,
            senderId: 'system',
            senderRole: 'system',
            text: `Payment confirmed for proposal from Chef ${activeProposal.chefName}. Booking ID: ${bookingDocRef.id.substring(0,6)}... Your event is now confirmed.`,
            timestamp: serverTimestamp()
        });

        await batch.commit();
        console.log(`STRIPE WEBHOOK: Booking ${bookingDocRef.id} created and CustomerRequest ${requestId} updated.`);

        // TODO: Implement actual fund distribution logic with Stripe Connect:
        // This is where your backend would interact with Stripe Connect to:
        // 1. Transfer 46% to the chef's connected account immediately.
        // 2. Transfer 4% to your platform's Stripe account immediately.
        // 3. Hold the remaining 50% (e.g., in your platform's balance or using Stripe's escrow/holding features if applicable)
        //    for later release upon event completion.
        // This requires chefs to be onboarded as Stripe Connect accounts.
        console.log('STRIPE WEBHOOK: Placeholder for fund distribution logic (46% chef, 4% platform, 50% held).');

      } catch (dbError: any) {
        console.error('STRIPE WEBHOOK DB ERROR: Failed to process payment_intent.succeeded for PI:', paymentIntentSucceeded.id, dbError);
        // If DB update fails, this is a critical issue. Stripe will retry the webhook.
        // You might need to return a 5xx error to Stripe to indicate failure and trigger retry,
        // or handle idempotency carefully if you return 200 but fail internally.
        return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
      }
      break;
    
    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
      console.log(`STRIPE WEBHOOK: PaymentIntent ${paymentIntentFailed.id} failed.`);
      // TODO:
      // 1. Notify the customer.
      // 2. Update internal booking/request status in Firestore (e.g., to 'payment_failed').
      //    const failedRequestId = paymentIntentFailed.metadata?.requestId;
      //    if (failedRequestId) {
      //        const reqRef = doc(db, 'customerRequests', failedRequestId);
      //        await updateDoc(reqRef, { status: 'payment_failed', updatedAt: serverTimestamp() });
      //    }
      break;

    // ... handle other event types as needed (e.g., disputes, refunds, payout updates for the 50% release)

    default:
      console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
