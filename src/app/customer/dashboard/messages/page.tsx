
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, UserCircle, Search, Inbox, AlertTriangle, Info, CheckCircle, XCircle, Loader2, FileText, Briefcase, DollarSign, CalendarDays, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, Timestamp, onSnapshot, orderBy, getDoc as getFirestoreDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import type { CustomerRequest, RequestMessage, ChefProfile, EnrichedCustomerRequest, Booking, CalendarEvent } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import dynamic from 'next/dynamic';

const StripeElementsProvider = dynamic(() =>
  Promise.all([
    import('@stripe/react-stripe-js').then(mod => mod.Elements),
    import('@stripe/stripe-js').then(mod => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!))
  ]).then(([{ Elements: StripeElementsComponent }, stripePromise]) => ({ default: ({children}: {children: React.ReactNode}) => 
    stripePromise ? <StripeElementsComponent stripe={stripePromise}>{children}</StripeElementsComponent> : <p>Loading payment gateway...</p> 
  })), { ssr: false, loading: () => <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /> Initializing Payment Gateway...</div> }
);

interface StripePaymentFormProps {
  totalPrice: number;
  onPaymentAttemptComplete: (result: { success: boolean; paymentIntentId?: string; error?: string }) => void;
  isProcessingPayment: boolean;
  setIsProcessingPayment: (isProcessing: boolean) => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({ totalPrice, onPaymentAttemptComplete, isProcessingPayment, setIsProcessingPayment }) => {
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

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onPaymentAttemptComplete({ success: false, error: "Card element not found." });
      setIsProcessingPayment(false);
      return;
    }
    
    toast({ title: "Processing Payment...", description: "Contacting payment gateway. Please wait." });

    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(totalPrice * 100), currency: 'aud' }), // Amount in cents
      });

      const paymentIntentData = await response.json();

      if (response.status !== 200 || !paymentIntentData.clientSecret) {
        throw new Error(paymentIntentData.error || 'Failed to create payment intent.');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(paymentIntentData.clientSecret, {
        payment_method: {
          card: cardElement,
          // billing_details: { name: 'Jenny Rosen' }, // Optional: Add customer name
        },
      });

      if (error) {
        throw new Error(error.message || 'Payment failed.');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentAttemptComplete({ success: true, paymentIntentId: paymentIntent.id });
      } else {
        // Handle other statuses like 'requires_action' or 'requires_confirmation' if necessary
        throw new Error(paymentIntent?.status ? `Payment status: ${paymentIntent.status}` : 'Payment not successful.');
      }
    } catch (err: any) {
      console.error("Payment processing error:", err);
      onPaymentAttemptComplete({ success: false, error: err.message || "An unexpected error occurred during payment." });
    } finally {
      // setIsProcessingPayment(false); // This will be set by parent component based on booking finalization
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: 'hsl(var(--foreground))',
        '::placeholder': {
          color: 'hsl(var(--muted-foreground))',
        },
      },
      invalid: {
        color: 'hsl(var(--destructive))',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="my-4 p-3 border rounded-md bg-background">
        <CardElement options={cardElementOptions} />
      </div>
      <Button type="submit" disabled={!stripe || isProcessingPayment} className="w-full">
        { isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" /> }
        {isProcessingPayment ? "Processing..." : `Pay AUD ${(totalPrice).toFixed(2)}`}
      </Button>
    </form>
  );
};


export default function CustomerMessagesPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [customerRequests, setCustomerRequests] = useState<EnrichedCustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EnrichedCustomerRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // For Stripe form button
  const [bookingFinalizationStatus, setBookingFinalizationStatus] = useState<'idle' | 'payment_processing' | 'awaiting_confirmation' | 'confirmed' | 'failed'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!user) {
      setIsLoadingRequests(false);
      setCustomerRequests([]);
      return;
    }

    setIsLoadingRequests(true);
    const requestsCollectionRef = collection(db, "customerRequests");
    const q = query(
      requestsCollectionRef,
      where("customerId", "==", user.uid),
      orderBy("updatedAt", "desc") 
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedRequestsPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        
        const convertTimestamp = (ts: any): Date | undefined => {
          if (!ts) return undefined;
          return ts instanceof Timestamp ? ts.toDate() : new Date(ts);
        };
        
        let enrichedData: EnrichedCustomerRequest = { 
          id: docSnap.id, 
          ...data,
          eventDate: convertTimestamp(data.eventDate)!,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          activeProposal: data.activeProposal ? {
            ...data.activeProposal,
            proposedAt: convertTimestamp(data.activeProposal.proposedAt)
          } : undefined,
        } as EnrichedCustomerRequest;

        if (data.activeProposal?.chefId) {
          try {
            const chefDocRef = doc(db, "users", data.activeProposal.chefId);
            const chefDocSnap = await getFirestoreDoc(chefDocRef);
            if (chefDocSnap.exists()) {
              const chefData = chefDocSnap.data() as ChefProfile;
              enrichedData.proposingChef = {
                name: chefData.name,
                profilePictureUrl: chefData.profilePictureUrl
              };
            }
          } catch (e) {
            console.error("Error fetching proposing chef's profile:", e);
          }
        }
        return enrichedData;
      });

      const resolvedRequests = await Promise.all(fetchedRequestsPromises);
      setCustomerRequests(resolvedRequests);
      
      const requestIdFromUrl = searchParams.get('requestId');
      if (requestIdFromUrl && resolvedRequests.length > 0) {
        const requestToSelect = resolvedRequests.find(r => r.id === requestIdFromUrl);
        if (requestToSelect && (!selectedRequest || selectedRequest.id !== requestToSelect.id)) {
          handleSelectRequest(requestToSelect); // Use handleSelectRequest to ensure messages are loaded
        }
      } else if (selectedRequest && resolvedRequests.length > 0) { 
        const updatedSelectedRequest = resolvedRequests.find(r => r.id === selectedRequest.id);
        setSelectedRequest(updatedSelectedRequest || null);
      }
      setIsLoadingRequests(false);

    }, (error) => {
      console.error("Error fetching customer requests:", error);
      toast({ title: "Error", description: "Could not fetch your requests.", variant: "destructive" });
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [user, toast, searchParams]); // Removed selectedRequest.id to avoid re-triggering when selectedRequest updates internally

  useEffect(() => {
    if (!selectedRequest) {
      setMessages([]);
      return () => {}; // Return an empty function for cleanup
    }

    setIsLoadingMessages(true);
    const messagesCollectionRef = collection(db, "customerRequests", selectedRequest.id, "messages");
    const qMessages = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
      const fetchedMessages = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let timestamp = data.timestamp;
        if (timestamp && typeof timestamp.toDate === 'function') {
            timestamp = (timestamp as Timestamp).toDate();
        } else if (timestamp && typeof timestamp === 'string') { 
            timestamp = new Date(timestamp);
        } else if (timestamp === null || timestamp === undefined) {
            timestamp = new Date(); // Fallback if timestamp is missing
        }
        return {
          id: docSnap.id,
          ...data,
          timestamp
        } as RequestMessage;
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not fetch messages for this request.", variant: "destructive" });
      setIsLoadingMessages(false);
    });

    return () => unsubscribeMessages();
  }, [selectedRequest, toast]);

  const handleSelectRequest = (request: EnrichedCustomerRequest) => {
    setSelectedRequest(request);
    setNewMessageText('');
    setBookingFinalizationStatus('idle'); // Reset payment status when selecting a new request
    setPaymentError(null);
    // Update URL without full page reload if already on messages page
    if (pathname === '/customer/dashboard/messages') {
      router.replace(`/customer/dashboard/messages?requestId=${request.id}`, { scroll: false });
    } else {
      router.push(`/customer/dashboard/messages?requestId=${request.id}`);
    }
  };
  const pathname = usePathname(); // Get current pathname

  const handleSendMessage = async () => {
    if (!user || !userProfile || !selectedRequest || !newMessageText.trim()) return;

    setIsSendingMessage(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    try {
      const messagesCollectionRef = collection(requestDocRef, "messages");
      await addDoc(messagesCollectionRef, {
        requestId: selectedRequest.id,
        senderId: user.uid,
        senderName: userProfile.name || user.displayName || "Customer",
        senderAvatarUrl: userProfile.profilePictureUrl || user.photoURL || undefined,
        senderRole: 'customer',
        text: newMessageText,
        timestamp: serverTimestamp()
      });
      
      let newStatus = selectedRequest.status;
      // If customer replies to a proposal, keep it as 'awaiting_customer_response' or similar,
      // or it might go back to 'awaiting_customer_response' if it was 'proposal_sent' or 'chef_accepted'
      if (selectedRequest.status === 'proposal_sent' || selectedRequest.status === 'chef_accepted') {
        newStatus = 'awaiting_customer_response'; 
      }
      await updateDoc(requestDocRef, { updatedAt: serverTimestamp(), status: newStatus });
      setNewMessageText('');

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const handlePaymentAttemptComplete = async (result: { success: boolean; paymentIntentId?: string; error?: string }) => {
    setIsProcessingPayment(false); // Handled by StripeForm, but good to ensure here too
    if (result.success && result.paymentIntentId) {
      setBookingFinalizationStatus('awaiting_confirmation');
      toast({ title: "Payment Processed!", description: "Finalizing your booking with the chef..." });
      // Simulate backend finalization
      await proceedWithBookingCreation(result.paymentIntentId);
    } else {
      setBookingFinalizationStatus('failed');
      setPaymentError(result.error || "Payment failed. Please try again or contact support.");
      toast({ title: "Payment Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
  };

  const proceedWithBookingCreation = async (paymentIntentId?: string) => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user || !userProfile) {
      setBookingFinalizationStatus('failed');
      setPaymentError("Missing critical information to create booking.");
      return;
    }

    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = `You accepted the proposal from Chef ${selectedRequest.activeProposal.chefName}. Booking is being finalized. ${paymentIntentId ? `Payment ID: ${paymentIntentId.substring(0,10)}...` : ''}`;

    try {
      const batch = writeBatch(db);

      batch.update(requestDocRef, {
        status: 'customer_confirmed', 
        updatedAt: serverTimestamp()
      });
      
      const eventDateAsTimestamp = selectedRequest.eventDate instanceof Date 
                                   ? Timestamp.fromDate(selectedRequest.eventDate) 
                                   : selectedRequest.eventDate;

      const newBookingData: Omit<Booking, 'id'> = {
        customerId: user.uid,
        customerName: userProfile.name || user.displayName || "Customer",
        chefId: selectedRequest.activeProposal.chefId,
        chefName: selectedRequest.activeProposal.chefName,
        chefAvatarUrl: selectedRequest.activeProposal.chefAvatarUrl || undefined,
        eventTitle: selectedRequest.activeProposal.menuTitle || selectedRequest.eventType || "Booked Event",
        eventDate: eventDateAsTimestamp,
        pax: selectedRequest.pax,
        totalPrice: selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax,
        pricePerHead: selectedRequest.activeProposal.menuPricePerHead,
        status: 'confirmed', // This status signifies successful payment and booking
        menuTitle: selectedRequest.activeProposal.menuTitle,
        location: selectedRequest.location || undefined,
        requestId: selectedRequest.id,
        paymentIntentId: paymentIntentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const bookingDocRef = doc(collection(db, "bookings")); 
      batch.set(bookingDocRef, newBookingData);

      const calendarEventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
          chefId: newBookingData.chefId,
          date: newBookingData.eventDate, 
          title: `Booking: ${newBookingData.eventTitle}`,
          customerName: newBookingData.customerName,
          pax: newBookingData.pax,
          menuName: newBookingData.menuTitle || 'Custom Event',
          pricePerHead: newBookingData.pricePerHead || 0,
          location: newBookingData.location,
          notes: `Booking confirmed for request ID: ${selectedRequest.id}. Booking ID: ${bookingDocRef.id}`,
          status: 'Confirmed',
          isWallEvent: false,
      };
      const chefCalendarEventDocRef = doc(db, `users/${newBookingData.chefId}/calendarEvents`, bookingDocRef.id);
      batch.set(chefCalendarEventDocRef, { ...calendarEventData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

      const messagesCollectionRef = collection(requestDocRef, "messages");
      const systemMessageRef = doc(messagesCollectionRef); 
      batch.set(systemMessageRef, {
        requestId: selectedRequest.id,
        senderId: 'system', 
        senderRole: 'system',
        text: systemMessageText,
        timestamp: serverTimestamp()
      });

      await batch.commit();

      setBookingFinalizationStatus('confirmed');
      toast({ 
        title: "Booking Confirmed!", 
        description: `Your event with Chef ${newBookingData.chefName} is confirmed. Booking ID: ${bookingDocRef.id.substring(0,6)}... Check 'My Booked Events'.`,
        duration: 7000,
      });
      setIsPaymentDialogOpen(false); // Close payment dialog
      router.push('/customer/dashboard/events');

    } catch (error) {
      console.error("Error accepting proposal and creating booking:", error);
      setBookingFinalizationStatus('failed');
      setPaymentError(`Could not complete booking. Details: ${(error as Error).message}`);
      toast({ title: "Error", description: `Could not complete booking. Details: ${(error as Error).message}`, variant: "destructive" });
    }
  };


  const handleProposalAction = async (action: 'accept' | 'decline') => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user || !userProfile) return;
    setBookingFinalizationStatus('idle');
    setPaymentError(null);

    if (action === 'accept') {
      setIsPaymentDialogOpen(true); 
      setBookingFinalizationStatus('payment_processing'); // Indicate payment step is starting
      return;
    }

    // Handle 'decline'
    setBookingFinalizationStatus('idle'); // Reset if it was processing something else
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = `You declined the proposal from Chef ${selectedRequest.activeProposal.chefName}.`;
    
    try {
        const batch = writeBatch(db);
        batch.update(requestDocRef, {
          status: 'proposal_declined',
          activeProposal: null, 
          updatedAt: serverTimestamp()
        });
        
        const messagesCollectionRef = collection(requestDocRef, "messages");
        const systemMessageRef = doc(messagesCollectionRef);
        batch.set(systemMessageRef, {
          requestId: selectedRequest.id,
          senderId: 'system',
          senderRole: 'system',
          text: systemMessageText,
          timestamp: serverTimestamp()
        });

        await batch.commit();
        toast({ title: "Proposal Declined", variant: "default", description: "The chef has been notified." });
    } catch (error) {
      console.error(`Error declining proposal:`, error);
      toast({ title: "Error", description: `Could not decline proposal. Details: ${(error as Error).message}`, variant: "destructive" });
    }
  };
  
  const filteredRequests = customerRequests.filter(req =>
    req.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.activeProposal?.chefName && req.activeProposal.chefName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (req.proposingChef?.name && req.proposingChef.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusDisplay = (status?: CustomerRequest['status']) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const canTakeProposalAction = selectedRequest && selectedRequest.activeProposal && 
                               (selectedRequest.status === 'proposal_sent' || selectedRequest.status === 'chef_accepted');
  
  const isConversationFinalized = selectedRequest && 
                                  (selectedRequest.status === 'customer_confirmed' || 
                                   selectedRequest.status === 'proposal_declined' ||
                                   selectedRequest.status === 'booked' || // 'booked' might be a final server-side confirmed state
                                   selectedRequest.status === 'cancelled_by_customer');


  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6">
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center"><Inbox className="mr-2 h-5 w-5 text-primary"/> My Requests</CardTitle>
            <span className="text-sm text-muted-foreground">{filteredRequests.length}</span>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by event or chef..." 
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-y-auto">
          {isLoadingRequests ? (
            <div className="p-4 text-center text-muted-foreground flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin mr-2"/> Loading requests...
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="divide-y">
              {filteredRequests.map(req => (
                <div
                  key={req.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer ${selectedRequest?.id === req.id ? 'bg-muted' : ''}`}
                  onClick={() => handleSelectRequest(req)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={req.proposingChef?.profilePictureUrl || undefined} alt={req.proposingChef?.name || req.eventType.charAt(0)} data-ai-hint="chef avatar"/>
                      <AvatarFallback>
                        {req.proposingChef ? req.proposingChef.name?.substring(0,1).toUpperCase() : req.eventType.substring(0,1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold truncate">
                          {req.proposingChef?.name ? `Chef ${req.proposingChef.name}` : req.eventType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                           {req.updatedAt ? format(new Date(req.updatedAt), 'PP') : (req.createdAt ? format(new Date(req.createdAt), 'PP') : 'N/A')}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-primary">{getStatusDisplay(req.status)}</p>
                      <p className="text-xs truncate text-muted-foreground">
                        Event: {req.eventType}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-center text-muted-foreground">No requests found.</p>
          )}
        </CardContent>
      </Card>

      {selectedRequest ? (
        <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col shadow-lg">
          <CardHeader className="border-b p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedRequest.proposingChef?.profilePictureUrl || undefined} alt={selectedRequest.proposingChef?.name || selectedRequest.eventType.charAt(0)} data-ai-hint="chef avatar" />
                <AvatarFallback>
                  {selectedRequest.proposingChef ? selectedRequest.proposingChef.name?.substring(0,1).toUpperCase() : selectedRequest.eventType.substring(0,1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {selectedRequest.proposingChef?.name ? `Chat with Chef ${selectedRequest.proposingChef.name}` : selectedRequest.eventType}
                </CardTitle>
                <CardDescription className="text-xs">Request ID: {selectedRequest.id.substring(0,8)}... | Status: {getStatusDisplay(selectedRequest.status)}</CardDescription>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 text-right self-start sm:self-center">
                <p><CalendarDays className="inline h-3 w-3 mr-1"/> Event Date: {selectedRequest.eventDate ? format(selectedRequest.eventDate, 'PP') : 'N/A'}</p>
                <p><Users className="inline h-3 w-3 mr-1"/> PAX: {selectedRequest.pax}</p>
                <p><DollarSign className="inline h-3 w-3 mr-1"/> Budget: ${selectedRequest.budget}</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading messages...</div>
            ) : messages.length === 0 && !selectedRequest.activeProposal && bookingFinalizationStatus === 'idle' ? (
                <div className="text-center text-muted-foreground py-8">No messages yet for this request. Send a message to start the conversation or await a chef's proposal.</div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[75%]`}>
                      {msg.senderId !== user?.uid && msg.senderRole !== 'system' && (
                         <Avatar className="h-6 w-6">
                           <AvatarImage src={msg.senderAvatarUrl || undefined} alt={msg.senderName || 'U'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{msg.senderName ? msg.senderName.charAt(0).toUpperCase() : (msg.senderRole === 'chef' ? 'C' : 'S')}</AvatarFallback>
                         </Avatar>
                      )}
                       {msg.senderRole === 'system' && (
                          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center mr-1" />
                      )}
                      <div className={`px-3 py-2 rounded-xl shadow-sm ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : (msg.senderRole === 'system' ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 text-xs italic text-center w-full' : 'bg-muted')}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-foreground/70 text-right' : (msg.senderRole === 'system' ? 'hidden' : 'text-muted-foreground/70 text-left')}`}>
                          {msg.timestamp ? format(new Date(msg.timestamp), 'p') : 'Sending...'}
                        </p>
                      </div>
                       {msg.senderId === user?.uid && userProfile && (
                         <Avatar className="h-6 w-6">
                           <AvatarImage src={userProfile.profilePictureUrl || user.photoURL || undefined} alt={userProfile.name || 'Me'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'M'}</AvatarFallback>
                         </Avatar>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {selectedRequest.activeProposal && (selectedRequest.status === 'proposal_sent' || selectedRequest.status === 'chef_accepted') && bookingFinalizationStatus === 'idle' && (
              <Card className="my-4 p-4 border shadow-md bg-sky-50 dark:bg-sky-800/30 border-sky-200 dark:border-sky-700">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-md flex items-center text-sky-700 dark:text-sky-300">
                    <FileText className="mr-2 h-5 w-5"/>
                    Proposal from Chef {selectedRequest.activeProposal.chefName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm space-y-1 text-sky-800 dark:text-sky-200">
                  <p><Briefcase className="inline h-4 w-4 mr-1 text-muted-foreground"/>Menu: <strong>{selectedRequest.activeProposal.menuTitle}</strong></p>
                  <p><DollarSign className="inline h-4 w-4 mr-1 text-muted-foreground"/>Price: <strong>${selectedRequest.activeProposal.menuPricePerHead.toFixed(2)} per head</strong> (Total: ${(selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax).toFixed(2)})</p>
                  {selectedRequest.activeProposal.notes && <p><Info className="inline h-4 w-4 mr-1 text-muted-foreground"/>Notes: {selectedRequest.activeProposal.notes}</p>}
                </CardContent>
                {canTakeProposalAction && (
                  <CardFooter className="p-0 pt-3 flex gap-2">
                    <Button onClick={() => handleProposalAction('accept')} size="sm" className="bg-green-600 hover:bg-green-700" disabled={bookingFinalizationStatus !== 'idle'}>
                      <CheckCircle className="h-4 w-4 mr-1.5"/> Accept & Proceed to Pay
                    </Button>
                    <Button onClick={() => handleProposalAction('decline')} size="sm" variant="outline" disabled={bookingFinalizationStatus !== 'idle'}>
                      <XCircle className="h-4 w-4 mr-1.5"/> Decline Proposal
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}
            {bookingFinalizationStatus === 'awaiting_confirmation' && (
                 <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium p-3 rounded-md bg-blue-50 dark:bg-blue-800/30 border border-blue-200 dark:border-blue-700 text-center flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2"/> Payment processed. Finalizing your booking, please wait...
                </div>
            )}
            {bookingFinalizationStatus === 'confirmed' && (
                <div className="text-sm text-green-700 dark:text-green-400 mt-2 font-medium p-3 rounded-md bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 text-center">
                    <CheckCircle className="inline h-5 w-5 mr-2"/> Booking confirmed! Check 'My Booked Events' for details.
                </div>
            )}
             {bookingFinalizationStatus === 'failed' && paymentError && (
                <div className="text-sm text-red-700 dark:text-red-400 mt-2 font-medium p-3 rounded-md bg-red-50 dark:bg-red-800/30 border border-red-200 dark:border-red-700 text-center">
                    <AlertTriangle className="inline h-5 w-5 mr-2"/> {paymentError}
                </div>
            )}
            {selectedRequest.status === 'customer_confirmed' && bookingFinalizationStatus !== 'confirmed' && ( // Shows if page reloaded after confirmation but before redirect
                <div className="text-sm text-green-700 dark:text-green-400 mt-2 font-medium p-3 rounded-md bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 text-center">
                    <CheckCircle className="inline h-5 w-5 mr-2"/> This booking is confirmed. Redirecting soon or check 'My Booked Events'.
                </div>
            )}
            {selectedRequest.status === 'proposal_declined' && (
                <div className="text-sm text-red-700 dark:text-red-400 mt-2 font-medium p-3 rounded-md bg-red-50 dark:bg-red-800/30 border border-red-200 dark:border-red-700 text-center">
                    <XCircle className="inline h-5 w-5 mr-2"/> You have declined this proposal.
                </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t flex flex-col space-y-3">
            <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed w-full">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" />
              <span>Remember: Keep all communication and payment on FindAChef. Do not share personal contact details.</span>
            </div>
            <div className="flex w-full items-center space-x-2">
              <Textarea
                placeholder={isConversationFinalized || bookingFinalizationStatus !== 'idle' ? "Conversation ended or action pending." : "Type your message..."}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={isSendingMessage || isConversationFinalized || bookingFinalizationStatus !== 'idle'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessageText.trim() && !isConversationFinalized && bookingFinalizationStatus === 'idle') handleSendMessage();
                  }
                }}
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} disabled={isSendingMessage || !newMessageText.trim() || isConversationFinalized || bookingFinalizationStatus !== 'idle'}>
                {isSendingMessage ? <Loader2 className="animate-spin h-5 w-5"/> : <Send className="h-5 w-5" />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col items-center justify-center text-center p-10 bg-muted/30 rounded-lg shadow-lg">
          <Inbox className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty inbox messages"/>
          <p className="text-lg font-semibold text-muted-foreground">Select a request from the left to view messages and details.</p>
          <p className="text-sm text-muted-foreground">Your conversations with chefs will appear here.</p>
        </div>
      )}

      {selectedRequest && selectedRequest.activeProposal && (
        <AlertDialog open={isPaymentDialogOpen} onOpenChange={(open) => {
            // Prevent closing if payment is actively being processed by Stripe form
            if (isProcessingPayment && open) return;
            // Allow closing if booking finalization is just 'awaiting_confirmation' but Stripe form is done
            if (bookingFinalizationStatus === 'awaiting_confirmation' && !isProcessingPayment && !open) {
                setBookingFinalizationStatus('idle'); // Reset if user cancels before server confirms
            }
            setIsPaymentDialogOpen(open);
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5 text-primary"/>Confirm Booking & Payment</AlertDialogTitle>
                    <AlertDialogDescription className="text-left space-y-2 pt-2">
                        <p>You are about to accept the proposal from <strong>Chef {selectedRequest.activeProposal.chefName}</strong> for: <strong>"{selectedRequest.activeProposal.menuTitle || selectedRequest.eventType}"</strong>.</p>
                        <p>Total Price: <strong className="text-lg">AUD {(selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax).toFixed(2)}</strong>.</p>
                        {bookingFinalizationStatus === 'payment_processing' && !isProcessingPayment && ( // Stripe form might have finished, but outer processing not
                            <div className="text-sm text-blue-600 flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2"/> Validating payment...
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {bookingFinalizationStatus === 'payment_processing' && (
                    <StripeElementsProvider>
                    <StripePaymentForm
                        totalPrice={selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax}
                        onPaymentAttemptComplete={handlePaymentAttemptComplete}
                        isProcessingPayment={isProcessingPayment}
                        setIsProcessingPayment={setIsProcessingPayment}
                    />
                    </StripeElementsProvider>
                )}
                
                <AlertDialogFooter className="mt-2"> 
                    <AlertDialogCancel onClick={() => {
                        setIsPaymentDialogOpen(false); 
                        setBookingFinalizationStatus('idle'); // Reset if user cancels payment process
                        setIsProcessingPayment(false); // Ensure this is also reset
                    }} disabled={isProcessingPayment}>Cancel Payment</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

