
// File: src/app/api/stripe-webhooks/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase'; 
import { collection, doc, updateDoc, serverTimestamp, writeBatch, Timestamp, getDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { Booking, CalendarEvent, CustomerRequest, AppUserProfileContext, ChefProfile } from '@/types';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error("Stripe Secret Key is not defined for webhooks. Please set STRIPE_SECRET_KEY.");
}
if (!webhookSecret) {
  console.error("Stripe Webhook Secret is not defined. Please set STRIPE_WEBHOOK_SECRET.");
}

// Initialize Stripe only if the key is available
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-04-10',
}) : null;

// Helper function to convert to Firestore Timestamp
const ensureTimestamp = (date: any): Timestamp => {
  if (date instanceof Date) return Timestamp.fromDate(date);
  if (date instanceof Timestamp) return date;
  if (date && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') return new Timestamp(date.seconds, date.nanoseconds);
  if (typeof date === 'string' || typeof date === 'number') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) return Timestamp.fromDate(parsedDate);
  }
  console.warn("STRIPE WEBHOOK: ensureTimestamp: Could not convert date, returning current time as fallback:", date);
  return Timestamp.now();
};


export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    const errorMessage = "Stripe configuration is incomplete on the server. STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET might be missing.";
    console.error("STRIPE WEBHOOK ERROR:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  let event: Stripe.Event;

  try {
    const body = await request.text();
    if (!sig) {
      console.error('STRIPE WEBHOOK ERROR: Missing Stripe signature.');
      return NextResponse.json({ error: 'Webhook Error: Missing signature.' }, { status: 400 });
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
      console.log(`STRIPE WEBHOOK: PaymentIntent ${paymentIntentSucceeded.id} was successful! Amount: ${paymentIntentSucceeded.amount_received} ${paymentIntentSucceeded.currency}`);
      
      const requestId = paymentIntentSucceeded.metadata?.requestId;
      const customerIdFromMeta = paymentIntentSucceeded.metadata?.customerId; 
      
      if (!requestId || !customerIdFromMeta) {
        console.error('STRIPE WEBHOOK ERROR: Missing requestId or customerId in PaymentIntent metadata for', paymentIntentSucceeded.id);
        return NextResponse.json({ received: true, error: 'Missing metadata in PaymentIntent' });
      }

      try {
        // Idempotency Check: See if a booking for this paymentIntent already exists.
        const bookingsRef = collection(db, "bookings");
        const qBooking = query(bookingsRef, where("paymentIntentId", "==", paymentIntentSucceeded.id));
        const existingBookingSnap = await getDocs(qBooking);

        if (!existingBookingSnap.empty) {
            console.log(`STRIPE WEBHOOK: Booking already exists for PaymentIntent ${paymentIntentSucceeded.id}. Skipping creation.`);
            return NextResponse.json({ received: true, message: 'Booking already processed.' });
        }

        // Fetch the original CustomerRequest
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
        
        let customerName = "Valued Customer";
        const customerProfileDocRef = doc(db, "users", customerIdFromMeta);
        const customerProfileSnap = await getDoc(customerProfileDocRef);
        if (customerProfileSnap.exists()) {
          customerName = (customerProfileSnap.data() as AppUserProfileContext)?.name || customerName;
        }

        const chefProfileDocRef = doc(db, "users", activeProposal.chefId);
        const chefProfileSnap = await getDoc(chefProfileDocRef);
        let chefStripeAccountId: string | undefined;
        if (chefProfileSnap.exists()) {
          chefStripeAccountId = (chefProfileSnap.data() as ChefProfile)?.stripeAccountId;
        } else {
            console.error(`STRIPE WEBHOOK ERROR: Chef profile ${activeProposal.chefId} not found.`);
            // Decide if this is a critical failure for booking creation
        }
        
        const batch = writeBatch(db);
        const bookingDocRef = doc(collection(db, "bookings")); 

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
            bookingId: bookingDocRef.id,
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
            text: `Payment confirmed for proposal from Chef ${activeProposal.chefName}. Booking ID: ${bookingDocRef.id.substring(0,6)}... Event is confirmed.`,
            timestamp: serverTimestamp()
        });

        await batch.commit();
        console.log(`STRIPE WEBHOOK: Firestore updated: Booking ${bookingDocRef.id} created, CustomerRequest ${requestId} status 'booked'.`);

        // --- YOUR CORE BUSINESS LOGIC: Implement Your Stripe Connect Fund Distribution ---
        // This is where you use the Stripe Node.js SDK to perform the 
        // 46% to chef (immediately), 4% to platform (immediately), and 50% hold (for later release).
        // This requires the chef to have a Stripe Connected Account (chefStripeAccountId).
        if (chefStripeAccountId) {
          const totalAmountReceived = paymentIntentSucceeded.amount_received; 
          const currency = paymentIntentSucceeded.currency;
          const chefShareAmount = Math.round(totalAmountReceived * 0.46);
          // const platformFeeAmount = Math.round(totalAmountReceived * 0.04);
          // const amountToHold = totalAmountReceived - chefShareAmount - platformFeeAmount;
          
          console.log(`STRIPE WEBHOOK: Chef Stripe Account ID for payout: ${chefStripeAccountId}`);
          console.log(`STRIPE WEBHOOK: Total amount received: ${totalAmountReceived} ${currency.toUpperCase()}`);
          console.log(`STRIPE WEBHOOK: Calculated chef share: ${chefShareAmount} ${currency.toUpperCase()}`);

          // TODO: Replace with actual Stripe API calls for transfers/payouts.
          // Example (conceptual - adapt to your Stripe Connect model):
          // try {
          //   const transferToChef = await stripe.transfers.create({
          //     amount: chefShareAmount,
          //     currency: currency,
          //     destination: chefStripeAccountId,
          //     transfer_group: paymentIntentSucceeded.id,
          //     description: `Initial 46% payout for booking ${bookingDocRef.id}`,
          //     metadata: { bookingId: bookingDocRef.id, requestId: requestId, payout_type: 'initial_46_percent' }
          //   });
          //   console.log(`STRIPE WEBHOOK: Successfully created Stripe transfer ${transferToChef.id} to chef ${chefStripeAccountId}.`);
          //   // The platform fee (4%) might be handled via application_fee_amount on the PaymentIntent,
          //   // or as a separate transfer if using Separate Charges and Transfers.
          //   // The remaining ~50% is implicitly held on your platform's Stripe balance for later release.
          // } catch (stripeError: any) {
          //   console.error(`STRIPE WEBHOOK: Stripe Connect fund distribution error for PI ${paymentIntentSucceeded.id}:`, stripeError.message);
          //   // Log this critical error. You might need manual intervention or a retry mechanism.
          //   // Decide if this should prevent the 200 OK. Usually, if DB writes are done, you send 200 OK
          //   // and handle payout issues separately to avoid Stripe resending the same webhook.
          // }
          console.warn("STRIPE WEBHOOK: Skipping actual Stripe Connect fund distribution - IMPLEMENTATION NEEDED.");

        } else {
          console.warn(`STRIPE WEBHOOK: Chef ${activeProposal.chefId} does not have a Stripe Account ID. Initial 46% payout for PI ${paymentIntentSucceeded.id} cannot be processed automatically. Booking ${bookingDocRef.id} created without payout attempt.`);
          // Implement alerting for admin to handle this manually.
        }
        // --- END OF YOUR STRIPE CONNECT LOGIC ---

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
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
                await updateDoc(reqRef, { status: 'payment_failed', updatedAt: serverTimestamp() });
                
                const messagesCollectionRef = collection(reqRef, "messages");
                await addDoc(messagesCollectionRef, {
                    requestId: failedRequestId,
                    senderId: 'system',
                    senderRole: 'system',
                    text: `Payment attempt failed for the proposal from Chef ${paymentIntentFailed.metadata?.chefName || (reqSnap.data().activeProposal?.chefName || 'the chef') }. Please try again or contact support.`,
                    timestamp: serverTimestamp()
                });
                console.log(`STRIPE WEBHOOK: CustomerRequest ${failedRequestId} updated to 'payment_failed'.`);
            } else {
                console.warn(`STRIPE WEBHOOK: CustomerRequest ${failedRequestId} not found for failed payment PI ${paymentIntentFailed.id}.`);
            }
          } catch (dbError: any) {
             console.error(`STRIPE WEBHOOK DB ERROR: Failed to update CustomerRequest status for payment_intent.payment_failed PI ${paymentIntentFailed.id}:`, dbError);
          }
      }
      break;

    default:
      console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

