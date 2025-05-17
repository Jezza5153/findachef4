
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormLabel } from '@/components/ui/form'; // Added for labeling textarea
import { MessageSquare, Send, CalendarDays, UserCircle, Search, CheckCircle, XCircle, FilePlus2, AlertTriangle, Info, Users, DollarSign, Utensils, Loader2 } from 'lucide-react';
import type { CustomerRequest } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ChefRequestsPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [isSendingResponse, setIsSendingResponse] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user || userProfile?.role !== 'chef') {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const requestsCollectionRef = collection(db, "customerRequests");
        // Chefs see 'new' requests OR 'awaiting_customer_response' requests they are involved in.
        const q = query(
          requestsCollectionRef,
          where("status", "in", ["new", "awaiting_customer_response"]),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        let fetchedRequests = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate)
          } as CustomerRequest;
        });

        // Further client-side filter for 'awaiting_customer_response' to only show if current chef is responding
        fetchedRequests = fetchedRequests.filter(req => {
          if (req.status === 'new') return true;
          if (req.status === 'awaiting_customer_response' && req.respondingChefIds?.includes(user.uid)) return true;
          return false;
        });

        setRequests(fetchedRequests);
      } catch (error) {
        console.error("Error fetching customer requests:", error);
        toast({ title: "Error", description: "Could not fetch customer requests.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && userProfile?.role === 'chef') {
      fetchRequests();
    }
  }, [user, userProfile, toast]);

  const filteredRequests = requests.filter(req =>
    req.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.cuisinePreference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (req.notes && req.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectRequest = (req: CustomerRequest) => {
    setSelectedRequest(req);
    setProposalMessage(''); // Clear message when selecting a new request
  };

  const handleSendResponse = async () => {
    if (!selectedRequest || !user || !proposalMessage.trim()) {
      toast({ title: "Missing Information", description: "Please select a request and write a message.", variant: "destructive" });
      return;
    }
    setIsSendingResponse(true);
    try {
      const requestDocRef = doc(db, "customerRequests", selectedRequest.id);
      await updateDoc(requestDocRef, {
        status: "awaiting_customer_response",
        respondingChefIds: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      });
      
      // Placeholder for adding message to a subcollection
      // e.g., await addDoc(collection(db, "customerRequests", selectedRequest.id, "messages"), 
      //  { senderId: user.uid, senderRole: 'chef', text: proposalMessage, timestamp: serverTimestamp() });
      console.log(`Simulated message for request ${selectedRequest.id}: "${proposalMessage}" by chef ${user.uid}`);


      toast({ title: "Response Sent", description: "Your response has been sent to the customer." });
      
      // Update local state for immediate UI feedback
      const updatedRequest = { 
        ...selectedRequest, 
        status: "awaiting_customer_response" as const, 
        respondingChefIds: [...(selectedRequest.respondingChefIds || []), user.uid] 
      };
      setSelectedRequest(updatedRequest);
      setRequests(prevRequests => prevRequests.map(r => r.id === selectedRequest.id ? updatedRequest : r));
      setProposalMessage('');

    } catch (error) {
      console.error("Error sending response:", error);
      toast({ title: "Error", description: "Could not send your response.", variant: "destructive" });
    } finally {
      setIsSendingResponse(false);
    }
  };
  
  const currentChefHasResponded = selectedRequest && user && selectedRequest.respondingChefIds?.includes(user.uid);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading requests...</div>;
  }

  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6">
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Customer Requests</CardTitle>
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
          <div className="divide-y">
            {filteredRequests.length > 0 ? filteredRequests.map(req => (
              <div
                key={req.id}
                className={`p-4 hover:bg-muted/50 cursor-pointer ${selectedRequest?.id === req.id ? 'bg-muted' : ''}`}
                onClick={() => handleSelectRequest(req)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center" data-ai-hint="avatar placeholder">
                    <UserCircle className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold truncate">{req.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.createdAt instanceof Timestamp ? format(req.createdAt.toDate(), 'PP') : (req.createdAt ? format(new Date(req.createdAt as any), 'PP') : 'N/A')}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-primary">
                      {req.status?.replace(/_/g, ' ').toUpperCase() || 'NEW'}
                    </p>
                    <p className="text-xs truncate text-muted-foreground">
                      PAX: {req.pax}, Budget: ${req.budget}, Cuisine: {req.cuisinePreference}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <p className="p-4 text-center text-muted-foreground">No relevant requests found.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedRequest ? (
        <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col shadow-lg">
          <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
               <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center" data-ai-hint="avatar placeholder">
                 <UserCircle className="h-6 w-6 text-gray-500" />
               </div>
              <div>
                <CardTitle className="text-lg">{selectedRequest.eventType}</CardTitle>
                <CardDescription className="text-xs">
                  Request ID: {selectedRequest.id.substring(0,8)}...
                </CardDescription>
                <p className="text-xs text-primary font-medium">{selectedRequest.status?.replace(/_/g, ' ').toUpperCase() || 'NEW'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            <h3 className="font-semibold text-lg mb-2">Request Details:</h3>
            <div className="space-y-2 text-sm">
                <div className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Type: <span className="ml-1 font-medium">{selectedRequest.eventType}</span></div>
                <div className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Date: <span className="ml-1 font-medium">{format(selectedRequest.eventDate, 'PPP')}</span></div>
                <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>PAX: <span className="ml-1 font-medium">{selectedRequest.pax}</span></div>
                <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>Budget: <span className="ml-1 font-medium">${selectedRequest.budget}</span></div>
                <div className="flex items-center"><Utensils className="mr-2 h-4 w-4 text-muted-foreground"/>Cuisine: <span className="ml-1 font-medium">{selectedRequest.cuisinePreference}</span></div>
                {selectedRequest.notes && (
                    <div className="pt-2">
                        <p className="font-medium text-muted-foreground">Notes from Customer:</p>
                        <p className="bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{selectedRequest.notes}</p>
                    </div>
                )}
            </div>
            <div className="mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground text-center mb-4">
                  Future: Chat history with customer will appear here.
              </div>

              {(selectedRequest.status === 'new' || (selectedRequest.status === 'awaiting_customer_response' && !currentChefHasResponded)) && user && (
                <div className="space-y-2">
                  <FormLabel htmlFor="proposalMessage">Your Message/Initial Proposal:</FormLabel>
                  <Textarea
                    id="proposalMessage"
                    placeholder="Write your message to the customer. You can outline a brief proposal or ask clarifying questions here..."
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    className="min-h-[100px]"
                    disabled={isSendingResponse}
                  />
                  <Button onClick={handleSendResponse} disabled={isSendingResponse || !proposalMessage.trim()} className="w-full">
                    {isSendingResponse ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Response
                  </Button>
                </div>
              )}
              {selectedRequest.status === 'awaiting_customer_response' && currentChefHasResponded && (
                <div className="text-sm text-green-600 font-medium p-2 rounded-md bg-green-50 border border-green-200 w-full text-center">
                    Your response has been sent. Awaiting customer reply.
                </div>
              )}
               {selectedRequest.status === 'booked' && (
                <div className="text-sm text-green-600 font-medium p-2 rounded-md bg-green-50 border border-green-200 w-full text-center">
                    This request has been booked.
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t">
            <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed w-full">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" />
              <span>Remember: Keep all communication and payment on FindAChef until a booking is confirmed. Do not share personal contact details.</span>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col items-center justify-center text-center p-10 bg-muted/30 rounded-lg shadow-lg">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty message chat"/>
            <p className="text-lg font-semibold text-muted-foreground">Select a request to view details and respond.</p>
            <p className="text-sm text-muted-foreground">New customer requests that match your profile will appear in the list.</p>
        </div>
      )}
    </div>
  );
}
