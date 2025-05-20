
// File: src/app/api/stripe-webhooks/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase'; // Assuming firebase-admin is NOT configured here. This needs to be admin SDK for server-side.
import { collection, doc, updateDoc, serverTimestamp, writeBatch, Timestamp, getDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { Booking, CalendarEvent, CustomerRequest, AppUserProfileContext, ChefProfile } from '@/types';

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
  console.warn("STRIPE WEBHOOK: ensureTimestamp: Could not convert date, returning current time as fallback:", date);
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
      console.log(`STRIPE WEBHOOK: PaymentIntent ${paymentIntentSucceeded.id} was successful! Amount: ${paymentIntentSucceeded.amount_received} ${paymentIntentSucceeded.currency}`);
      
      const requestId = paymentIntentSucceeded.metadata?.requestId;
      const customerIdFromMeta = paymentIntentSucceeded.metadata?.customerId; 
      
      if (!requestId || !customerIdFromMeta) {
        console.error('STRIPE WEBHOOK ERROR: Missing requestId or customerId in PaymentIntent metadata for', paymentIntentSucceeded.id);
        // Still return 200 to Stripe to acknowledge receipt, but log the error.
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
        
        // Fetch customer's name for the booking
        let customerName = "Valued Customer";
        const customerProfileDocRef = doc(db, "users", customerIdFromMeta);
        const customerProfileSnap = await getDoc(customerProfileDocRef);
        if (customerProfileSnap.exists()) {
          customerName = (customerProfileSnap.data() as AppUserProfileContext)?.name || customerName;
        }

        // Fetch chef's Stripe Account ID (You need to store this when they onboard with Stripe Connect)
        const chefProfileDocRef = doc(db, "users", activeProposal.chefId);
        const chefProfileSnap = await getDoc(chefProfileDocRef);
        let chefStripeAccountId: string | undefined;
        if (chefProfileSnap.exists()) {
          chefStripeAccountId = (chefProfileSnap.data() as ChefProfile)?.stripeAccountId;
        }

        if (!chefStripeAccountId) {
            console.error(`STRIPE WEBHOOK ERROR: Chef ${activeProposal.chefId} does not have a Stripe Account ID set up. Cannot process payouts.`);
            // Depending on policy, you might still create the booking but flag it for admin review regarding payout.
            // Or, if payout is critical for booking confirmation, this could be an error state.
            // For now, we'll log and proceed with booking creation, but payouts would fail.
        }


        // --- Perform Firestore updates in a batch for atomicity ---
        const batch = writeBatch(db);
        const bookingDocRef = doc(collection(db, "bookings")); // Generate new Booking ID

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
          const totalAmountReceived = paymentIntentSucceeded.amount_received; // Amount in cents
          const currency = paymentIntentSucceeded.currency;

          const chefShareAmount = Math.round(totalAmountReceived * 0.46);
          // The platform fee (4%) can often be taken as an `application_fee_amount`
          // when creating the PaymentIntent OR by a separate transfer.
          // For simplicity here, let's assume the platform fee is handled.
          // The crucial part is the immediate transfer to the chef.

          try {
            // Example: Create a transfer to the chef's connected account for their initial 46%
            // This depends on your Stripe Connect setup (Direct Charges, Destination Charges, or Separate Charges and Transfers).
            // If using Separate Charges and Transfers (most common for platforms):
            const transferToChef = await stripe.transfers.create({
              amount: chefShareAmount,
              currency: currency,
              destination: chefStripeAccountId,
              transfer_group: paymentIntentSucceeded.id, // Group transfers related to this payment
              description: `Payout for booking ${bookingDocRef.id} (initial 46%)`,
              metadata: {
                bookingId: bookingDocRef.id,
                requestId: requestId,
                payout_type: 'initial_46_percent'
              }
            });
            console.log(`STRIPE WEBHOOK: Successfully created transfer ${transferToChef.id} of ${chefShareAmount} ${currency.toUpperCase()} to chef ${chefStripeAccountId}.`);
            
            // The remaining ~50% is implicitly held on your platform's Stripe balance.
            // You will need another backend process (triggered by QR code scan confirmation)
            // to create a second transfer for this remaining amount.
            // Store bookingDocRef.id and the remaining amount to be paid out later.

          } catch (stripeError: any) {
            console.error(`STRIPE WEBHOOK: Stripe Connect fund distribution error for PI ${paymentIntentSucceeded.id}:`, stripeError.message);
            // Log this critical error. You might need manual intervention or a retry mechanism.
            // Decide if this should prevent the 200 OK. Usually, if DB writes are done, you send 200 OK
            // and handle payout issues separately to avoid Stripe resending the same webhook.
          }
        } else {
          console.warn(`STRIPE WEBHOOK: Chef ${activeProposal.chefId} does not have a Stripe Account ID. Initial 46% payout for PI ${paymentIntentSucceeded.id} cannot be processed automatically.`);
          // Implement alerting for admin to handle this manually.
        }
        // --- END OF YOUR STRIPE CONNECT LOGIC ---

      } catch (dbError: any) {
        console.error('STRIPE WEBHOOK DB ERROR: Failed to process payment_intent.succeeded for PI:', paymentIntentSucceeded.id, dbError);
        // If DB operations fail, it's safer to return 500 to Stripe so it retries.
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
            // Check if the request exists before trying to update
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
                await updateDoc(reqRef, { status: 'payment_failed', updatedAt: serverTimestamp() });
                
                const messagesCollectionRef = collection(reqRef, "messages");
                await addDoc(messagesCollectionRef, {
                    requestId: failedRequestId,
                    senderId: 'system',
                    senderRole: 'system',
                    text: `Payment attempt failed for the proposal from Chef ${paymentIntentFailed.metadata?.chefName || 'the chef'}. Please try again or contact support.`,
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
      // TODO: Notify the customer via other means if necessary.
      break;

    // TODO: Handle other event types as needed:
    // - 'charge.dispute.created': Freeze payouts for the chef, investigate.
    // - 'transfer.paid', 'payout.paid': Log successful payouts.
    // - 'transfer.failed', 'payout.failed': Alert admin.
    // - Events related to Stripe Connect account updates for chefs.

    default:
      console.log(`STRIPE WEBHOOK: Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
