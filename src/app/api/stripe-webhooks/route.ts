
// File: src/app/api/stripe-webhooks/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase'; // Assuming firebase-admin is NOT configured here. This needs to be admin SDK for server-side.
import { collection, doc, updateDoc, serverTimestamp, writeBatch, Timestamp, getDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { Booking, CalendarEvent, CustomerRequest, AppUserProfileContext } from '@/types';

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
    const body = await request.text(); // Read body as text for constructEvent
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
      
      // Extract metadata
      const requestId = paymentIntentSucceeded.metadata?.requestId;
      const customerIdFromMeta = paymentIntentSucceeded.metadata?.customerId; 
      
      if (!requestId || !customerIdFromMeta) {
        console.error('STRIPE WEBHOOK ERROR: Missing requestId or customerId in PaymentIntent metadata for', paymentIntentSucceeded.id);
        return NextResponse.json({ received: true, error: 'Missing metadata in PaymentIntent' });
      }

      try {
        // Check if booking already exists for this paymentIntent to prevent duplicates
        const bookingsRef = collection(db, "bookings");
        const qBooking = query(bookingsRef, where("paymentIntentId", "==", paymentIntentSucceeded.id));
        const existingBookingSnap = await getDocs(qBooking);

        if (!existingBookingSnap.empty) {
            console.log(`STRIPE WEBHOOK: Booking already exists for PaymentIntent ${paymentIntentSucceeded.id}. Skipping creation.`);
            return NextResponse.json({ received: true, message: 'Booking already processed.' });
        }


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

        const batch = writeBatch(db);
        const bookingDocRef = doc(collection(db, "bookings")); // Generate new Booking ID

        let customerName = "Valued Customer";
        const customerProfileDocRef = doc(db, "users", customerIdFromMeta);
        const customerProfileSnap = await getDoc(customerProfileDocRef);
        if (customerProfileSnap.exists()) {
          customerName = (customerProfileSnap.data() as AppUserProfileContext)?.name || customerName;
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
            status: 'confirmed', // Booking is confirmed upon successful payment
            menuTitle: activeProposal.menuTitle,
            location: customerRequestData.location || undefined,
            requestId: requestId,
            paymentIntentId: paymentIntentSucceeded.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        batch.set(bookingDocRef, newBookingData);

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
            isWallEvent: false, 
        };
        const chefCalendarEventDocRef = doc(db, `users/${activeProposal.chefId}/calendarEvents`, bookingDocRef.id);
        batch.set(chefCalendarEventDocRef, { ...calendarEventData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

        batch.update(requestDocRef, { status: 'booked', updatedAt: serverTimestamp() });
        
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
        console.log(`STRIPE WEBHOOK: Booking ${bookingDocRef.id} created and CustomerRequest ${requestId} updated to 'booked'.`);

        // TODO: Implement actual fund distribution logic with Stripe Connect:
        // This is where your backend would interact with Stripe Connect to:
        // 1. Transfer 46% to the chef's connected account immediately.
        // 2. Transfer 4% to your platform's Stripe account immediately.
        // 3. Hold the remaining 50% (e.g., in your platform's balance or using Stripe's escrow/holding features if applicable)
        //    for later release upon event completion.
        // This requires chefs to be onboarded as Stripe Connect accounts.
        console.log('STRIPE WEBHOOK: Placeholder for fund distribution logic (46% chef, 4% platform, 50% held). This needs Stripe Connect setup.');

      } catch (dbError: any) {
        console.error('STRIPE WEBHOOK DB ERROR: Failed to process payment_intent.succeeded for PI:', paymentIntentSucceeded.id, dbError);
        return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
      }
      break;
    
    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object as Stripe.PaymentIntent;
      console.log(`STRIPE WEBHOOK: PaymentIntent ${paymentIntentFailed.id} failed.`);
      const failedRequestId = paymentIntentFailed.metadata?.requestId;
      if (failedRequestId) {
          try {
            const reqRef = doc(db, 'customerRequests', failedRequestId);
            await updateDoc(reqRef, { status: 'payment_failed', updatedAt: serverTimestamp() });
            
            // Add a system message to the customer request chat
            const messagesCollectionRef = collection(reqRef, "messages");
            await addDoc(messagesCollectionRef, {
                requestId: failedRequestId,
                senderId: 'system',
                senderRole: 'system',
                text: `Payment attempt failed for the proposal from Chef ${paymentIntentFailed.metadata?.chefName || 'the chef'}. Please try again or contact support.`,
                timestamp: serverTimestamp()
            });
            console.log(`STRIPE WEBHOOK: CustomerRequest ${failedRequestId} updated to 'payment_failed'.`);
          } catch (dbError: any) {
             console.error('STRIPE WEBHOOK DB ERROR: Failed to update CustomerRequest status for payment_intent.payment_failed:', paymentIntentFailed.id, dbError);
          }
      }
      // TODO: Notify the customer via other means if necessary.
      break;

    // ... handle other event types as needed (e.g., disputes, refunds, payout updates for the 50% release)

    default:
      console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
