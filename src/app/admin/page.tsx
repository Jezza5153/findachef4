
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, ListChecks, UserCog, FileWarning, UserCheck, FileSearch2, BadgeCheck, MessageCircleWarning, Gavel, Award, MessageSquare, LockKeyhole, CalendarX2, UsersRound, Banknote, PauseCircle, Undo2, ClipboardCheck, FileCheck2, BotMessageSquare, ShieldBan, CreditCard, CalendarCheck2 as CalendarCheckIcon, Download, AlertTriangle, CalendarClock, Loader2, Utensils, CheckCircle, XCircle, Send, Eye } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, Timestamp, query, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import type { Menu, CustomerRequest, RequestMessage, AppUserProfileContext, ChefProfile, CustomerProfile, UserProfileBase } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext'; // Make sure useAuth is imported
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';

const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => mod.Dialog), { ssr: false });
const DialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogTitle), { ssr: false });
const DialogFooter = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogFooter), { ssr: false });
const DialogClose = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogClose), { ssr: false });
const ShadDialogDescription = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogDescription), { ssr: false });

// For dynamic imports inside this component specifically for RequestDetails and MenuReview
const RequestDetailsDialogContent = dynamic(() => 
  import('@/components/ui/dialog').then(mod => mod.DialogContent), 
  { ssr: false, loading: () => <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block"/> Loading details...</div> }
);
const MenuReviewDialogContent = dynamic(() => 
  import('@/components/ui/dialog').then(mod => mod.DialogContent), 
  { ssr: false, loading: () => <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block"/> Loading menu...</div> }
);


type UserView = AppUserProfileContext; 

export default function AdminPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth(); // Use auth context to check if user is admin

  const [allUsers, setAllUsers] = useState<UserView[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [allCustomerRequests, setAllCustomerRequests] = useState<CustomerRequest[]>([]);
  const [isLoadingCustomerRequests, setIsLoadingCustomerRequests] = useState(true);
  
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null); // Stores ID of item being processed

  const [isRequestDetailsDialogOpen, setIsRequestDetailsDialogOpen] = useState(false);
  const [selectedRequestForAdminView, setSelectedRequestForAdminView] = useState<CustomerRequest | null>(null);
  const [requestMessagesForAdminView, setRequestMessagesForAdminView] = useState<RequestMessage[]>([]);
  const [isLoadingRequestMessages, setIsLoadingRequestMessages] = useState(false);
  const [adminNotesForRequest, setAdminNotesForRequest] = useState('');
  let messagesUnsubscribe: (() => void) | null = null;


  const [isMenuReviewDialogOpen, setIsMenuReviewDialogOpen] = useState(false);
  const [selectedMenuForReview, setSelectedMenuForReview] = useState<Menu | null>(null);
  const [adminNotesForMenu, setAdminNotesForMenu] = useState('');


  useEffect(() => {
    setIsLoadingUsers(true);
    const usersCollectionRef = collection(db, "users");
    const usersQuery = query(usersCollectionRef, orderBy("createdAt", "desc"));
    const unsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
      const fetchedUsers = usersSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          accountStatus: data.accountStatus || 'active', // Default to active if not set
        } as UserView;
      });
      setAllUsers(fetchedUsers);
      setIsLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      setIsLoadingUsers(false);
    });

    setIsLoadingMenus(true);
    const menusCollectionRef = collection(db, "menus");
    const menusQuery = query(menusCollectionRef, orderBy("createdAt", "desc"));
    const unsubscribeMenus = onSnapshot(menusQuery, (menusSnapshot) => {
      const fetchedMenus = menusSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          adminStatus: data.adminStatus || 'pending', // Default to pending
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
        } as Menu;
      });
      setAllMenus(fetchedMenus);
      setIsLoadingMenus(false);
    }, (error) => {
      console.error("Error fetching menus:", error);
      toast({ title: "Error", description: "Could not fetch menus.", variant: "destructive" });
      setIsLoadingMenus(false);
    });

    setIsLoadingCustomerRequests(true);
    const requestsCollectionRef = collection(db, "customerRequests");
    const requestsQuery = query(requestsCollectionRef, orderBy("createdAt", "desc")); 
    const unsubscribeRequests = onSnapshot(requestsQuery, (requestsSnapshot) => { 
      const fetchedRequests = requestsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate as any),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          moderationStatus: data.moderationStatus || 'pending_review', // Default
        } as CustomerRequest;
      });
      setAllCustomerRequests(fetchedRequests);
      setIsLoadingCustomerRequests(false);
    }, (error) => {
      console.error("Error fetching customer requests:", error);
      toast({ title: "Error", description: "Could not fetch customer requests.", variant: "destructive" });
      setIsLoadingCustomerRequests(false);
    });
    
    return () => {
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeMenus) unsubscribeMenus();
        if (unsubscribeRequests) unsubscribeRequests();
        if (messagesUnsubscribe) {
          messagesUnsubscribe();
          messagesUnsubscribe = null; 
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // isAdmin is not a direct dependency for fetching initial data

  const handleApproveUser = async (userId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" }); return; }
    setIsProcessingAction(userId);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isApproved: true, accountStatus: 'active', updatedAt: serverTimestamp() });
      toast({ title: "Chef Approved", description: `Chef has been approved.` });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({ title: "Error", description: "Could not approve chef.", variant: "destructive" });
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" }); return; }
    setIsProcessingAction(userId);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isApproved: false, accountStatus: 'active', updatedAt: serverTimestamp() }); // Keeping account active, just not approved as chef
      toast({ title: "Chef Status Updated", description: `Chef status updated to not approved.` });
    } catch (error) {
      console.error("Error updating user approval status:", error);
      toast({ title: "Error", description: "Could not process action for chef.", variant: "destructive" });
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleApproveMenu = async (menuId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" }); return; }
    if (!selectedMenuForReview || selectedMenuForReview.id !== menuId) {
      toast({ title: "Error", description: "Menu context lost. Please reopen review.", variant: "destructive" });
      return;
    }
    setIsProcessingAction(menuId);
    try {
      const menuDocRef = doc(db, "menus", menuId);
      await updateDoc(menuDocRef, { adminStatus: 'approved', adminNotes: adminNotesForMenu || '', updatedAt: serverTimestamp() });
      toast({ title: "Menu Approved", description: `Menu has been approved.` });
      setIsMenuReviewDialogOpen(false);
      setAdminNotesForMenu('');
    } catch (error) {
      console.error("Error approving menu:", error);
      toast({ title: "Error", description: "Could not approve menu.", variant: "destructive" });
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleRejectMenu = async (menuId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" }); return; }
     if (!selectedMenuForReview || selectedMenuForReview.id !== menuId) {
      toast({ title: "Error", description: "Menu context lost. Please reopen review.", variant: "destructive" });
      return;
    }
    setIsProcessingAction(menuId);
    try {
      const menuDocRef = doc(db, "menus", menuId);
      await updateDoc(menuDocRef, { adminStatus: 'rejected', adminNotes: adminNotesForMenu || 'Rejected by admin.', updatedAt: serverTimestamp() });
      toast({ title: "Menu Rejected", description: `Menu has been rejected.` });
      setIsMenuReviewDialogOpen(false);
      setAdminNotesForMenu('');
    } catch (error) {
      console.error("Error rejecting menu:", error);
      toast({ title: "Error", description: "Could not reject menu.", variant: "destructive" });
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleViewRequestDetails = (request: CustomerRequest) => {
    setSelectedRequestForAdminView(request);
    setAdminNotesForRequest(request.adminNotes || '');
    setIsLoadingRequestMessages(true);
    setRequestMessagesForAdminView([]); // Clear previous messages
    
    if (messagesUnsubscribe) {
      messagesUnsubscribe(); // Unsubscribe from previous listener if any
      messagesUnsubscribe = null;
    }

    const messagesCollectionRef = collection(db, "customerRequests", request.id, "messages");
    const qMessages = query(messagesCollectionRef, orderBy("timestamp", "asc"));
    
    messagesUnsubscribe = onSnapshot(qMessages, (messagesSnapshot) => {
        const fetchedMessages = messagesSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp as any)
          } as RequestMessage;
        });
        setRequestMessagesForAdminView(fetchedMessages);
        setIsLoadingRequestMessages(false);
    }, (error) => {
        console.error("Error fetching messages for request:", error);
        toast({ title: "Error", description: "Could not fetch messages for this request.", variant: "destructive" });
        setIsLoadingRequestMessages(false);
    });
    setIsRequestDetailsDialogOpen(true); 
  };
  
  const handleModerateRequest = async (requestId: string, moderationAction: CustomerRequest['moderationStatus'], targetCustomerId?: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", variant: "destructive" }); return; }
    if (!selectedRequestForAdminView || selectedRequestForAdminView.id !== requestId) {
        toast({ title: "Error", description: "Request context lost. Please reopen and try again.", variant: "destructive" });
        return;
    }
    setIsProcessingAction(requestId);
    try {
      const requestDocRef = doc(db, "customerRequests", requestId);
      await updateDoc(requestDocRef, { 
        moderationStatus: moderationAction, 
        adminNotes: adminNotesForRequest,
        updatedAt: serverTimestamp() 
      });

      let userUpdatePromise: Promise<void> | null = null;
      if (targetCustomerId && (moderationAction === 'customer_warned' || moderationAction === 'customer_suspended')) {
        const userDocRef = doc(db, "users", targetCustomerId);
        userUpdatePromise = updateDoc(userDocRef, {
          accountStatus: moderationAction === 'customer_warned' ? 'warned' : 'suspended',
          updatedAt: serverTimestamp()
        });
        toast({ title: "Moderation Action Taken", description: `Request status updated to ${moderationAction?.replace(/_/g, ' ')} and customer account status updated.` });
      } else {
        toast({ title: "Moderation Action Taken", description: `Request status updated to ${moderationAction?.replace(/_/g, ' ')}.` });
      }
      
      if (userUpdatePromise) await userUpdatePromise;

      setIsRequestDetailsDialogOpen(false);
      setAdminNotesForRequest('');
    } catch (error) {
      console.error("Error moderating request:", error);
      toast({ title: "Moderation Error", description: "Could not update request moderation status.", variant: "destructive" });
    } finally {
      setIsProcessingAction(null);
    }
  };

  const handleOpenMenuReviewDialog = (menu: Menu) => {
    setSelectedMenuForReview(menu);
    setAdminNotesForMenu(menu.adminNotes || '');
    setIsMenuReviewDialogOpen(true);
  };
  
  const getAccountStatusBadgeVariant = (status?: UserProfileBase['accountStatus']) => {
    switch (status) {
      case 'active': return 'default'; // Using 'default' which is often green-ish or primary
      case 'warned': return 'secondary'; // Using 'secondary' which is often yellow-ish or gray
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const adminFeatures = [
    { name: "Approve Co-hosted Events", description: "Confirm both chefs are approved and willing to collaborate on the event.", icon: <ClipboardCheck className="mr-2 h-5 w-5 text-purple-600" /> },
    { name: "Approve Menus", description: "Verify menu content, accurate pricing, no personal branding/links, and ensure chef identity remains hidden pre-booking.", icon: <ListChecks className="mr-2 h-5 w-5 text-green-600" /> },
    { name: "Approve post-event payouts (50% release)", description: "Confirm event is complete (customer QR scan) and customer hasn’t raised a dispute within the allowed timeframe.", icon: <CreditCard className="mr-2 h-5 w-5 text-green-700" /> },
    { name: "Assign 'Trusted by FindAChef' Badge", description: "Manually assign to chefs with a proven track record. Not automated.", icon: <Award className="mr-2 h-5 w-5 text-amber-600" /> },
    { name: "Check for fake tags or exaggerated bios", description: "Ensure chef tags match their real experience.", icon: <BadgeCheck className="mr-2 h-5 w-5 text-teal-600" /> },
    { name: "Check receipt upload compliance", description: "Ensure receipts match event/menu tags. Important for chef's own records and dispute resolution.", icon: <FileCheck2 className="mr-2 h-5 w-5 text-indigo-700" /> },
    { name: "Export Admin Audit Log", description: "Generate monthly PDF/CSV reports of all administrative actions for record-keeping.", icon: <Download className="mr-2 h-5 w-5 text-slate-500" /> },
    { name: "Freeze payments if dispute is raised", description: "Pause automatic release of the remaining 50% fund portion and investigate customer complaint.", icon: <ShieldBan className="mr-2 h-5 w-5 text-orange-700" /> },
    { name: "Issue refunds for cancelled events", description: "Process refunds based on cancellation policies: Full refund if chef cancels (admin to manage chef accountability). For customer cancellations, apply tiered refunds (e.g., 50% refund, or 20% refund with 15% to chef & 15% to platform if <20 days prior).", icon: <Undo2 className="mr-2 h-5 w-5 text-blue-700" /> },
    { name: "Manage Expired Requests Queue", description: "Handle stale or unresolved customer posts from The Wall. Delete after 14 days.", icon: <CalendarX2 className="mr-2 h-5 w-5 text-orange-600" /> },
    { name: "Manage Violations (Warnings, Penalties, Bans)", description: "Issue warnings for first offenses (e.g., 15% fund deduction from held portion for off-platform communication attempts), enforce bans for second offenses.", icon: <Gavel className="mr-2 h-5 w-5 text-red-700" /> },
    { name: "Manually approve new chef accounts", description: "Check resume quality, no contact info, professionalism.", icon: <UserCheck className="mr-2 h-5 w-5 text-blue-600" /> },
    { name: "Moderate Reports (Chef Misconduct, Customer Fraud)", description: "Review user-submitted abuse reports daily. Handle reports of chef misconduct or customer fraud. Investigate and take appropriate action, especially immediate action if safety or fraud is involved. Record all conversation logs during disputes.", icon: <FileWarning className="mr-2 h-5 w-5 text-destructive" /> },
    { name: "Monitor active chat threads", description: "Look for off-platform contact attempts or spam.", icon: <MessageSquare className="mr-2 h-5 w-5 text-sky-600" /> },
    { name: "Monitor Event Conflict Alerts", description: "Review system-generated alerts for potential chef double-bookings or overbooking issues.", icon: <AlertTriangle className="mr-2 h-5 w-5 text-pink-600" /> },
    { name: "Oversee Automated Chat Locking", description: "Review and manage locks on conversation threads after bookings.", icon: <LockKeyhole className="mr-2 h-5 w-5 text-slate-600" /> },
    { name: "Review Flagged Messages (Contact Info, Unsafe Content)", description: "Review AI-flagged messages for off-platform contact attempts, unsafe content, or other policy violations.", icon: <MessageCircleWarning className="mr-2 h-5 w-5 text-destructive" /> },
    { name: "Review GPT resume parse accuracy", description: "Fix any resume to tag mismatches.", icon: <BotMessageSquare className="mr-2 h-5 w-5 text-indigo-600" /> },
    { name: "Review Published Chef Events", description: "Ensure event details on The Chef's Wall are clear, fair, and not duplicated.", icon: <CalendarCheckIcon className="mr-2 h-5 w-5 text-cyan-600" /> },
    { name: "Trust Score Override", description: "Monitor and, if necessary, manually override auto-generated chef trust scores based on platform activity, ratings, and warnings.", icon: <ShieldAlert className="mr-2 h-5 w-5 text-yellow-600" /> },
    { name: "View Flagged Resumes (Contact Info, Unsafe Content)", description: "Review resumes, especially those AI-flagged for containing direct contact information or inappropriate content.", icon: <FileSearch2 className="mr-2 h-5 w-5 text-destructive" /> },
  ];

  const getChefSubscriptionBadge = (user: UserView) => {
    if (user.role !== 'chef') return <Badge variant="outline" className="text-xs">N/A</Badge>;
    const chefProfile = user as ChefProfile; 
    return chefProfile.isSubscribed ? 
      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">Subscribed</Badge> : 
      <Badge variant="secondary" className="text-xs">Not Subscribed</Badge>;
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg mb-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCog className="h-8 w-8" data-ai-hint="admin settings user" />
          </div>
          <CardTitle className="text-3xl font-bold">Admin Dashboard</CardTitle>
          <CardDescription className="text-lg">
            Platform moderation, user management, and quality control tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This area is for platform administrators to manage users, content, and ensure the smooth operation of FindAChef.
            {!isAdmin && <span className="text-destructive font-semibold"> (Note: Your current account does not have admin privileges. Actions will be disabled.)</span>}
          </p>

          <div>
            <h3 className="text-xl font-semibold mb-3">Intended Features & Responsibilities:</h3>
            <ul className="space-y-3">
              {adminFeatures.sort((a, b) => a.name.localeCompare(b.name)).map((feature) => (
                <li key={feature.name} className="flex items-start text-foreground/90 p-3 bg-muted/30 rounded-md shadow-sm">
                  <div className="flex-shrink-0">{feature.icon}</div>
                  <div>
                    <span>{feature.name}</span>
                    {feature.description && <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center"><UsersRound className="mr-2 h-6 w-6 text-primary" data-ai-hint="group users"/> All Platform Users</CardTitle>
          <CardDescription>View and manage all registered users on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading users...</p>
            </div>
          ) : allUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Chef Approved</TableHead>
                    <TableHead>Chef Subscribed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'chef' ? 'default' : (user.role === 'admin' ? 'destructive' : 'secondary')} className="capitalize text-xs">
                          {user.role || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAccountStatusBadgeVariant(user.accountStatus)} className="capitalize text-xs">
                          {user.accountStatus || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {user.createdAt ? format(new Date(user.createdAt as any), 'PP') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {user.role === 'chef' ? (
                          (user as ChefProfile).isApproved ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">Approved</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Pending</Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-xs">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getChefSubscriptionBadge(user)}
                      </TableCell>
                      <TableCell>
                        {user.role === 'chef' && !(user as ChefProfile).isApproved && (
                          <TooltipProvider>
                            <div className="flex space-x-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveUser(user.id!)}
                                    disabled={!isAdmin || isProcessingAction === user.id}
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1"
                                  >
                                    {isProcessingAction === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                    <span className="ml-1">Approve</span>
                                  </Button>
                                </TooltipTrigger>
                                {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectUser(user.id!)}
                                    disabled={!isAdmin || isProcessingAction === user.id}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1"
                                  >
                                    {isProcessingAction === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                    <span className="ml-1">Reject</span>
                                  </Button>
                                </TooltipTrigger>
                                {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        )}
                        {user.role === 'chef' && (user as ChefProfile).isApproved && (
                          <span className="text-xs text-muted-foreground">No approval actions</span>
                        )}
                        {user.role !== 'chef' && (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center"><Utensils className="mr-2 h-6 w-6 text-primary" data-ai-hint="restaurant menu"/> All Platform Menus</CardTitle>
          <CardDescription>Review and manage all menus created by chefs.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMenus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading menus...</p>
            </div>
          ) : allMenus.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No menus found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu Title</TableHead>
                    <TableHead>Chef Name</TableHead>
                    <TableHead>Cuisine</TableHead>
                    <TableHead className="text-right">Price/Head</TableHead>
                    <TableHead>Public</TableHead>
                    <TableHead>Admin Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMenus.map((menu) => (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium">{menu.title}</TableCell>
                      <TableCell>{menu.chefName || 'N/A'}</TableCell>
                      <TableCell>{menu.cuisine}</TableCell>
                      <TableCell className="text-right">${menu.pricePerHead.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={menu.isPublic ? 'default' : 'secondary'} className="text-xs">
                          {menu.isPublic ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            menu.adminStatus === 'approved' ? 'default' :
                              menu.adminStatus === 'rejected' ? 'destructive' :
                                'secondary'
                          }
                          className={`text-xs capitalize ${
                            menu.adminStatus === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''
                          }`}
                        >
                          {menu.adminStatus || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Button variant="outline" size="sm" onClick={() => handleOpenMenuReviewDialog(menu)} className="text-xs" disabled={!isAdmin || isProcessingAction === menu.id}>
                           {isProcessingAction === menu.id && selectedMenuForReview?.id === menu.id ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <Eye className="h-3 w-3 mr-1"/>} Review
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Send className="mr-2 h-6 w-6 text-primary" data-ai-hint="message send"/> All Customer Requests</CardTitle>
          <CardDescription>Review all event requests made by customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCustomerRequests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading customer requests...</p>
            </div>
          ) : allCustomerRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No customer requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead className="text-right">PAX</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mod. Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCustomerRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.id.substring(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{request.eventType}</TableCell>
                      <TableCell className="text-xs">{request.customerId.substring(0, 8)}...</TableCell>
                      <TableCell className="text-xs">{request.eventDate ? format(new Date(request.eventDate as any), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right">{request.pax}</TableCell>
                      <TableCell className="text-right">${request.budget.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          request.status === 'booked' || request.status === 'customer_confirmed' ? 'default' :
                            request.status === 'cancelled_by_customer' || request.status === 'chef_declined' || request.status === 'proposal_declined' || request.status === 'payment_failed' ? 'destructive' :
                              'secondary'
                        } className="capitalize text-xs">
                          {request.status?.replace(/_/g, ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          request.moderationStatus === 'resolved' ? 'default' :
                          request.moderationStatus === 'customer_suspended' ? 'destructive' :
                          'secondary'} className="capitalize text-xs">
                            {request.moderationStatus?.replace(/_/g, ' ') || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleViewRequestDetails(request)} className="text-xs" disabled={!isAdmin || isProcessingAction === request.id}>
                           {isProcessingAction === request.id && selectedRequestForAdminView?.id === request.id ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <Eye className="h-3 w-3 mr-1"/>} View/Moderate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequestForAdminView && isRequestDetailsDialogOpen && (
        <Dialog open={isRequestDetailsDialogOpen} onOpenChange={(open) => {
            if (!open && messagesUnsubscribe) {
                messagesUnsubscribe(); 
                messagesUnsubscribe = null;
            }
            setIsRequestDetailsDialogOpen(open);
            if (!open) setSelectedRequestForAdminView(null); // Clear selected request when dialog closes
        }}>
          <RequestDetailsDialogContent className="sm:max-w-2xl"> 
            <DialogHeader>
              <DialogTitle>View Customer Request Details - ID: {selectedRequestForAdminView.id.substring(0,8)}...</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
              <h4 className="font-semibold">Request Information:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Event Type:</strong> {selectedRequestForAdminView.eventType}</p>
                <p><strong>Customer ID:</strong> <span className="font-mono text-xs">{selectedRequestForAdminView.customerId}</span></p>
                <p><strong>Event Date:</strong> {selectedRequestForAdminView.eventDate ? format(new Date(selectedRequestForAdminView.eventDate as any), 'PPP') : 'N/A'}</p>
                <p><strong>PAX:</strong> {selectedRequestForAdminView.pax}</p>
                <p><strong>Budget:</strong> ${selectedRequestForAdminView.budget.toFixed(2)}</p>
                <p><strong>Cuisine:</strong> {selectedRequestForAdminView.cuisinePreference}</p>
                <p><strong>Status:</strong> <Badge variant={selectedRequestForAdminView.status === 'booked' ? 'default' : 'secondary'} className="capitalize text-xs">{selectedRequestForAdminView.status?.replace(/_/g, ' ') || 'Unknown'}</Badge></p>
                {selectedRequestForAdminView.location && <p className="col-span-2"><strong>Location:</strong> {selectedRequestForAdminView.location}</p>}
                {selectedRequestForAdminView.notes && <p className="col-span-2"><strong>Notes:</strong> {selectedRequestForAdminView.notes}</p>}
                <p><strong>Moderation Status:</strong> <Badge variant={selectedRequestForAdminView.moderationStatus === 'resolved' ? 'default' : (selectedRequestForAdminView.moderationStatus === 'customer_suspended' ? 'destructive' : 'secondary')} className="capitalize text-xs">{selectedRequestForAdminView.moderationStatus?.replace(/_/g, ' ') || 'Pending Review'}</Badge></p>
              </div>
              <div className="mt-2">
                <Label htmlFor="adminNotesRequest">Admin Notes:</Label>
                <Textarea 
                  id="adminNotesRequest"
                  value={adminNotesForRequest}
                  onChange={(e) => setAdminNotesForRequest(e.target.value)}
                  placeholder="Internal notes for this request..."
                  className="mt-1"
                  disabled={!isAdmin || !!isProcessingAction}
                />
              </div>

              <h4 className="font-semibold mt-4 pt-2 border-t">Messages ({requestMessagesForAdminView.length}):</h4>
              {isLoadingRequestMessages ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /> Loading messages...</div>
              ) : requestMessagesForAdminView.length > 0 ? (
                <div className="space-y-2 text-xs max-h-48 overflow-y-auto border p-2 rounded-md bg-muted/30">
                  {requestMessagesForAdminView.map(msg => (
                    <div key={msg.id} className="p-1.5 rounded-md bg-background shadow-sm">
                      <p className="font-medium">{msg.senderName || msg.senderRole} ({msg.senderRole?.startsWith('customer') ? 'Cust.' : (msg.senderRole?.startsWith('chef') ? 'Chef' : 'Sys.')}):</p>
                      <p className="text-muted-foreground">{msg.text}</p>
                      <p className="text-right text-muted-foreground/70 text-[10px]">{msg.timestamp ? format(new Date(msg.timestamp as any), 'PP p') : 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No messages for this request.</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={!!isProcessingAction}>Close</Button>
              </DialogClose>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleModerateRequest(selectedRequestForAdminView.id, 'resolved')} variant="default" disabled={!isAdmin || !!isProcessingAction || selectedRequestForAdminView.moderationStatus === 'resolved'}>
                      {isProcessingAction === selectedRequestForAdminView.id && selectedRequestForAdminView.moderationStatus === 'resolved' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Mark as Resolved
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleModerateRequest(selectedRequestForAdminView.id, 'customer_warned', selectedRequestForAdminView.customerId)} variant="outline" disabled={!isAdmin || !!isProcessingAction || selectedRequestForAdminView.moderationStatus === 'customer_warned'}>
                      {isProcessingAction === selectedRequestForAdminView.id && selectedRequestForAdminView.moderationStatus === 'customer_warned' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Warn Customer
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleModerateRequest(selectedRequestForAdminView.id, 'customer_suspended', selectedRequestForAdminView.customerId)} variant="destructive" disabled={!isAdmin || !!isProcessingAction || selectedRequestForAdminView.moderationStatus === 'customer_suspended'}>
                      {isProcessingAction === selectedRequestForAdminView.id && selectedRequestForAdminView.moderationStatus === 'customer_suspended' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Suspend Customer
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </DialogFooter>
          </RequestDetailsDialogContent>
        </Dialog>
      )}

      {selectedMenuForReview && isMenuReviewDialogOpen && (
        <Dialog open={isMenuReviewDialogOpen} onOpenChange={setIsMenuReviewDialogOpen}>
          <MenuReviewDialogContent className="sm:max-w-lg"> 
            <DialogHeader>
              <DialogTitle>Review Menu: {selectedMenuForReview.title}</DialogTitle>
              {selectedMenuForReview.imageUrl && (
                <div className="my-2 rounded-md overflow-hidden aspect-video relative">
                  <Image src={selectedMenuForReview.imageUrl} alt={selectedMenuForReview.title} layout="fill" objectFit="cover" data-ai-hint={selectedMenuForReview.dataAiHint || "menu food item"} />
                </div>
              )}
            </DialogHeader>
            <div className="text-sm space-y-1 max-h-[50vh] overflow-y-auto p-1">
              <p><strong>Chef:</strong> {selectedMenuForReview.chefName}</p>
              <p><strong>Cuisine:</strong> {selectedMenuForReview.cuisine}</p>
              <p><strong>Price/Head:</strong> ${selectedMenuForReview.pricePerHead.toFixed(2)}</p>
              <p><strong>PAX:</strong> {selectedMenuForReview.pax || 'N/A'}</p>
              <p><strong>Description:</strong> {selectedMenuForReview.description}</p>
              {selectedMenuForReview.dietaryInfo && selectedMenuForReview.dietaryInfo.length > 0 && (
                <p><strong>Dietary:</strong> {selectedMenuForReview.dietaryInfo.join(', ')}</p>
              )}
              <p><strong>Public:</strong> {selectedMenuForReview.isPublic ? 'Yes' : 'No'}</p>
              <p><strong>Current Admin Status:</strong> <Badge variant={selectedMenuForReview.adminStatus === 'approved' ? 'default' : (selectedMenuForReview.adminStatus === 'rejected' ? 'destructive' : 'secondary')} className={`capitalize text-xs ${selectedMenuForReview.adminStatus === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}`}>{selectedMenuForReview.adminStatus}</Badge></p>
              <div className="mt-2">
                <Label htmlFor="adminNotesMenu">Admin Notes:</Label>
                <Textarea 
                  id="adminNotesMenu"
                  value={adminNotesForMenu}
                  onChange={(e) => setAdminNotesForMenu(e.target.value)}
                  placeholder="Internal notes for this menu..."
                  className="mt-1"
                  disabled={!isAdmin || !!isProcessingAction}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
               <DialogClose asChild>
                <Button type="button" variant="outline" disabled={!!isProcessingAction}>Close</Button>
              </DialogClose>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleApproveMenu(selectedMenuForReview.id)} variant="default" disabled={!isAdmin || !!isProcessingAction || selectedMenuForReview.adminStatus === 'approved'}>
                      {isProcessingAction === selectedMenuForReview.id && selectedMenuForReview.adminStatus === 'approved' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Approve
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleRejectMenu(selectedMenuForReview.id)} variant="destructive" disabled={!isAdmin || !!isProcessingAction || selectedMenuForReview.adminStatus === 'rejected'}>
                      {isProcessingAction === selectedMenuForReview.id && selectedMenuForReview.adminStatus === 'rejected' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Reject
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </DialogFooter>
          </MenuReviewDialogContent>
        </Dialog>
      )}

      <div className="mt-8 p-4 border-l-4 border-yellow-500 bg-yellow-500/10 rounded-md">
        <h4 className="font-semibold text-yellow-700">Development Note:</h4>
        <p className="text-sm text-yellow-600">
          Admin actions now update Firestore. Full admin functionality, including secure role-based access control (preventing non-admins from performing actions even if buttons were enabled via client-side manipulation),
          and detailed audit logs, requires robust backend logic and Firebase Security Rules that verify admin custom claims for write operations.
        </p>
      </div>
    </div>
  );
}
    
