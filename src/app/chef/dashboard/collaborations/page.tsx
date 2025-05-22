
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ChefProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDoc, Unsubscribe, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, UserMinus, Check, X, Send, Loader2, CombineIcon } from 'lucide-react';
import Link from 'next/link';

export default function ChefCollaborationsPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [incomingRequests, setIncomingRequests] = useState<ChefProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ChefProfile[]>([]);
  const [collaborators, setCollaborators] = useState<ChefProfile[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const currentChefProfile = userProfile as ChefProfile | null;

  const fetchProfileByIds = useCallback(async (ids: string[]): Promise<ChefProfile[]> => {
    if (!ids || ids.length === 0) return [];
    const profiles: ChefProfile[] = [];
    for (const id of ids) {
      if (id === user?.uid) continue; 
      try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          profiles.push({ id: docSnap.id, ...docSnap.data() } as ChefProfile);
        } else {
          console.warn(`Collaboration: Profile not found for ID: ${id}`);
        }
      } catch (error) {
        console.error(`Collaboration: Error fetching profile for ID ${id}:`, error);
        toast({ title: "Error", description: `Could not fetch profile for ID ${id}.`, variant: "destructive" });
      }
    }
    return profiles;
  }, [user?.uid, toast]);

  useEffect(() => {
    if (!user || !currentChefProfile) {
      setIsLoadingData(false);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setCollaborators([]);
      return;
    }

    setIsLoadingData(true);
    let unsubscribeProfile: Unsubscribe | undefined;

    try {
      const userDocRef = doc(db, "users", user.uid);
      unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const updatedProfile = docSnap.data() as ChefProfile;
          
          try {
            const [inc, out, coll] = await Promise.all([
              fetchProfileByIds(updatedProfile.incomingCollaborationRequests || []),
              fetchProfileByIds(updatedProfile.outgoingCollaborationRequests || []),
              fetchProfileByIds(updatedProfile.collaboratorIds || [])
            ]);
            setIncomingRequests(inc);
            setOutgoingRequests(out);
            setCollaborators(coll);
          } catch (error) {
            console.error("Error fetching related profiles:", error);
            toast({ title: "Data Load Error", description: "Could not load all collaboration details.", variant: "destructive" });
          } finally {
            setIsLoadingData(false);
          }
        } else {
          console.warn("CollaborationsPage: Current user profile not found in Firestore.");
          setIsLoadingData(false);
        }
      }, (error) => {
        console.error("Error listening to user profile for collaborations:", error);
        toast({title: "Error", description: "Could not load real-time collaboration data.", variant: "destructive"});
        setIsLoadingData(false);
      });
    } catch (e) {
      console.error("Error setting up collaborations listener:", e);
      toast({title: "Setup Error", description: "Failed to initialize collaboration tracking.", variant: "destructive"});
      setIsLoadingData(false);
    }

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [user, currentChefProfile?.id, fetchProfileByIds, toast]);


  const handleRespondToRequest = async (targetChefId: string, action: 'accept' | 'decline') => {
    if (!user || !currentChefProfile) {
        toast({title: "Error", description: "User not authenticated.", variant: "destructive"});
        return;
    }
    setIsProcessing(targetChefId);

    const currentUserDocRef = doc(db, "users", user.uid);
    const targetUserDocRef = doc(db, "users", targetChefId);

    try {
      // This should ideally be a Cloud Function for atomicity and permissions.
      // Simulating client-side updates for now.
      await updateDoc(currentUserDocRef, {
        incomingCollaborationRequests: arrayRemove(targetChefId),
        collaboratorIds: action === 'accept' ? arrayUnion(targetChefId) : arrayRemove(targetChefId),
        updatedAt: serverTimestamp()
      });

      await updateDoc(targetUserDocRef, {
        outgoingCollaborationRequests: arrayRemove(user.uid),
        collaboratorIds: action === 'accept' ? arrayUnion(user.uid) : arrayRemove(targetChefId),
        updatedAt: serverTimestamp()
      }).catch(e => console.warn("Client-side attempt to update target chef's collaboration list failed (expected if no direct write permission or CF not used):", e.message));


      toast({
        title: `Request ${action === 'accept' ? 'Accepted' : 'Declined'}`,
        description: `You ${action === 'accept' ? 'are now collaborators with' : 'have declined the request from'} the chef.`,
      });
    } catch (error: any) {
      console.error(`Error ${action}ing collaboration request:`, error);
      toast({ title: "Error", description: `Could not ${action} request. ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelOutgoingRequest = async (targetChefId: string) => {
    if (!user || !currentChefProfile) {
        toast({title: "Error", description: "User not authenticated.", variant: "destructive"});
        return;
    }
    setIsProcessing(targetChefId);

    const currentUserDocRef = doc(db, "users", user.uid);
    const targetUserDocRef = doc(db, "users", targetChefId);
    try {
      await updateDoc(currentUserDocRef, {
        outgoingCollaborationRequests: arrayRemove(targetChefId),
        updatedAt: serverTimestamp()
      });
      await updateDoc(targetUserDocRef, {
        incomingCollaborationRequests: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      }).catch(e => console.warn("Client-side attempt to update target chef's incoming requests failed:", e.message));
      
      toast({ title: "Request Cancelled", description: "Your collaboration request has been cancelled." });
    } catch (error: any) {
      console.error("Error cancelling outgoing request:", error);
      toast({ title: "Error", description: `Could not cancel request. ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRemoveCollaborator = async (targetChefId: string) => {
    if (!user || !currentChefProfile) {
        toast({title: "Error", description: "User not authenticated.", variant: "destructive"});
        return;
    }
    if (!window.confirm("Are you sure you want to remove this collaborator? This will remove the collaboration for both chefs.")) return;

    setIsProcessing(targetChefId);
    const currentUserDocRef = doc(db, "users", user.uid);
    const targetUserDocRef = doc(db, "users", targetChefId);

    try {
      await updateDoc(currentUserDocRef, {
        collaboratorIds: arrayRemove(targetChefId),
        updatedAt: serverTimestamp()
      });
      await updateDoc(targetUserDocRef, {
        collaboratorIds: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      }).catch(e => console.warn("Client-side attempt to update target chef's collaborator list failed:", e.message));

      toast({ title: "Collaborator Removed", description: "The chef has been removed from your collaborators." });
    } catch (error: any) {
      console.error("Error removing collaborator:", error);
      toast({ title: "Error", description: `Could not remove collaborator. ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const renderChefCard = (chef: ChefProfile, type: 'incoming' | 'outgoing' | 'collaborator') => (
    <Card key={chef.id} className="shadow-md">
      <CardContent className="pt-6 flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={chef.profilePictureUrl || undefined} alt={chef.name} data-ai-hint="chef portrait"/>
          <AvatarFallback>{chef.name?.substring(0, 2).toUpperCase() || 'CH'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{chef.name}</p>
          <p className="text-xs text-muted-foreground">{chef.specialties?.slice(0,3).join(', ')}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 p-4 border-t">
        {type === 'incoming' && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleRespondToRequest(chef.id, 'decline')} disabled={isProcessing === chef.id || !userProfile?.isAdmin}>
              {isProcessing === chef.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />} Decline
            </Button>
            <Button size="sm" onClick={() => handleRespondToRequest(chef.id, 'accept')} disabled={isProcessing === chef.id || !userProfile?.isAdmin}>
              {isProcessing === chef.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Accept
            </Button>
          </>
        )}
        {type === 'outgoing' && (
          <Button size="sm" variant="outline" onClick={() => handleCancelOutgoingRequest(chef.id)} disabled={isProcessing === chef.id || !userProfile?.isAdmin}>
            {isProcessing === chef.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Cancel Request
          </Button>
        )}
        {type === 'collaborator' && (
          <Button size="sm" variant="destructive" onClick={() => handleRemoveCollaborator(chef.id)} disabled={isProcessing === chef.id || !userProfile?.isAdmin}>
            {isProcessing === chef.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4 mr-1" />} Remove
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  if (!currentChefProfile?.hasCompletedFirstCoOp && !currentChefProfile?.isAdmin) {
    return (
      <div className="text-center py-10">
        <CombineIcon className="mx-auto h-12 w-12 text-muted-foreground" data-ai-hint="collaboration icon"/>
        <h2 className="mt-4 text-xl font-semibold">Unlock Collaborations</h2>
        <p className="mt-2 text-muted-foreground">
          The collaboration feature is unlocked after you successfully complete your first co-hosted event.
          <br /> This helps ensure all collaborating chefs have experience on the platform.
        </p>
         <Button asChild className="mt-4">
            <Link href="/chef/dashboard/wall">Post or Find Co-Host Events</Link>
          </Button>
      </div>
    );
  }

  if (isLoadingData && (!incomingRequests.length && !outgoingRequests.length && !collaborators.length)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/> Loading collaboration data...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-3xl font-bold flex items-center"><CombineIcon className="mr-3 h-8 w-8 text-primary" data-ai-hint="collaboration users"/> Manage Collaborations</h1>
        <Button asChild variant="outline">
          <Link href="/chef/dashboard/chefs"><UserPlus className="mr-2 h-4 w-4"/> Find Chefs to Collaborate</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming Collaboration Requests</CardTitle>
          <CardDescription>Review requests from chefs who want to collaborate with you.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData && incomingRequests.length === 0 ? <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/> Loading requests...</div> :
           incomingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingRequests.map(chef => renderChefCard(chef, 'incoming'))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No incoming collaboration requests.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outgoing Collaboration Requests</CardTitle>
          <CardDescription>Requests you've sent to other chefs.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData && outgoingRequests.length === 0 ? <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/> Loading requests...</div> :
           outgoingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outgoingRequests.map(chef => renderChefCard(chef, 'outgoing'))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No outgoing collaboration requests.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Collaborators</CardTitle>
          <CardDescription>Chefs you are currently collaborating with.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData && collaborators.length === 0 ? <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/> Loading collaborators...</div> :
           collaborators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collaborators.map(chef => renderChefCard(chef, 'collaborator'))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">You have no collaborators yet. Use the "Find Chefs" button to send requests!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
    
