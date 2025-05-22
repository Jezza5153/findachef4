
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
import { collection, query, where, getDocs, onSnapshot, orderBy, Timestamp, doc, updateDoc, addDoc, serverTimestamp, writeBatch, arrayUnion, getDoc } from 'firebase/firestore';
import type { CustomerRequest, RequestMessage, ChefProfile, Menu, AppUserProfileContext } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription as ShadDialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';


export default function ChefRequestsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [isProposeMenuDialogOpen, setIsProposeMenuDialogOpen] = useState(false);
  const [chefMenus, setChefMenus] = useState<Menu[]>([]);
  const [selectedMenuIdForProposal, setSelectedMenuIdForProposal] = useState<string | undefined>(undefined);
  const [proposalNotes, setProposalNotes] = useState('');
  const [isLoadingChefMenus, setIsLoadingChefMenus] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch customer requests relevant to the chef
  useEffect(() => {
    if (authLoading || !user || userProfile?.role !== 'chef') {
      setIsLoadingRequests(false);
      setRequests([]);
      return;
    }

    setIsLoadingRequests(true);
    const requestsCollectionRef = collection(db, "customerRequests");
    const q = query(
      requestsCollectionRef,
      where("status", "in", ["new", "awaiting_customer_response", "proposal_sent", "chef_accepted"]),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let fetchedRequests = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate as any),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt as any),
        } as CustomerRequest;
      });

      // Further client-side filtering for chef relevance
      fetchedRequests = fetchedRequests.filter(req => {
        if (req.status === 'new') return true;
        if (req.status === 'awaiting_customer_response' && req.respondingChefIds?.includes(user.uid)) return true;
        if ((req.status === 'proposal_sent' || req.status === 'chef_accepted') && req.activeProposal?.chefId === user.uid) return true;
        return false;
      });

      setRequests(fetchedRequests);
      setIsLoadingRequests(false);
    }, (error) => {
      console.error("ChefRequestsPage: Error fetching customer requests:", error);
      toast({ title: "Error", description: "Could not fetch customer requests.", variant: "destructive" });
      setIsLoadingRequests(false);
      setRequests([]);
    });

    return () => {
      console.log("ChefRequestsPage: Unsubscribing from customer requests listener.");
      unsubscribe();
    };
  }, [user, userProfile, authLoading, toast]);

  // Fetch messages for the selected request
  useEffect(() => {
    if (!selectedRequest?.id) {
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
        if (timestamp instanceof Timestamp) {
            timestamp = timestamp.toDate();
        } else if (timestamp && typeof timestamp.toDate === 'function') { 
            timestamp = (timestamp as any).toDate();
        } else if (timestamp && typeof timestamp === 'string') { 
            const d = new Date(timestamp);
            timestamp = isNaN(d.getTime()) ? new Date() : d;
        } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
            timestamp = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
        } else if (!(timestamp instanceof Date)) {
            timestamp = new Date(); 
        }
        return {
          id: docSnap.id,
          ...data,
          timestamp,
          senderName: data.senderName || (data.senderRole === 'chef' ? 'Chef' : 'Customer'),
          senderAvatarUrl: data.senderAvatarUrl,
        } as RequestMessage;
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error("ChefRequestsPage: Error fetching messages for request", selectedRequest.id, ":", error);
      toast({ title: "Error", description: "Could not fetch messages for this request.", variant: "destructive" });
      setMessages([]);
      setIsLoadingMessages(false);
    });

    return () => {
      console.log("ChefRequestsPage: Unsubscribing from messages listener for request", selectedRequest.id);
      unsubscribeMessages();
    };
  }, [selectedRequest, toast]);

  // Fetch chef's own menus for the proposal dialog
  useEffect(() => {
    if (isProposeMenuDialogOpen && user && userProfile?.role === 'chef') {
      setIsLoadingChefMenus(true);
      const menusCollectionRef = collection(db, "menus");
      const q = query(menusCollectionRef, where("chefId", "==", user.uid), where("isPublic", "==", true), orderBy("createdAt", "desc"));
      
      const unsubscribeMenus = onSnapshot(q, (querySnapshot) => {
        const fetchedMenus = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Menu));
        setChefMenus(fetchedMenus);
        setIsLoadingChefMenus(false);
      }, (error) => {
        console.error("ChefRequestsPage: Error fetching chef menus for proposal:", error);
        toast({ title: "Error", description: "Could not fetch your menus.", variant: "destructive" });
        setChefMenus([]);
        setIsLoadingChefMenus(false);
      });
      return () => {
        console.log("ChefRequestsPage: Unsubscribing from chef menus listener.");
        unsubscribeMenus();
      };
    }
  }, [isProposeMenuDialogOpen, user, userProfile, toast]);


  const handleSelectRequest = (req: CustomerRequest) => {
    setSelectedRequest(req);
    setNewMessageText(''); 
  };

  const handleSendMessage = async () => {
    if (!user || !userProfile || !selectedRequest || !newMessageText.trim()) return;
    if (authLoading) {
        toast({title: "Authenticating...", description: "Please wait.", variant: "default"});
        return;
    }

    setIsSendingMessage(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    try {
      const currentRequestSnap = await getDoc(requestDocRef);
      if (!currentRequestSnap.exists()) {
        toast({ title: "Error", description: "Request no longer exists.", variant: "destructive" });
        setIsSendingMessage(false);
        return;
      }
      const currentRequestData = currentRequestSnap.data() as CustomerRequest;

      const batch = writeBatch(db);
      const messagesCollectionRef = collection(requestDocRef, "messages");
      const newMessageRef = doc(messagesCollectionRef);
      batch.set(newMessageRef, {
        requestId: selectedRequest.id,
        senderId: user.uid,
        senderName: (userProfile as AppUserProfileContext).name || user.displayName || "Chef",
        senderAvatarUrl: (userProfile as AppUserProfileContext).profilePictureUrl || user.photoURL || undefined,
        senderRole: 'chef',
        text: newMessageText,
        timestamp: serverTimestamp()
      });

      // Update request status and respondingChefIds if it's the first response to a 'new' request
      let newStatus = currentRequestData.status;
      let updatedRespondingChefIds = currentRequestData.respondingChefIds || [];

      if (currentRequestData.status === 'new') {
        newStatus = 'awaiting_customer_response';
        if (!updatedRespondingChefIds.includes(user.uid)) {
          updatedRespondingChefIds = arrayUnion(user.uid) as any; // Firestore type requires this cast for arrayUnion
        }
         batch.update(requestDocRef, { 
            status: newStatus, 
            respondingChefIds: updatedRespondingChefIds, 
            updatedAt: serverTimestamp() 
        });
      } else {
         batch.update(requestDocRef, { updatedAt: serverTimestamp() });
      }
      
      await batch.commit();
      setNewMessageText('');
    } catch (error) {
      console.error("ChefRequestsPage: Error sending message:", error);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendProposal = async () => {
    if (!user || !userProfile || !selectedRequest || !selectedMenuIdForProposal) {
      toast({ title: "Missing Information", description: "Please select a menu for your proposal.", variant: "destructive" });
      return;
    }
    const selectedMenu = chefMenus.find(menu => menu.id === selectedMenuIdForProposal);
    if (!selectedMenu) {
      toast({ title: "Error", description: "Selected menu not found.", variant: "destructive" });
      return;
    }
    setIsProcessingAction(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    try {
      const batch = writeBatch(db);
      batch.update(requestDocRef, {
        status: 'proposal_sent',
        activeProposal: {
          menuId: selectedMenu.id,
          menuTitle: selectedMenu.title,
          menuPricePerHead: selectedMenu.pricePerHead,
          chefId: user.uid,
          chefName: (userProfile as AppUserProfileContext).name || user.displayName || "Chef",
          chefAvatarUrl: (userProfile as AppUserProfileContext).profilePictureUrl || user.photoURL || undefined,
          notes: proposalNotes,
          proposedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp(),
        respondingChefIds: arrayUnion(user.uid) // Ensure chef is in responding list
      });

      const messagesCollectionRef = collection(requestDocRef, "messages");
      const systemMessageRef = doc(messagesCollectionRef);
      batch.set(systemMessageRef, {
        requestId: selectedRequest.id,
        senderId: 'system',
        senderRole: 'system',
        text: `You proposed menu "${selectedMenu.title}". Notes: ${proposalNotes || 'N/A'}. Waiting for customer response.`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Proposal Sent!", description: "The customer has been notified." });
      setIsProposeMenuDialogOpen(false);
      setProposalNotes('');
      setSelectedMenuIdForProposal(undefined);
    } catch (error: any) {
      console.error("ChefRequestsPage: Error sending proposal:", error);
      toast({ title: "Proposal Error", description: `Could not send proposal: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!user || !selectedRequest) return;
    setIsProcessingAction(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    try {
      const batch = writeBatch(db);
      let updateData: any = {
        status: 'chef_declined',
        updatedAt: serverTimestamp()
      };
      if (selectedRequest.activeProposal?.chefId === user.uid) {
        updateData.activeProposal = null; // Clear proposal if it was this chef's
      }
      // Conceptually, you might add to declinedChefIds here too if you want to hide it from this chef
      batch.update(requestDocRef, updateData);

      const messagesCollectionRef = collection(requestDocRef, "messages");
      const systemMessageRef = doc(messagesCollectionRef);
      batch.set(systemMessageRef, {
        requestId: selectedRequest.id,
        senderId: 'system',
        senderRole: 'system',
        text: `Chef ${(userProfile as AppUserProfileContext)?.name || user.displayName} has declined this request.`,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      toast({ title: "Request Declined", variant: "default" });
    } catch (error: any) {
      console.error("ChefRequestsPage: Error declining request:", error);
      toast({ title: "Error", description: `Could not decline request: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };
  
  const handleAcceptRequest = async () => {
    if (!user || !selectedRequest || selectedRequest.activeProposal?.chefId !== user.uid) return;
    setIsProcessingAction(true);
    const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
    try {
      const batch = writeBatch(db);
      batch.update(requestDocRef, {
        status: 'chef_accepted',
        updatedAt: serverTimestamp()
      });

      const messagesCollectionRef = collection(requestDocRef, "messages");
      const systemMessageRef = doc(messagesCollectionRef);
      batch.set(systemMessageRef, {
        requestId: selectedRequest.id,
        senderId: 'system',
        senderRole: 'system',
        text: `Chef ${(userProfile as AppUserProfileContext)?.name || user.displayName} has accepted the request. Awaiting customer confirmation and payment.`,
        timestamp: serverTimestamp()
      });
      
      await batch.commit();
      toast({ title: "Request Accepted", description: "Awaiting customer confirmation." });
    } catch (error: any) {
      console.error("ChefRequestsPage: Error accepting request:", error);
      toast({ title: "Error", description: `Could not accept request: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    const searchLower = searchTerm.toLowerCase();
    return requests.filter(req =>
      req.eventType.toLowerCase().includes(searchLower) ||
      req.cuisinePreference.toLowerCase().includes(searchLower) ||
      (req.notes && req.notes.toLowerCase().includes(searchLower)) ||
      (req.activeProposal?.chefName && req.activeProposal.chefName.toLowerCase().includes(searchLower)) ||
      req.id.toLowerCase().includes(searchLower)
    );
  }, [requests, searchTerm]);

  const getStatusDisplay = (status?: CustomerRequest['status']) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const currentChefMadeActiveProposal = selectedRequest?.activeProposal?.chefId === user?.uid;
  const canPropose = selectedRequest && (selectedRequest.status === 'new' || selectedRequest.status === 'awaiting_customer_response');
  const canAccept = selectedRequest && currentChefMadeActiveProposal && selectedRequest.status === 'proposal_sent';
  const canDecline = selectedRequest && (selectedRequest.status === 'new' || selectedRequest.status === 'awaiting_customer_response' || (selectedRequest.status === 'proposal_sent' && currentChefMadeActiveProposal));
  const conversationIsFinalized = selectedRequest && ['booked', 'cancelled_by_customer', 'customer_confirmed', 'proposal_declined'].includes(selectedRequest.status || '');
  const chefHasDeclinedThisRequest = selectedRequest?.status === 'chef_declined' && selectedRequest?.activeProposal?.chefId !== user?.uid; // More complex logic might be needed if multiple chefs can decline.

  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading authentication...</div>;
  }
  if (!user || userProfile?.role !== 'chef') {
    return <div className="p-4 text-center text-muted-foreground">Access denied. This page is for chefs.</div>;
  }

  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6">
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center"><Inbox className="mr-2 h-5 w-5 text-primary"/>Customer Requests</CardTitle>
            <span className="text-sm text-muted-foreground">{filteredRequests.length} relevant</span>
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
                      <AvatarImage src={req.activeProposal?.chefAvatarUrl || undefined} alt={req.activeProposal?.chefName || req.eventType.charAt(0)} />
                      <AvatarFallback>
                        {req.activeProposal?.chefName ? req.activeProposal.chefName.substring(0,1).toUpperCase() : req.eventType.substring(0,1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold truncate">
                          {req.activeProposal?.chefName && req.activeProposal?.chefId !== user?.uid ? `Cust. awaiting THEIR proposal` : req.eventType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.updatedAt ? format(new Date(req.updatedAt), 'PP') : (req.createdAt ? format(new Date(req.createdAt), 'PP') : 'N/A')}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-primary">{getStatusDisplay(req.status)}</p>
                      <p className="text-xs truncate text-muted-foreground">
                        PAX: {req.pax}, Budget: ${req.budget}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-center text-muted-foreground">No relevant requests found.</p>
          )}
        </CardContent>
      </Card>

      {selectedRequest ? (
        <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col shadow-lg">
          <CardHeader className="border-b p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
               <Avatar className="h-10 w-10">
                 <AvatarImage src={undefined} alt={"C"} data-ai-hint="customer avatar"/>
                 <AvatarFallback>C</AvatarFallback>
               </Avatar>
              <div>
                <CardTitle className="text-lg">{selectedRequest.eventType}</CardTitle>
                <CardDescription className="text-xs">
                  Request ID: {selectedRequest.id.substring(0,8)}... | Status: {getStatusDisplay(selectedRequest.status)}
                </CardDescription>
              </div>
            </div>
             <div className="text-xs text-muted-foreground space-y-0.5 text-right self-start sm:self-center">
                <p><CalendarDays className="inline h-3 w-3 mr-1"/> Event Date: {selectedRequest.eventDate ? format(selectedRequest.eventDate, 'PP') : 'N/A'}</p>
                <p><Users className="inline h-3 w-3 mr-1"/> PAX: {selectedRequest.pax}</p>
                <p><DollarSign className="inline h-3 w-3 mr-1"/> Budget: ${selectedRequest.budget}</p>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            {selectedRequest.activeProposal && (
              <Card className="my-2 p-3 border shadow-sm bg-sky-50 dark:bg-sky-800/30 border-sky-200 dark:border-sky-700">
                <CardHeader className="p-0 pb-1">
                  <CardTitle className="text-sm flex items-center text-sky-700 dark:text-sky-300">
                    <FileText className="mr-1.5 h-4 w-4"/>
                    Active Proposal by Chef {selectedRequest.activeProposal.chefName === ((userProfile as AppUserProfileContext)?.name || user?.displayName) ? "You" : selectedRequest.activeProposal.chefName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs space-y-0.5 text-sky-800 dark:text-sky-200">
                  <p><Briefcase className="inline h-3 w-3 mr-1 text-muted-foreground"/>Menu: <strong>{selectedRequest.activeProposal.menuTitle}</strong></p>
                  <p><DollarSign className="inline h-3 w-3 mr-1 text-muted-foreground"/>Price: <strong>${selectedRequest.activeProposal.menuPricePerHead.toFixed(2)} per head</strong></p>
                  {selectedRequest.activeProposal.notes && <p><Info className="inline h-3 w-3 mr-1 text-muted-foreground"/>Notes: {selectedRequest.activeProposal.notes}</p>}
                </CardContent>
              </Card>
            )}

            {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full"><Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading messages...</div>
            ) : messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 max-w-[75%]`}>
                      {msg.senderId !== user?.uid && msg.senderRole !== 'system' && (
                         <Avatar className="h-6 w-6">
                           <AvatarImage src={msg.senderAvatarUrl || undefined} alt={msg.senderName || 'U'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{msg.senderName ? msg.senderName.charAt(0).toUpperCase() : (msg.senderRole === 'chef' ? 'C' : 'U')}</AvatarFallback>
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
                       {(msg.senderId === user?.uid && userProfile) && (
                         <Avatar className="h-6 w-6">
                           <AvatarImage src={(userProfile as AppUserProfileContext).profilePictureUrl || user?.photoURL || undefined} alt={(userProfile as AppUserProfileContext).name || 'Me'} data-ai-hint="user avatar"/>
                           <AvatarFallback>{(userProfile as AppUserProfileContext).name ? (userProfile as AppUserProfileContext).name!.charAt(0).toUpperCase() : 'M'}</AvatarFallback>
                         </Avatar>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
                 <div className="text-center text-muted-foreground py-8">No messages yet for this request.</div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t flex flex-col space-y-3">
            <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed w-full">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" data-ai-hint="warning triangle" />
              <span>Keep all communication on FindAChef until a booking is confirmed.</span>
            </div>

            {!conversationIsFinalized && !chefHasDeclinedThisRequest && (
                <div className="w-full space-y-2">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {canPropose && (
                            <Button onClick={() => setIsProposeMenuDialogOpen(true)} variant="outline" size="sm" disabled={isProcessingAction}>
                            <FileText className="mr-2 h-4 w-4" /> {currentChefMadeActiveProposal ? 'View/Edit Your Proposal' : 'Propose Menu'}
                            </Button>
                        )}
                        {canAccept && (
                            <Button onClick={handleAcceptRequest} size="sm" className="bg-green-600 hover:bg-green-700" disabled={isProcessingAction}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Accept Request
                            </Button>
                        )}
                        {canDecline && (
                            <Button onClick={handleDeclineRequest} variant="destructive" size="sm" disabled={isProcessingAction}>
                            <XCircle className="mr-2 h-4 w-4" /> Decline Request
                            </Button>
                        )}
                    </div>
                    <div className="flex w-full items-center space-x-2">
                        <Textarea
                            placeholder="Type your message..."
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            className="flex-1 min-h-[40px] max-h-[120px]"
                            rows={1}
                            disabled={isSendingMessage || isProcessingAction}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (newMessageText.trim() && !isProcessingAction) handleSendMessage();
                                }
                            }}
                        />
                        <Button type="button" size="icon" onClick={handleSendMessage} disabled={isSendingMessage || !newMessageText.trim() || isProcessingAction}>
                            {isSendingMessage ? <Loader2 className="animate-spin h-5 w-5"/> : <Send className="h-5 w-5" />}
                            <span className="sr-only">Send</span>
                        </Button>
                    </div>
                </div>
            )}
             {chefHasDeclinedThisRequest && (
                 <p className="text-sm text-red-600 text-center w-full">You have declined this request.</p>
             )}
             {conversationIsFinalized && selectedRequest.status !== 'chef_declined' && (
                 <p className="text-sm text-green-600 text-center w-full">This conversation is now finalized ({getStatusDisplay(selectedRequest.status)}).</p>
             )}
          </CardFooter>
        </Card>
      ) : (
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col items-center justify-center text-center p-10 bg-muted/30 rounded-lg shadow-lg">
            <Inbox className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty inbox messages"/>
            <p className="text-lg font-semibold text-muted-foreground">Select a request from the left to view messages and details.</p>
            <p className="text-sm text-muted-foreground">New customer requests will appear in the list.</p>
        </div>
      )}

      {isProposeMenuDialogOpen && (
        <Dialog open={isProposeMenuDialogOpen} onOpenChange={setIsProposeMenuDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Propose a Menu</DialogTitle>
              {ShadDialogDescription && <ShadDialogDescription>Select one of your menus and add any specific notes for this proposal.</ShadDialogDescription>}
            </DialogHeader>
            {isLoadingChefMenus ? (
              <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : chefMenus.length === 0 ? (
              <p className="text-muted-foreground text-center p-4">You have no public menus to propose. Please create some first.</p>
            ) : (
              <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto">
                <RadioGroup value={selectedMenuIdForProposal} onValueChange={setSelectedMenuIdForProposal}>
                  {chefMenus.map(menu => (
                    <Label key={menu.id} htmlFor={menu.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-accent/50 has-[:checked]:bg-accent has-[:checked]:text-accent-foreground cursor-pointer">
                      <RadioGroupItem value={menu.id} id={menu.id} />
                      <div>
                        <span className="font-semibold">{menu.title}</span> (${menu.pricePerHead.toFixed(2)}/head)
                        <p className="text-xs text-muted-foreground has-[:checked]:text-accent-foreground/80">{menu.cuisine} - {menu.description.substring(0,50)}...</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
                <Textarea 
                  placeholder="Additional notes for this proposal (e.g., customizations, availability details)..."
                  value={proposalNotes}
                  onChange={(e) => setProposalNotes(e.target.value)}
                />
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" disabled={isProcessingAction}>Cancel</Button></DialogClose>
              <Button onClick={handleSendProposal} disabled={!selectedMenuIdForProposal || isLoadingChefMenus || chefMenus.length === 0 || isProcessingAction}>
                {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Send Proposal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
