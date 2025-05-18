
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, UserCircle, Search, Inbox, AlertTriangle, Info, CheckCircle, XCircle, Loader2, FileText, Briefcase, DollarSign, CalendarDays } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, Timestamp, onSnapshot, orderBy, getDoc as getFirestoreDoc, setDoc, writeBatch } from 'firebase/firestore';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [isProcessingProposalAction, setIsProcessingProposalAction] = useState(false);
  const [isConfirmPaymentDialogOpen, setIsConfirmPaymentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        const data = docSnap.data() as Omit<CustomerRequest, 'id'>;
        
        let eventDate = data.eventDate;
        if (eventDate instanceof Timestamp) {
          eventDate = eventDate.toDate();
        } else if (typeof eventDate === 'string') {
          eventDate = new Date(eventDate);
        } else if (eventDate && typeof eventDate.toDate === 'function') {
          eventDate = eventDate.toDate();
        } else if (!(eventDate instanceof Date)) {
          eventDate = new Date(); // Fallback
        }

        let createdAt = data.createdAt;
        if (createdAt && !(createdAt instanceof Date)) {
            createdAt = (createdAt as Timestamp).toDate();
        }
        let updatedAt = data.updatedAt;
        if (updatedAt && !(updatedAt instanceof Date)) {
            updatedAt = (updatedAt as Timestamp).toDate();
        }
        
        let enrichedData: EnrichedCustomerRequest = { 
          id: docSnap.id, 
          ...data,
          eventDate,
          createdAt,
          updatedAt,
        };

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
      setIsLoadingRequests(false);

      const requestIdFromUrl = searchParams.get('requestId');
      if (requestIdFromUrl && resolvedRequests.length > 0) {
        const requestToSelect = resolvedRequests.find(r => r.id === requestIdFromUrl);
        if (requestToSelect && (!selectedRequest || selectedRequest.id !== requestToSelect.id)) {
          setSelectedRequest(requestToSelect);
        }
      } else if (selectedRequest) {
        const updatedSelectedRequest = resolvedRequests.find(r => r.id === selectedRequest.id);
        setSelectedRequest(updatedSelectedRequest || null);
      }


    }, (error) => {
      console.error("Error fetching customer requests:", error);
      toast({ title: "Error", description: "Could not fetch your requests.", variant: "destructive" });
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [user, toast, searchParams, selectedRequest?.id]);

  useEffect(() => {
    if (!selectedRequest) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesCollectionRef = collection(db, "customerRequests", selectedRequest.id, "messages");
    const qMessages = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
      const fetchedMessages = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let timestamp = data.timestamp;
        if (timestamp && !(timestamp instanceof Date)) {
            timestamp = (timestamp as Timestamp).toDate();
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
    router.replace(`/customer/dashboard/messages?requestId=${request.id}`, { scroll: false });
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
        senderName: userProfile.name || user.displayName || "Customer",
        senderAvatarUrl: userProfile.profilePictureUrl || user.photoURL || undefined,
        senderRole: 'customer',
        text: newMessageText,
        timestamp: serverTimestamp()
      });
      
      let newStatus = selectedRequest.status;
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

  const proceedWithAcceptingProposal = async () => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user || !userProfile) return;
    
    setIsProcessingProposalAction(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = `Customer ${userProfile.name || 'You'} accepted the proposal from Chef ${selectedRequest.activeProposal.chefName}. A booking has been created.`;

    try {
      const batch = writeBatch(db);

      // 1. Update CustomerRequest status
      batch.update(requestDocRef, {
        status: 'customer_confirmed', 
        updatedAt: serverTimestamp()
      });
      
      // 2. Create Booking document
      const eventDateAsTimestamp = selectedRequest.eventDate instanceof Date 
                                   ? Timestamp.fromDate(selectedRequest.eventDate) 
                                   : selectedRequest.eventDate; 

      const newBookingData: Omit<Booking, 'id'> = {
        customerId: user.uid,
        customerName: userProfile.name || user.displayName || "Customer",
        chefId: selectedRequest.activeProposal.chefId,
        chefName: selectedRequest.activeProposal.chefName,
        chefAvatarUrl: selectedRequest.activeProposal.chefAvatarUrl || undefined,
        eventTitle: selectedRequest.eventType || `Menu: ${selectedRequest.activeProposal.menuTitle}`,
        eventDate: eventDateAsTimestamp,
        pax: selectedRequest.pax,
        totalPrice: selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax,
        pricePerHead: selectedRequest.activeProposal.menuPricePerHead,
        status: 'confirmed', 
        menuTitle: selectedRequest.activeProposal.menuTitle,
        location: selectedRequest.location || undefined,
        requestId: selectedRequest.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const bookingDocRef = doc(collection(db, "bookings")); // Generate new ID
      batch.set(bookingDocRef, newBookingData);

      // 3. Create CalendarEvent for the Chef
      const calendarEventData: Omit<CalendarEvent, 'id'> = {
          chefId: newBookingData.chefId,
          date: newBookingData.eventDate, 
          title: `Booking: ${newBookingData.eventTitle}`,
          customerName: newBookingData.customerName,
          pax: newBookingData.pax,
          menuName: newBookingData.menuTitle || 'Custom Event',
          pricePerHead: newBookingData.pricePerHead || 0,
          location: newBookingData.location,
          notes: `Booking confirmed via customer request ID: ${selectedRequest.id}. Booking ID: ${bookingDocRef.id}`,
          status: 'Confirmed',
          isWallEvent: false, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      };
      const chefCalendarEventDocRef = doc(db, `users/${newBookingData.chefId}/calendarEvents`, bookingDocRef.id);
      batch.set(chefCalendarEventDocRef, calendarEventData);

      // 4. Add system message
      const messagesCollectionRef = collection(requestDocRef, "messages");
      const systemMessageRef = doc(messagesCollectionRef); // auto-generate ID
      batch.set(systemMessageRef, {
        requestId: selectedRequest.id,
        senderId: 'system', 
        senderRole: 'system',
        text: systemMessageText,
        timestamp: serverTimestamp()
      });

      await batch.commit();

      toast({ 
        title: "Proposal Accepted & Booking Confirmed!", 
        description: `Booking (ID: ${bookingDocRef.id.substring(0,6)}...) created. Check 'My Booked Events'.`,
        duration: 7000,
      });
      router.push('/customer/dashboard/events');

    } catch (error) {
      console.error("Error accepting proposal and creating booking:", error);
      toast({ title: "Error", description: `Could not accept proposal. Details: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsProcessingProposalAction(false);
      setIsConfirmPaymentDialogOpen(false);
    }
  };

  const handleProposalAction = async (action: 'accept' | 'decline') => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user || !userProfile) return;

    if (action === 'accept') {
      setIsConfirmPaymentDialogOpen(true); // Open payment dialog first
      return;
    }

    // Handle decline directly
    setIsProcessingProposalAction(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = `Customer ${userProfile.name || 'You'} declined the proposal from Chef ${selectedRequest.activeProposal.chefName}.`;
    
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
    } finally {
      setIsProcessingProposalAction(false);
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
                                   selectedRequest.status === 'booked' || 
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
              placeholder="Search requests..." 
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
            <div className="text-xs text-muted-foreground space-y-0.5 text-right">
                <p><CalendarDays className="inline h-3 w-3 mr-1"/> Event Date: {format(selectedRequest.eventDate, 'PP')}</p>
                <p><Users className="inline h-3 w-3 mr-1"/> PAX: {selectedRequest.pax}</p>
                <p><DollarSign className="inline h-3 w-3 mr-1"/> Budget: ${selectedRequest.budget}</p>
            </div>
          </CardHeader>

          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading messages...</div>
            ) : messages.length === 0 && !selectedRequest.activeProposal ? (
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
                      <div className={`px-3 py-2 rounded-xl ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : (msg.senderRole === 'system' ? 'bg-amber-100 text-amber-700 text-xs italic text-center w-full' : 'bg-muted')}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-foreground/70 text-right' : (msg.senderRole === 'system' ? 'hidden' : 'text-muted-foreground/70 text-left')}`}>
                          {msg.timestamp ? format(new Date(msg.timestamp), 'p') : 'Sending...'}
                        </p>
                      </div>
                       {msg.senderId === user?.uid && userProfile && (
                         <Avatar className="h-6 w-6">
                           <AvatarImage src={userProfile.profilePictureUrl || undefined} alt={userProfile.name || 'Me'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'M'}</AvatarFallback>
                         </Avatar>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {selectedRequest.activeProposal && (
              <Card className={`my-4 p-4 border shadow-md ${
                selectedRequest.status === 'customer_confirmed' ? 'bg-green-50 border-green-200' : 
                selectedRequest.status === 'proposal_declined' ? 'bg-red-50 border-red-200 opacity-70' :
                'bg-sky-50 border-sky-200'
              }`}>
                <CardHeader className="p-0 pb-2">
                  <CardTitle className={`text-md flex items-center ${
                     selectedRequest.status === 'customer_confirmed' ? 'text-green-700' : 
                     selectedRequest.status === 'proposal_declined' ? 'text-red-700' :
                     'text-sky-600'
                  }`}>
                    <FileText className="mr-2 h-5 w-5"/>
                    Proposal from Chef {selectedRequest.activeProposal.chefName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm space-y-1">
                  <p><Briefcase className="inline h-4 w-4 mr-1 text-muted-foreground"/>Menu: <strong>{selectedRequest.activeProposal.menuTitle}</strong></p>
                  <p><DollarSign className="inline h-4 w-4 mr-1 text-muted-foreground"/>Price: <strong>${selectedRequest.activeProposal.menuPricePerHead.toFixed(2)} per head</strong> (Total: ${(selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax).toFixed(2)})</p>
                  {selectedRequest.activeProposal.notes && <p><Info className="inline h-4 w-4 mr-1 text-muted-foreground"/>Notes: {selectedRequest.activeProposal.notes}</p>}
                </CardContent>
                {canTakeProposalAction && (
                  <CardFooter className="p-0 pt-3 flex gap-2">
                    <Button onClick={() => handleProposalAction('accept')} size="sm" className="bg-green-600 hover:bg-green-700" disabled={isProcessingProposalAction}>
                      {isProcessingProposalAction ? <Loader2 className="animate-spin h-4 w-4 mr-1.5"/> : <CheckCircle className="h-4 w-4 mr-1.5"/>} Accept Proposal
                    </Button>
                    <Button onClick={() => handleProposalAction('decline')} size="sm" variant="outline" disabled={isProcessingProposalAction}>
                      {isProcessingProposalAction ? <Loader2 className="animate-spin h-4 w-4 mr-1.5"/> : <XCircle className="h-4 w-4 mr-1.5"/>} Decline Proposal
                    </Button>
                  </CardFooter>
                )}
                 {selectedRequest.status === 'customer_confirmed' && (
                    <p className="text-sm text-green-700 mt-2 font-medium">Thank you for confirming! A booking has been initiated. Check 'My Booked Events'.</p>
                )}
                {selectedRequest.status === 'proposal_declined' && (
                    <p className="text-sm text-red-700 mt-2 font-medium">You have declined this proposal. You can still message the chef or await other proposals if any.</p>
                )}
              </Card>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t flex flex-col space-y-3">
            <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed w-full">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" />
              <span>Remember: Keep all communication and payment on FindAChef. Do not share personal contact details.</span>
            </div>
            <div className="flex w-full items-center space-x-2">
              <Textarea
                placeholder={isConversationFinalized ? "This conversation is finalized." : "Type your message..."}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={isSendingMessage || isConversationFinalized}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessageText.trim() && !isConversationFinalized) handleSendMessage();
                  }
                }}
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} disabled={isSendingMessage || !newMessageText.trim() || isConversationFinalized}>
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
        <AlertDialog open={isConfirmPaymentDialogOpen} onOpenChange={setIsConfirmPaymentDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Booking &amp; Payment</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to accept the proposal from Chef {selectedRequest.activeProposal.chefName} for the menu "{selectedRequest.activeProposal.menuTitle}".
                        <br />
                        Total Price: <strong>${(selectedRequest.activeProposal.menuPricePerHead * selectedRequest.pax).toFixed(2)}</strong>
                        <br /><br />
                        This is a simulation. In a real application, you would be redirected to a secure payment gateway.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsConfirmPaymentDialogOpen(false)} disabled={isProcessingProposalAction}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={proceedWithAcceptingProposal} disabled={isProcessingProposalAction}>
                        {isProcessingProposalAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Confirm &amp; Pay (Simulated)
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    