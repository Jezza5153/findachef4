
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
import { collection, query, where, getDoc as getFirestoreDoc, onSnapshot, orderBy, Timestamp, doc, updateDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { CustomerRequest, RequestMessage, ChefProfile, EnrichedCustomerRequest, Booking, CalendarEvent, AppUserProfileContext } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import { loadStripe, Stripe } from '@stripe/stripe-js';
import dynamic from 'next/dynamic';

const StripeElementsProvider = dynamic(() =>
  Promise.all([
    import('@stripe/react-stripe-js').then(mod => mod.Elements),
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  ]).then(([{ Elements: StripeElementsComponent }, stripePromise]) => ({ default: ({children}: {children: React.ReactNode}) => 
    stripePromise ? <StripeElementsComponent stripe={stripePromise}>{children}</StripeElementsComponent> : <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /> Initializing Payment Gateway...</div>
  })), { ssr: false, loading: () => <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /> Initializing Payment Gateway...</div> }
);

const StripePaymentForm = dynamic(() => 
  import('@/components/stripe-payment-form').then(mod => mod.StripePaymentForm), 
  { ssr: false, loading: () => <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /> Loading Payment Form...</div> }
);


export default function CustomerMessagesPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const [customerRequests, setCustomerRequests] = useState<EnrichedCustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EnrichedCustomerRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); // For Stripe form
  const [bookingFinalizationStatus, setBookingFinalizationStatus] = useState<'idle' | 'payment_processing' | 'awaiting_confirmation' | 'confirmed' | 'failed'>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isActuallyProcessingPayment, setIsActuallyProcessingPayment] = useState(false); // For Firestore writes after payment

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
      return () => {};
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
          if (ts instanceof Timestamp) return ts.toDate();
          if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
          if (ts.seconds && typeof ts.seconds === 'number') return new Timestamp(ts.seconds, ts.nanoseconds).toDate();
          return undefined;
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
          handleSelectRequest(requestToSelect);
        } else if (!requestToSelect && selectedRequest && selectedRequest.id === requestIdFromUrl) {
          setSelectedRequest(null);
        }
      } else if (selectedRequest && resolvedRequests.length > 0) {
        const updatedSelectedRequest = resolvedRequests.find(r => r.id === selectedRequest.id);
        if (updatedSelectedRequest) {
          setSelectedRequest(prev => ({...prev, ...updatedSelectedRequest})); // Merge to keep potential transient UI states
        } else {
          setSelectedRequest(null); // Selected request no longer exists or matches filters
        }
      } else if (!requestIdFromUrl) {
         // setSelectedRequest(null); // Keep current selection if no URL param
      }
      setIsLoadingRequests(false);

    }, (error) => {
      console.error("Error fetching customer requests:", error);
      toast({ title: "Error", description: "Could not fetch your requests.", variant: "destructive" });
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [user, toast, searchParams]);

  useEffect(() => {
    if (!selectedRequest) {
      setMessages([]);
      return () => {};
    }

    setIsLoadingMessages(true);
    const messagesCollectionRef = collection(db, "customerRequests", selectedRequest.id, "messages");
    const qMessages = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
      const fetchedMessages = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let timestamp = data.timestamp;
        if (timestamp instanceof Timestamp) {
            timestamp = timestamp.toDate();
        } else if (timestamp && typeof timestamp.toDate === 'function') { 
            timestamp = (timestamp as any).toDate();
        } else if (timestamp && typeof timestamp === 'string') { 
            timestamp = new Date(timestamp);
        } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
            timestamp = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
        } else if (!(timestamp instanceof Date)) {
            timestamp = new Date(); 
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
    setBookingFinalizationStatus('idle'); 
    setPaymentError(null);
    // Update URL only if it's different, to avoid redundant pushes
    const currentRequestId = searchParams.get('requestId');
    if (currentRequestId !== request.id) {
      router.replace(`/customer/dashboard/messages?requestId=${request.id}`, { scroll: false });
    }
  };

  const handleSendMessage = async () => {
    if (!user || !userProfile || !selectedRequest || !newMessageText.trim()) return;

    setIsSendingMessage(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    try {
      const messagesCollectionRef = collection(requestDocRef, "messages");
      await addDoc(messagesCollectionRef, {
        requestId: selectedRequest.id,
        senderId: user.uid,
        senderName: (userProfile as AppUserProfileContext).name || user.displayName || "Customer",
        senderAvatarUrl: (userProfile as AppUserProfileContext).profilePictureUrl || user.photoURL || undefined,
        senderRole: 'customer',
        text: newMessageText,
        timestamp: serverTimestamp()
      });
      
      let newStatus = selectedRequest.status;
      // If customer messages on a proposal_sent or chef_accepted, it implies they are responding
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
    setIsProcessingPayment(false); 
    if (result.success && result.paymentIntentId) {
      setBookingFinalizationStatus('awaiting_confirmation');
      toast({ title: "Payment Processed!", description: "Finalizing your booking with the chef..." });
      await proceedWithBookingCreation(result.paymentIntentId);
    } else {
      setBookingFinalizationStatus('failed');
      setPaymentError(result.error || "Payment failed. Please try again or contact support.");
      toast({ title: "Payment Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
  };

  const proceedWithBookingCreation = async (paymentIntentId?: string) => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user || !(userProfile as AppUserProfileContext)) {
      setBookingFinalizationStatus('failed');
      setPaymentError("Missing critical information to create booking.");
      toast({ title: "Booking Error", description: "Missing critical information.", variant: "destructive" });
      return;
    }
    
    setIsActuallyProcessingPayment(true); 
    
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = `You accepted the proposal from Chef ${selectedRequest.activeProposal.chefName}. Booking is confirmed. ${paymentIntentId ? `Payment ID: ${paymentIntentId.substring(0,10)}...` : ''}`;

    try {
      const batch = writeBatch(db);
      const customerNameForBooking = (userProfile as AppUserProfileContext).name || user.displayName || "Customer";

      batch.update(requestDocRef, {
        status: 'booked', 
        updatedAt: serverTimestamp()
      });
      
      const eventDateAsTimestamp = selectedRequest.eventDate instanceof Date 
                                   ? Timestamp.fromDate(selectedRequest.eventDate) 
                                   : selectedRequest.eventDate;

      const bookingDocRef = doc(collection(db, "bookings")); 
      const newBookingData: Omit<Booking, 'id'> = {
        customerId: user.uid,
        customerName: customerNameForBooking, 
        chefId: selectedRequest.activeProposal.chefId,
        chefName: selectedRequest.activeProposal.chefName,
        chefAvatarUrl: selectedRequest.activeProposal.chefAvatarUrl || undefined,
        eventTitle: selectedRequest.activeProposal.menuTitle || selectedRequest.eventType || "Booked Event",
        eventDate: eventDateAsTimestamp,
        pax: selectedRequest.pax,
        totalPrice: selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax,
        pricePerHead: selectedRequest.activeProposal.menuPricePerHead,
        status: 'confirmed', 
        menuTitle: selectedRequest.activeProposal.menuTitle,
        location: selectedRequest.location || undefined,
        requestId: selectedRequest.id,
        paymentIntentId: paymentIntentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
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
      setIsPaymentDialogOpen(false); 
      router.push('/customer/dashboard/events');

    } catch (error) {
      console.error("Error accepting proposal and creating booking:", error);
      setBookingFinalizationStatus('failed');
      const errorMessage = (error instanceof Error) ? error.message : "Could not complete booking.";
      setPaymentError(`Could not complete booking. Details: ${errorMessage}`);
      toast({ title: "Error", description: `Could not complete booking. Details: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsActuallyProcessingPayment(false);
    }
  };


  const handleProposalAction = async (action: 'accept' | 'decline') => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user || !(userProfile as AppUserProfileContext)) return;
    setBookingFinalizationStatus('idle');
    setPaymentError(null);

    if (action === 'accept') {
      setIsPaymentDialogOpen(true); 
      setBookingFinalizationStatus('payment_processing'); 
      return;
    }

    // Handle 'decline'
    setIsActuallyProcessingPayment(true); // Use this to disable buttons during decline processing
    setBookingFinalizationStatus('idle'); 
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = `You declined the proposal from Chef ${selectedRequest.activeProposal.chefName}.`;
    
    try {
        const batchWrite = writeBatch(db);
        batchWrite.update(requestDocRef, {
          status: 'proposal_declined',
          activeProposal: null, 
          updatedAt: serverTimestamp()
        });
        
        const messagesCollectionRef = collection(requestDocRef, "messages");
        const systemMessageRef = doc(messagesCollectionRef);
        batchWrite.set(systemMessageRef, {
          requestId: selectedRequest.id,
          senderId: 'system',
          senderRole: 'system',
          text: systemMessageText,
          timestamp: serverTimestamp()
        });

        await batchWrite.commit();
        toast({ title: "Proposal Declined", variant: "default", description: "The chef has been notified." });
    } catch (error) {
      console.error(`Error declining proposal:`, error);
      const errorMessage = (error instanceof Error) ? error.message : "Could not decline proposal.";
      toast({ title: "Error", description: `Could not decline proposal. Details: ${errorMessage}`, variant: "destructive" });
    } finally {
        setIsActuallyProcessingPayment(false);
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
                                   selectedRequest.status === 'booked' ||
                                   selectedRequest.status === 'proposal_declined' ||
                                   selectedRequest.status === 'cancelled_by_customer');


  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6">
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center"><Inbox className="mr-2 h-5 w-5 text-primary" data-ai-hint="inbox mail"/> My Requests</CardTitle>
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
                      <AvatarImage src={req.activeProposal?.chefAvatarUrl || req.proposingChef?.profilePictureUrl || undefined} alt={req.activeProposal?.chefName || req.proposingChef?.name || req.eventType.charAt(0)} data-ai-hint="chef avatar"/>
                      <AvatarFallback>
                        {req.activeProposal?.chefName ? req.activeProposal.chefName.substring(0,1).toUpperCase() : (req.proposingChef ? req.proposingChef.name?.substring(0,1).toUpperCase() : req.eventType.substring(0,1).toUpperCase())}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold truncate">
                          {req.activeProposal?.chefName ? `Chef ${req.activeProposal.chefName}` : (req.proposingChef?.name ? `Chef ${req.proposingChef.name}` : req.eventType)}
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
                 <AvatarImage src={selectedRequest.activeProposal?.chefAvatarUrl || selectedRequest.proposingChef?.profilePictureUrl || undefined} alt={selectedRequest.activeProposal?.chefName || selectedRequest.proposingChef?.name || selectedRequest.eventType.charAt(0)} data-ai-hint="chef avatar"/>
                <AvatarFallback>
                  {selectedRequest.activeProposal?.chefName ? selectedRequest.activeProposal.chefName.substring(0,1).toUpperCase() : (selectedRequest.proposingChef ? selectedRequest.proposingChef.name?.substring(0,1).toUpperCase() : selectedRequest.eventType.substring(0,1).toUpperCase())}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {selectedRequest.activeProposal?.chefName ? `Chat with Chef ${selectedRequest.activeProposal.chefName}` : (selectedRequest.proposingChef?.name ? `Chat with Chef ${selectedRequest.proposingChef.name}` : selectedRequest.eventType)}
                </CardTitle>
                <CardDescription className="text-xs">Request ID: {selectedRequest.id.substring(0,8)}... | Status: {getStatusDisplay(selectedRequest.status)}</CardDescription>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 text-right self-start sm:self-center">
                <p><CalendarDays className="inline h-3 w-3 mr-1" data-ai-hint="calendar icon"/> Event Date: {selectedRequest.eventDate ? format(selectedRequest.eventDate, 'PP') : 'N/A'}</p>
                <p><Users className="inline h-3 w-3 mr-1" data-ai-hint="users group"/> PAX: {selectedRequest.pax}</p>
                <p><DollarSign className="inline h-3 w-3 mr-1" data-ai-hint="money dollar sign"/> Budget: ${selectedRequest.budget}</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading messages...</div>
            ) : messages.length === 0 && !selectedRequest.activeProposal && bookingFinalizationStatus === 'idle' && !isConversationFinalized ? (
                <div className="text-center text-muted-foreground py-8">No messages yet. Await a chef's proposal or send a message if applicable.</div>
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
                          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center mr-1" data-ai-hint="info icon"/>
                      )}
                      <div className={`px-3 py-2 rounded-xl shadow-sm ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : (msg.senderRole === 'system' ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300 text-xs italic text-center w-full' : 'bg-muted')}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-foreground/70 text-right' : (msg.senderRole === 'system' ? 'hidden' : 'text-muted-foreground/70 text-left')}`}>
                          {msg.timestamp ? format(new Date(msg.timestamp), 'p') : 'Sending...'}
                        </p>
                      </div>
                       {msg.senderId === user?.uid && (userProfile as AppUserProfileContext) && (
                         <Avatar className="h-6 w-6">
                           <AvatarImage src={(userProfile as AppUserProfileContext).profilePictureUrl || user?.photoURL || undefined} alt={(userProfile as AppUserProfileContext).name || 'Me'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{(userProfile as AppUserProfileContext).name ? (userProfile as AppUserProfileContext).name!.charAt(0).toUpperCase() : 'M'}</AvatarFallback>
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
                    <FileText className="mr-2 h-5 w-5" data-ai-hint="document file"/>
                    Proposal from Chef {selectedRequest.activeProposal.chefName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm space-y-1 text-sky-800 dark:text-sky-200">
                  <p><Briefcase className="inline h-4 w-4 mr-1 text-muted-foreground" data-ai-hint="briefcase icon"/>Menu: <strong>{selectedRequest.activeProposal.menuTitle}</strong></p>
                  <p><DollarSign className="inline h-4 w-4 mr-1 text-muted-foreground" data-ai-hint="money dollar"/>Price: <strong>${selectedRequest.activeProposal.menuPricePerHead.toFixed(2)} per head</strong> (Total: ${(selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax).toFixed(2)})</p>
                  {selectedRequest.activeProposal.notes && <p><Info className="inline h-4 w-4 mr-1 text-muted-foreground" data-ai-hint="info icon"/>Notes: {selectedRequest.activeProposal.notes}</p>}
                </CardContent>
                {canTakeProposalAction && (
                  <CardFooter className="p-0 pt-3 flex gap-2">
                    <Button onClick={() => handleProposalAction('accept')} size="sm" className="bg-green-600 hover:bg-green-700" disabled={bookingFinalizationStatus !== 'idle' || isActuallyProcessingPayment}>
                      <CheckCircle className="h-4 w-4 mr-1.5" data-ai-hint="check circle"/> Accept & Proceed to Pay
                    </Button>
                    <Button onClick={() => handleProposalAction('decline')} size="sm" variant="outline" disabled={bookingFinalizationStatus !== 'idle' || isActuallyProcessingPayment}>
                      <XCircle className="h-4 w-4 mr-1.5" data-ai-hint="cross circle"/> Decline Proposal
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}
             {selectedRequest.status === 'customer_confirmed' && bookingFinalizationStatus !== 'confirmed' && ( 
                <div className="text-sm text-green-700 dark:text-green-400 mt-2 font-medium p-3 rounded-md bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 text-center">
                    <CheckCircle className="inline h-5 w-5 mr-2" data-ai-hint="check circle"/> You have accepted the proposal. Finalizing booking... (This may redirect shortly)
                </div>
            )}
            {selectedRequest.status === 'booked' && bookingFinalizationStatus !== 'confirmed' && ( 
                <div className="text-sm text-green-700 dark:text-green-400 mt-2 font-medium p-3 rounded-md bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 text-center">
                    <CheckCircle className="inline h-5 w-5 mr-2" data-ai-hint="check circle"/> This request has been booked. Check 'My Booked Events'.
                </div>
            )}
            {selectedRequest.status === 'proposal_declined' && (
                <div className="text-sm text-red-700 dark:text-red-400 mt-2 font-medium p-3 rounded-md bg-red-50 dark:bg-red-800/30 border border-red-200 dark:border-red-700 text-center">
                    <XCircle className="inline h-5 w-5 mr-2" data-ai-hint="cross circle"/> You have declined this proposal.
                </div>
            )}

            {bookingFinalizationStatus === 'awaiting_confirmation' && (
                 <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium p-3 rounded-md bg-blue-50 dark:bg-blue-800/30 border border-blue-200 dark:border-blue-700 text-center flex items-center justify-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2"/> Payment processed. Finalizing your booking, please wait...
                </div>
            )}
            {bookingFinalizationStatus === 'confirmed' && (
                <div className="text-sm text-green-700 dark:text-green-400 mt-2 font-medium p-3 rounded-md bg-green-50 dark:bg-green-800/30 border border-green-200 dark:border-green-700 text-center">
                    <CheckCircle className="inline h-5 w-5 mr-2" data-ai-hint="check circle"/> Booking confirmed! Check 'My Booked Events' for details.
                </div>
            )}
             {bookingFinalizationStatus === 'failed' && paymentError && (
                <div className="text-sm text-red-700 dark:text-red-400 mt-2 font-medium p-3 rounded-md bg-red-50 dark:bg-red-800/30 border border-red-200 dark:border-red-700 text-center">
                    <AlertTriangle className="inline h-5 w-5 mr-2" data-ai-hint="warning triangle"/> {paymentError}
                </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t flex flex-col space-y-3">
            <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed w-full">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" data-ai-hint="warning triangle" />
              <span>Remember: Keep all communication and payment on FindAChef. Do not share personal contact details.</span>
            </div>
            <div className="flex w-full items-center space-x-2">
              <Textarea
                placeholder={isConversationFinalized || bookingFinalizationStatus !== 'idle' || isActuallyProcessingPayment || isProcessingPayment ? "Conversation ended or action pending." : "Type your message..."}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={isSendingMessage || isConversationFinalized || bookingFinalizationStatus !== 'idle' || isActuallyProcessingPayment || isProcessingPayment}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessageText.trim() && !isConversationFinalized && bookingFinalizationStatus === 'idle' && !isActuallyProcessingPayment && !isProcessingPayment) handleSendMessage();
                  }
                }}
              />
              <Button type="button" size="icon" onClick={handleSendMessage} disabled={isSendingMessage || !newMessageText.trim() || isConversationFinalized || bookingFinalizationStatus !== 'idle' || isActuallyProcessingPayment || isProcessingPayment}>
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
            if ((isProcessingPayment || isActuallyProcessingPayment) && open) return;
            if (bookingFinalizationStatus === 'awaiting_confirmation' && !isProcessingPayment && !open) {
                setBookingFinalizationStatus('idle');
            }
            setIsPaymentDialogOpen(open);
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5 text-primary" data-ai-hint="credit card"/>Confirm Booking & Payment</AlertDialogTitle>
                    <AlertDialogDescription className="text-left space-y-2 pt-2">
                        <p>You are about to accept the proposal from <strong>Chef {selectedRequest.activeProposal.chefName}</strong> for: <strong>"{selectedRequest.activeProposal.menuTitle || selectedRequest.eventType}"</strong>.</p>
                        <p>Total Price: <strong className="text-lg">AUD {(selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax).toFixed(2)}</strong>.</p>
                        
                        {(bookingFinalizationStatus === 'payment_processing' && !isProcessingPayment && !isActuallyProcessingPayment) && (
                             <div className="text-sm text-blue-600 flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2"/> Verifying payment details...
                            </div>
                        )}
                         {isActuallyProcessingPayment && (
                             <div className="text-sm text-blue-600 flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin mr-2"/> Finalizing your booking...
                            </div>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {bookingFinalizationStatus === 'payment_processing' && (
                    <StripeElementsProvider>
                    <StripePaymentForm
                        customerName={(userProfile as AppUserProfileContext)?.name || "Customer"}
                        customerEmail={user?.email || ""}
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
                        setBookingFinalizationStatus('idle'); 
                        setIsProcessingPayment(false); 
                        setIsActuallyProcessingPayment(false);
                    }} disabled={isProcessingPayment || isActuallyProcessingPayment}>Cancel Payment</AlertDialogCancel>
                    {/* The "Confirm" button is part of StripePaymentForm now */}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
