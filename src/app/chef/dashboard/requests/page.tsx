
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, CalendarDays, UserCircle, Search, CheckCircle, XCircle, FilePlus2, AlertTriangle, Info, Users, DollarSign, Utensils, Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { CustomerRequest } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function ChefRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const requestsCollectionRef = collection(db, "customerRequests");
        // For now, fetching all 'new' requests.
        // In a real system, this might be more complex (e.g., requests matched to chef's skills/location)
        const q = query(requestsCollectionRef, where("status", "==", "new"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedRequests = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            // Ensure eventDate is a JS Date object if it's a Firestore Timestamp
            eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate) 
          } as CustomerRequest;
        });
        setRequests(fetchedRequests);
      } catch (error) {
        console.error("Error fetching customer requests:", error);
        toast({ title: "Error", description: "Could not fetch customer requests.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [user, toast]);

  const filteredRequests = requests.filter(req => 
    req.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.cuisinePreference.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleActionPlaceholder = (actionName: string, requestId: string) => {
    toast({
      title: `Action: ${actionName}`,
      description: `Feature for request ${requestId} coming soon. This would involve backend logic.`,
      duration: 5000,
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading requests...</div>;
  }

  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6">
      {/* Sidebar for message list */}
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">New Requests</CardTitle>
            <span className="text-sm text-muted-foreground">{filteredRequests.length} active</span>
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
                onClick={() => setSelectedRequest(req)}
              >
                <div className="flex items-start space-x-3">
                  {/* Placeholder Avatar */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center" data-ai-hint="avatar placeholder">
                    <UserCircle className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold truncate">{req.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.createdAt instanceof Timestamp ? format(req.createdAt.toDate(), 'PPp') : (req.createdAt ? format(new Date(req.createdAt as any), 'PPp') : 'N/A')}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-primary">
                      {req.status?.toUpperCase() || 'NEW'}
                    </p>
                    <p className="text-xs truncate text-muted-foreground">
                      PAX: {req.pax}, Budget: ${req.budget}, Cuisine: {req.cuisinePreference}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <p className="p-4 text-center text-muted-foreground">No new requests matching your search.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main chat area */}
      {selectedRequest ? (
        <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col shadow-lg">
          <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
               {/* Placeholder Avatar */}
               <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center" data-ai-hint="avatar placeholder">
                 <UserCircle className="h-6 w-6 text-gray-500" />
               </div>
              <div>
                <CardTitle className="text-lg">{selectedRequest.eventType}</CardTitle>
                <CardDescription className="text-xs">
                  Request ID: {selectedRequest.id.substring(0,8)}...
                </CardDescription>
                <p className="text-xs text-primary font-medium">{selectedRequest.status?.toUpperCase() || 'NEW'}</p>
              </div>
            </div>
            {/* <Button variant="ghost" size="icon" title="Check Availability / View Booking Info">
              <CalendarDays className="h-5 w-5" />
              <span className="sr-only">Check Availability</span>
            </Button> */}
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
            <div className="mt-6 text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-10 w-10 mb-2" />
              <p>Messaging and proposal features are under development.</p>
              <p className="text-xs">You will be able to communicate with the customer and send menu proposals here.</p>
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t flex flex-col space-y-3">
            <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" />
              <span>Remember: Keep all communication and payment on FindAChef until a booking is confirmed. Do not share personal contact details.</span>
            </div>
            <div className="flex w-full items-center space-x-2">
              <Input type="text" placeholder="Type your message (disabled)..." className="flex-1" disabled />
              <Button type="submit" size="icon" disabled>
                <Send className="h-5 w-5" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
            {selectedRequest.status === 'new' && ( 
                <div className="flex w-full items-center space-x-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleActionPlaceholder('Propose Menu', selectedRequest.id)}>
                        <FilePlus2 className="mr-2 h-4 w-4"/> Propose Menu
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleActionPlaceholder('Decline Request', selectedRequest.id)}>
                        <XCircle className="mr-2 h-4 w-4"/> Decline Request
                    </Button>
                    <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleActionPlaceholder('Accept Request', selectedRequest.id)}>
                        <CheckCircle className="mr-2 h-4 w-4"/> Accept Request
                    </Button>
                </div>
            )}
             {selectedRequest.status === 'booked' && ( // Example for 'booked' status
                <div className="text-sm text-green-600 font-medium p-2 rounded-md bg-green-50 border border-green-200 w-full text-center">
                    This booking has been confirmed.
                </div>
            )}
          </CardFooter>
        </Card>
      ) : (
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col items-center justify-center text-center p-10 bg-muted/30 rounded-lg shadow-lg">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty message chat"/>
            <p className="text-lg font-semibold text-muted-foreground">Select a request to view details.</p>
            <p className="text-sm text-muted-foreground">Customer requests will appear here once they are submitted.</p>
        </div>
      )}
    </div>
  );
}
