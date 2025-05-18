
// File: src/components/stripe-payment-form.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';
import type { StripePaymentElementOptions } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  onPaymentAttemptComplete: (result: { success: boolean; paymentIntentId?: string; error?: string }) => void;
  isProcessingPayment: boolean;
  setIsProcessingPayment: (isProcessing: boolean) => void;
  requestId: string; // Added for metadata
  customerId: string; // Added for metadata
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ 
  customerName,
  customerEmail,
  totalPrice, 
  onPaymentAttemptComplete, 
  isProcessingPayment, 
  setIsProcessingPayment,
  requestId,
  customerId
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      toast({ title: "Stripe Error", description: "Stripe.js has not loaded yet.", variant: "destructive" });
      onPaymentAttemptComplete({ success: false, error: "Stripe.js has not loaded yet." });
      return;
    }
    
    setIsProcessingPayment(true);
    toast({ title: "Processing Payment...", description: "Contacting payment gateway. Please wait." });

    try {
      // 1. Create PaymentIntent on your backend
      const paymentIntentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            amount: Math.round(totalPrice * 100), 
            currency: 'aud',
            // Pass requestId and customerId for metadata to be used in webhooks
            metadata: { 
              requestId: requestId,
              customerId: customerId 
            }
        }),
      });

      const paymentIntentData = await paymentIntentResponse.json();

      if (!paymentIntentResponse.ok || !paymentIntentData.clientSecret) {
        console.error("Failed to create payment intent:", paymentIntentData);
        throw new Error(paymentIntentData.error || 'Failed to create payment intent.');
      }
      
      // 2. Confirm the payment on the client side using PaymentElement
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements, // elements instance from useElements()
        clientSecret: paymentIntentData.clientSecret,
        confirmParams: {
          // Ensure return_url is absolute and correct for your deployed app
          return_url: `${window.location.origin}/customer/dashboard/messages?payment_status=complete&request_id=${requestId}`,
          payment_method_data: { // Optional: prefill billing details if not using Link Authentication Element
            billing_details: {
              name: customerName,
              email: customerEmail,
            },
          },
        },
        redirect: 'if_required', 
      });

      if (error) {
        console.error("Stripe confirmPayment error:", error);
        toast({ title: "Payment Failed", description: error.message || "An error occurred during payment.", variant: "destructive" });
        onPaymentAttemptComplete({ success: false, error: error.message });
        // setIsProcessingPayment(false); // Handled by parent or error state
        return; // Important to return after handling the error
      }

      // If redirect: 'if_required' and a redirect happens, this code path might not be hit immediately.
      // The user is redirected, and then upon return, the status of the PaymentIntent should be checked.
      // For non-redirect scenarios:
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({ title: "Payment Successful!", description: "Your payment has been processed." });
        onPaymentAttemptComplete({ success: true, paymentIntentId: paymentIntent.id });
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        toast({ title: "Action Required", description: "Further action is needed to complete your payment.", variant: "default" });
        onPaymentAttemptComplete({ success: false, error: "Payment requires further action." });
      } else if (paymentIntent) { // Other statuses like 'processing'
        toast({ title: "Payment Processing", description: `Payment status: ${paymentIntent.status}. We'll notify you.`, variant: "default" });
        onPaymentAttemptComplete({ success: false, error: `Payment status: ${paymentIntent.status}` }); // Or treat as pending
      } else {
        // This case should ideally not be reached if there was no error but no paymentIntent
        toast({ title: "Payment Incomplete", description: "Payment was not completed successfully.", variant: "destructive" });
        onPaymentAttemptComplete({ success: false, error: "Payment was not completed successfully." });
      }

    } catch (err: any) {
      console.error("Payment submission error:", err);
      toast({ title: "Payment Error", description: err.message || "An unexpected error occurred.", variant: "destructive" });
      onPaymentAttemptComplete({ success: false, error: err.message || "An unexpected error occurred during payment." });
    } finally {
      // setIsProcessingPayment(false) is generally managed by the parent component
      // based on the outcome of onPaymentAttemptComplete to avoid race conditions with dialog closing.
    }
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs", 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md bg-background shadow-sm">
         {/* Using PaymentElement for more comprehensive payment method support */}
        <PaymentElement id="payment-element" options={paymentElementOptions} />
      </div>
      <Button type="submit" disabled={!stripe || !elements || isProcessingPayment} className="w-full">
        { isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" /> }
        {isProcessingPayment ? "Processing..." : `Confirm & Pay AUD ${(totalPrice).toFixed(2)}`}
      </Button>
    </form>
  );
};

export default StripePaymentForm;
