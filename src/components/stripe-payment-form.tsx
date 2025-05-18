
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
            amount: Math.round(totalPrice * 100), // Amount in cents
            currency: 'aud', // Or your desired currency
            // You might want to pass customerName, customerEmail, or bookingId as metadata here
        }),
      });

      const paymentIntentData = await paymentIntentResponse.json();

      if (!paymentIntentResponse.ok || !paymentIntentData.clientSecret) {
        throw new Error(paymentIntentData.error || 'Failed to create payment intent.');
      }
      
      // 2. Confirm the payment on the client side
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: paymentIntentData.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/customer/dashboard/messages?payment_status=complete&request_id=${elements?.getElement('payment')?.id || 'unknown'}`, // A placeholder URL, Stripe might handle redirect
          payment_method_data: {
            billing_details: {
              name: customerName,
              email: customerEmail,
            },
          },
        },
        redirect: 'if_required', // Important: Handles 3D Secure redirects
      });

      if (error) {
        console.error("Stripe confirmPayment error:", error);
        // This error could be due to card decline, authentication failure, etc.
        toast({ title: "Payment Failed", description: error.message || "An error occurred during payment.", variant: "destructive" });
        onPaymentAttemptComplete({ success: false, error: error.message });
        setIsProcessingPayment(false); // Reset on client-side error from Stripe
        return;
      }

      // If redirect: 'if_required' and a redirect happened, this part might not be reached immediately.
      // The user would be redirected to the return_url.
      // If no redirect was needed (e.g. 3DS not required):
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({ title: "Payment Successful!", description: "Your payment has been processed." });
        onPaymentAttemptComplete({ success: true, paymentIntentId: paymentIntent.id });
        // setIsProcessingPayment is handled by the parent component via onPaymentAttemptComplete
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        toast({ title: "Action Required", description: "Further action is needed to complete your payment.", variant: "default" });
        onPaymentAttemptComplete({ success: false, error: "Payment requires further action from your bank." });
        setIsProcessingPayment(false);
      } else {
        // Handle other statuses if necessary
        toast({ title: "Payment Not Successful", description: `Payment status: ${paymentIntent?.status || 'unknown'}.`, variant: "destructive" });
        onPaymentAttemptComplete({ success: false, error: `Payment status: ${paymentIntent?.status || 'unknown'}` });
        setIsProcessingPayment(false);
      }

    } catch (err: any) {
      console.error("Payment submission error:", err);
      toast({ title: "Payment Error", description: err.message || "An unexpected error occurred.", variant: "destructive" });
      onPaymentAttemptComplete({ success: false, error: err.message || "An unexpected error occurred during payment." });
      setIsProcessingPayment(false);
    }
    // Note: setIsProcessingPayment(false) is called in error paths or implicitly by parent
    // when onPaymentAttemptComplete({success: true}) leads to dialog close.
  };

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs", // "tabs" or "accordion" or "auto"
    // Add other Payment Element options if needed
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md bg-background shadow-sm">
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
