
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, CalendarDays, UserCircle, Search, Inbox, AlertTriangle, Info, CheckCircle, XCircle, Loader2, FileText, Briefcase, Utensils, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, Timestamp, onSnapshot, orderBy, getDoc as getFirestoreDoc } from 'firebase/firestore';
import type { CustomerRequest, RequestMessage, ChefProfile, EnrichedCustomerRequest } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function CustomerMessagesPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [customerRequests, setCustomerRequests] = useState<EnrichedCustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EnrichedCustomerRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isProcessingProposalAction, setIsProcessingProposalAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedRequestsPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as CustomerRequest;
        let enrichedData: EnrichedCustomerRequest = { 
          id: docSnap.id, 
          ...data,
          eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate)
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
    }, (error) => {
      console.error("Error fetching customer requests:", error);
      toast({ title: "Error", description: "Could not fetch your requests.", variant: "destructive" });
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  useEffect(() => {
    if (!selectedRequest) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesCollectionRef = collection(db, "customerRequests", selectedRequest.id, "messages");
    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as RequestMessage));
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
  };

  const handleSendMessage = async () => {
    if (!user || !userProfile || !selectedRequest || !newMessageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const messagesCollectionRef = collection(db, "customerRequests", selectedRequest.id, "messages");
      await addDoc(messagesCollectionRef, {
        requestId: selectedRequest.id,
        senderId: user.uid,
        senderName: userProfile.name || user.displayName || "Customer",
        senderAvatarUrl: userProfile.profilePictureUrl || user.photoURL || undefined,
        senderRole: 'customer',
        text: newMessageText,
        timestamp: serverTimestamp()
      });
      setNewMessageText('');
      // Optionally update request status if this is the first customer reply to a proposal
      if(selectedRequest.status === 'proposal_sent' || selectedRequest.status === 'chef_accepted') {
         const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
         await updateDoc(requestDocRef, { status: 'awaiting_customer_response', updatedAt: serverTimestamp() });
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleProposalAction = async (action: 'accept' | 'decline') => {
    if (!selectedRequest || !selectedRequest.activeProposal || !user) return;

    setIsProcessingProposalAction(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    const systemMessageText = action === 'accept' 
      ? `Customer ${userProfile?.name || 'You'} accepted the proposal from Chef ${selectedRequest.activeProposal.chefName}.`
      : `Customer ${userProfile?.name || 'You'} declined the proposal from Chef ${selectedRequest.activeProposal.chefName}.`;

    try {
      if (action === 'accept') {
        await updateDoc(requestDocRef, {
          status: 'customer_confirmed', // This would lead to booking flow
          updatedAt: serverTimestamp()
        });
        toast({ title: "Proposal Accepted!", description: "Next steps for booking will appear soon." });
      } else { // Decline
        await updateDoc(requestDocRef, {
          status: 'proposal_declined',
          activeProposal: null, // Clear the active proposal
          updatedAt: serverTimestamp()
        });
        toast({ title: "Proposal Declined", variant: "default" });
      }
      // Add system message
      const messagesCollectionRef = collection(db, "customerRequests", selectedRequest.id, "messages");
      await addDoc(messagesCollectionRef, {
        requestId: selectedRequest.id,
        senderId: 'system',
        senderRole: 'system',
        text: systemMessageText,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error(`Error ${action}ing proposal:`, error);
      toast({ title: "Error", description: `Could not ${action} proposal.`, variant: "destructive" });
    } finally {
      setIsProcessingProposalAction(false);
    }
  };
  
  const filteredRequests = customerRequests.filter(req =>
    req.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.activeProposal?.chefName && req.activeProposal.chefName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusDisplay = (status?: CustomerRequest['status']) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
                        {req.proposingChef ? req.proposingChef.name?.substring(0,1) : req.eventType.substring(0,1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold truncate">
                          {req.proposingChef?.name ? `Chef ${req.proposingChef.name}` : req.eventType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.createdAt instanceof Timestamp ? format(req.createdAt.toDate(), 'PP') : (req.createdAt ? format(new Date(req.createdAt as any), 'PP') : 'N/A')}
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
                  {selectedRequest.proposingChef ? selectedRequest.proposingChef.name?.substring(0,1) : selectedRequest.eventType.substring(0,1)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {selectedRequest.proposingChef?.name ? `Chat with Chef ${selectedRequest.proposingChef.name}` : selectedRequest.eventType}
                </CardTitle>
                <CardDescription className="text-xs">Request ID: {selectedRequest.id.substring(0,8)}... | Status: {getStatusDisplay(selectedRequest.status)}</CardDescription>
              </div>
            </div>
            {/* Button to view full request details could go here */}
          </CardHeader>

          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading messages...</div>
            ) : messages.length === 0 && !selectedRequest.activeProposal ? (
                <div className="text-center text-muted-foreground py-8">No messages yet. Send a message to start the conversation.</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-end gap-2 max-w-[75%]`}>
                    {msg.senderId !== user?.uid && (
                       <Avatar className="h-6 w-6">
                         <AvatarImage src={msg.senderAvatarUrl || undefined} alt={msg.senderName || 'U'} data-ai-hint="user avatar"/>
                         <AvatarFallback>{msg.senderName ? msg.senderName.charAt(0) : (msg.senderRole === 'chef' ? 'C' : 'S')}</AvatarFallback>
                       </Avatar>
                    )}
                    <div className={`px-3 py-2 rounded-xl ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : (msg.senderRole === 'system' ? 'bg-amber-100 text-amber-800 text-xs italic text-center w-full' : 'bg-muted')}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === user?.uid ? 'text-primary-foreground/70 text-right' : (msg.senderRole === 'system' ? 'hidden' : 'text-muted-foreground/70 text-left')}`}>
                        {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : 'Sending...'}
                      </p>
                    </div>
                     {msg.senderId === user?.uid && userProfile && (
                       <Avatar className="h-6 w-6">
                         <AvatarImage src={userProfile.profilePictureUrl || undefined} alt={userProfile.name || 'Me'} data-ai-hint="user avatar"/>
                         <AvatarFallback>{userProfile.name ? userProfile.name.charAt(0) : 'M'}</AvatarFallback>
                       </Avatar>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Active Proposal Display */}
            {selectedRequest.activeProposal && (selectedRequest.status === 'proposal_sent' || selectedRequest.status === 'chef_accepted' || selectedRequest.status === 'customer_confirmed' || selectedRequest.status === 'booked') && (
              <Card className="my-4 p-4 bg-sky-50 border border-sky-200 shadow-md">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-md flex items-center"><FileText className="mr-2 h-5 w-5 text-sky-600"/>Proposal from Chef {selectedRequest.activeProposal.chefName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm space-y-1">
                  <p><Briefcase className="inline h-4 w-4 mr-1 text-muted-foreground"/>Menu: <strong>{selectedRequest.activeProposal.menuTitle}</strong></p>
                  <p><DollarSign className="inline h-4 w-4 mr-1 text-muted-foreground"/>Price: <strong>${selectedRequest.activeProposal.menuPricePerHead.toFixed(2)} per head</strong></p>
                  {selectedRequest.activeProposal.notes && <p><Info className="inline h-4 w-4 mr-1 text-muted-foreground"/>Notes: {selectedRequest.activeProposal.notes}</p>}
                </CardContent>
                {selectedRequest.status === 'proposal_sent' || selectedRequest.status === 'chef_accepted' && (
                  <CardFooter className="p-0 pt-3 flex gap-2">
                    <Button onClick={() => handleProposalAction('accept')} size="sm" className="bg-green-600 hover:bg-green-700" disabled={isProcessingProposalAction}>
                      {isProcessingProposalAction ? <Loader2 className="animate-spin h-4 w-4 mr-1.5"/> : <CheckCircle className="h-4 w-4 mr-1.5"/>} Accept Proposal
                    </Button>
                    <Button onClick={() => handleProposalAction('decline')} size="sm" variant="outline" disabled={isProcessingProposalAction}>
                      {isProcessingProposalAction ? <Loader2 className="animate-spin h-4 w-4 mr-1.5"/> : <XCircle className="h-4 w-4 mr-1.5"/>} Decline Proposal
                    </Button>
                  </CardFooter>
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
                placeholder="Type your message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 min-h-[40px] max-h-[120px]"
                rows={1}
                disabled={isSendingMessage || !selectedRequest || selectedRequest.status === 'booked' || selectedRequest.status === 'cancelled_by_customer' || selectedRequest.status === 'proposal_declined'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessageText.trim()) handleSendMessage();
                  }
                }}
              />
              <Button type="submit" size="icon" onClick={handleSendMessage} disabled={isSendingMessage || !newMessageText.trim() || !selectedRequest || selectedRequest.status === 'booked' || selectedRequest.status === 'cancelled_by_customer' || selectedRequest.status === 'proposal_declined'}>
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
    </div>
  );
}
