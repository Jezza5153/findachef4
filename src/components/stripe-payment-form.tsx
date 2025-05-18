
// File: src/components/stripe-payment-form.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CardElement, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';
import type { StripePaymentElementOptions } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  customerName: string;
  customerEmail: string;
  totalPrice: number;
  onPaymentAttemptComplete: (result: { success: boolean; paymentIntentId?: string; error?: string }) => void;
  isProcessingPayment: boolean;
  setIsProcessingPayment: (isProcessing: boolean) => void;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ 
  customerName,
  customerEmail,
  totalPrice, 
  onPaymentAttemptComplete, 
  isProcessingPayment, 
  setIsProcessingPayment 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsProcessingPayment(true);

    if (!stripe || !elements) {
      onPaymentAttemptComplete({ success: false, error: "Stripe.js has not loaded yet." });
      setIsProcessingPayment(false);
      return;
    }

    // const cardElement = elements.getElement(CardElement); // Using PaymentElement instead
    // if (!cardElement) {
    //   onPaymentAttemptComplete({ success: false, error: "Card element not found." });
    //   setIsProcessingPayment(false);
    //   return;
    // }
    
    toast({ title: "Processing Payment...", description: "Contacting payment gateway. Please wait." });

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            amount: Math.round(totalPrice * 100), 
            currency: 'aud',
            customerName: customerName,
            customerEmail: customerEmail,
        }),
      });

      const paymentIntentData = await response.json();

      if (response.status !== 200 || !paymentIntentData.clientSecret) {
        throw new Error(paymentIntentData.error || 'Failed to create payment intent.');
      }

      const { error, paymentIntent } = await stripe.confirmPayment({ // Using confirmPayment with PaymentElement
        elements,
        clientSecret: paymentIntentData.clientSecret,
        confirmParams: {
          // return_url is not strictly needed if handling client-side, but good for some flows
          return_url: `${window.location.origin}/customer/dashboard/messages?payment_confirmed=true`, // Example return URL
          payment_method_data: {
            billing_details: {
              name: customerName,
              email: customerEmail,
            },
          },
        },
        redirect: 'if_required' // Handle redirect manually if needed for 3D Secure
      });
      

      if (error) {
        // This point will only be reached if there is an immediate error when confirming the payment.
        // Otherwise, the customer will be redirected to the `return_url`.
        console.error("Stripe confirmPayment error:", error);
        throw new Error(error.message || 'Payment failed or requires further action.');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentAttemptComplete({ success: true, paymentIntentId: paymentIntent.id });
      } else if (paymentIntent && (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation')) {
        // This case is less likely if redirect: 'if_required' handles 3DS.
        // If redirect is not handled, you might need to prompt user for further action.
        console.log("Payment requires further action:", paymentIntent.status);
        toast({ title: "Further Action Required", description: "Your bank requires additional authentication.", variant: "default" });
        // Potentially, you could redirect to paymentIntent.next_action.redirect_to_url.url
        // Or let Stripe.js handle it if `redirect: 'always'` or the default behavior of `confirmPayment` handles it.
        // For client-side only handling without page redirects (if_required):
        onPaymentAttemptComplete({ success: false, error: "Payment requires further action from your bank." });
      } else {
        throw new Error(paymentIntent?.status ? `Payment status: ${paymentIntent.status}` : 'Payment not successful.');
      }
    } catch (err: any) {
      console.error("Payment processing error:", err);
      onPaymentAttemptComplete({ success: false, error: err.message || "An unexpected error occurred during payment." });
      // setIsProcessingPayment(false); // This should be set in the parent based on result
    }
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs" // "tabs" or "accordion" or "auto"
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="my-4 p-3 border rounded-md bg-background">
        <PaymentElement options={paymentElementOptions} />
      </div>
      <Button type="submit" disabled={!stripe || !elements || isProcessingPayment} className="w-full">
        { isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" /> }
        {isProcessingPayment ? "Processing..." : `Pay AUD ${(totalPrice).toFixed(2)}`}
      </Button>
    </form>
  );
};

export default StripePaymentForm;

    