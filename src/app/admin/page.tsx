
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, ListChecks, UserCog, FileWarning, UserCheck, FileSearch2, BadgeCheck, MessageCircleWarning, Gavel, Award, MessageSquare, LockKeyhole, CalendarX2, UsersRound, Banknote, PauseCircle, Undo2, ClipboardCheck, FileCheck2, BotMessageSquare, ShieldBan, CreditCard, CalendarCheck2 as CalendarCheckIcon, Download, AlertTriangle, CalendarClock, Loader2, Utensils, CheckCircle, XCircle, Send, Eye } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, Timestamp, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Menu, CustomerRequest, RequestMessage, AppUserProfileContext, ChefProfile } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';


type UserView = AppUserProfileContext;

export default function AdminPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [allUsers, setAllUsers] = useState<UserView[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [allCustomerRequests, setAllCustomerRequests] = useState<CustomerRequest[]>([]);
  const [isLoadingCustomerRequests, setIsLoadingCustomerRequests] = useState(true);
  
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [isRequestDetailsDialogOpen, setIsRequestDetailsDialogOpen] = useState(false);
  const [selectedRequestForAdminView, setSelectedRequestForAdminView] = useState<CustomerRequest | null>(null);
  const [requestMessagesForAdminView, setRequestMessagesForAdminView] = useState<RequestMessage[]>([]);
  const [isLoadingRequestMessages, setIsLoadingRequestMessages] = useState(false);
  const [adminNotesForRequest, setAdminNotesForRequest] = useState('');

  const [isMenuReviewDialogOpen, setIsMenuReviewDialogOpen] = useState(false);
  const [selectedMenuForReview, setSelectedMenuForReview] = useState<Menu | null>(null);
  const [adminNotesForMenu, setAdminNotesForMenu] = useState('');


  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoadingUsers(true);
      try {
        const usersCollectionRef = collection(db, "users");
        const usersQuery = query(usersCollectionRef, orderBy("createdAt", "desc"));
        const usersSnapshot = await getDocs(usersQuery);
        const fetchedUsers = usersSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          } as UserView;
        });
        setAllUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      } finally {
        setIsLoadingUsers(false);
      }

      setIsLoadingMenus(true);
      try {
        const menusCollectionRef = collection(db, "menus");
        const menusQuery = query(menusCollectionRef, orderBy("createdAt", "desc"));
        const menusSnapshot = await getDocs(menusQuery);
        const fetchedMenus = menusSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            adminStatus: data.adminStatus || 'pending',
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
          } as Menu;
        });
        setAllMenus(fetchedMenus);
      } catch (error) {
        console.error("Error fetching menus:", error);
        toast({ title: "Error", description: "Could not fetch menus.", variant: "destructive" });
      } finally {
        setIsLoadingMenus(false);
      }

      setIsLoadingCustomerRequests(true);
      try {
        const requestsCollectionRef = collection(db, "customerRequests");
        const requestsQuery = query(requestsCollectionRef, orderBy("createdAt", "desc"));
        const requestsSnapshot = await getDocs(requestsQuery);
        const fetchedRequests = requestsSnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate as any),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          } as CustomerRequest;
        });
        setAllCustomerRequests(fetchedRequests);
      } catch (error) {
        console.error("Error fetching customer requests:", error);
        toast({ title: "Error", description: "Could not fetch customer requests.", variant: "destructive" });
      } finally {
        setIsLoadingCustomerRequests(false);
      }
    };
    fetchAdminData();
  }, [toast]);

  const handleApproveUser = async (userId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", variant: "destructive" }); return; }
    setIsProcessingAction(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isApproved: true, updatedAt: serverTimestamp() });
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, isApproved: true } : u));
      toast({ title: "Chef Approved", description: `Chef with ID ${userId.substring(0, 6)}... has been approved.` });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({ title: "Error", description: "Could not approve chef.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", variant: "destructive" }); return; }
    setIsProcessingAction(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isApproved: false, updatedAt: serverTimestamp() }); // Example: just unapprove
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, isApproved: false } : u));
      toast({ title: "Chef Rejected", description: `Chef ID ${userId.substring(0, 6)}... status updated to not approved.` });
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({ title: "Error", description: "Could not process rejection for chef.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleApproveMenu = async (menuId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", variant: "destructive" }); return; }
    setIsProcessingAction(true);
    try {
      const menuDocRef = doc(db, "menus", menuId);
      await updateDoc(menuDocRef, { adminStatus: 'approved', adminNotes: adminNotesForMenu || '', updatedAt: serverTimestamp() });
      setAllMenus(prevMenus => prevMenus.map(m => m.id === menuId ? { ...m, adminStatus: 'approved', adminNotes: adminNotesForMenu || '' } : m));
      toast({ title: "Menu Approved", description: `Menu ID ${menuId.substring(0, 6)}... has been approved.` });
      setIsMenuReviewDialogOpen(false);
      setAdminNotesForMenu('');
    } catch (error) {
      console.error("Error approving menu:", error);
      toast({ title: "Error", description: "Could not approve menu.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectMenu = async (menuId: string) => {
    if (!isAdmin) { toast({ title: "Permission Denied", variant: "destructive" }); return; }
    setIsProcessingAction(true);
    try {
      const menuDocRef = doc(db, "menus", menuId);
      await updateDoc(menuDocRef, { adminStatus: 'rejected', adminNotes: adminNotesForMenu || 'Rejected by admin.', updatedAt: serverTimestamp() });
      setAllMenus(prevMenus => prevMenus.map(m => m.id === menuId ? { ...m, adminStatus: 'rejected', adminNotes: adminNotesForMenu || 'Rejected by admin.' } : m));
      toast({ title: "Menu Rejected", description: `Menu ID ${menuId.substring(0, 6)}... has been rejected.` });
      setIsMenuReviewDialogOpen(false);
      setAdminNotesForMenu('');
    } catch (error) {
      console.error("Error rejecting menu:", error);
      toast({ title: "Error", description: "Could not reject menu.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleViewRequestDetails = async (request: CustomerRequest) => {
    setSelectedRequestForAdminView(request);
    setAdminNotesForRequest(request.adminNotes || '');
    setIsRequestDetailsDialogOpen(true);
    setIsLoadingRequestMessages(true);
    setRequestMessagesForAdminView([]); // Clear previous messages
    try {
      const messagesCollectionRef = collection(db, "customerRequests", request.id, "messages");
      const qMessages = query(messagesCollectionRef, orderBy("timestamp", "asc"));
      const messagesSnapshot = await getDocs(qMessages);
      const fetchedMessages = messagesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp as any)
        } as RequestMessage;
      });
      setRequestMessagesForAdminView(fetchedMessages);
    } catch (error) {
      console.error("Error fetching messages for request:", error);
      toast({ title: "Error", description: "Could not fetch messages for this request.", variant: "destructive" });
    } finally {
      setIsLoadingRequestMessages(false);
    }
  };
  
  const handleModerateRequest = async (requestId: string, action: CustomerRequest['moderationStatus']) => {
    if (!isAdmin) { toast({ title: "Permission Denied", variant: "destructive" }); return; }
    setIsProcessingAction(true);
    try {
      const requestDocRef = doc(db, "customerRequests", requestId);
      await updateDoc(requestDocRef, { 
        moderationStatus: action, 
        adminNotes: adminNotesForRequest,
        updatedAt: serverTimestamp() 
      });
      setAllCustomerRequests(prevReqs => prevReqs.map(r => r.id === requestId ? {...r, moderationStatus: action, adminNotes: adminNotesForRequest} : r));
      toast({ title: "Moderation Action Taken", description: `Request ${requestId.substring(0,6)}... status updated to ${action}.` });
      setIsRequestDetailsDialogOpen(false);
    } catch (error) {
      console.error("Error moderating request:", error);
      toast({ title: "Moderation Error", description: "Could not update request moderation status.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleOpenMenuReviewDialog = (menu: Menu) => {
    setSelectedMenuForReview(menu);
    setAdminNotesForMenu(menu.adminNotes || '');
    setIsMenuReviewDialogOpen(true);
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
                    <TableHead>Joined</TableHead>
                    <TableHead>Chef Approved</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'chef' ? 'default' : (user.role === 'admin' ? 'destructive' : 'secondary')} className="capitalize">
                          {user.role || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? format(new Date(user.createdAt), 'PP') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {user.role === 'chef' ? (
                          (user as ChefProfile).isApproved ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Approved</Badge>
                          ) : (
                            <Badge variant="destructive">Pending</Badge>
                          )
                        ) : (
                          'N/A'
                        )}
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
                                    disabled={!isAdmin || isProcessingAction}
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1"
                                  >
                                    {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
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
                                    disabled={!isAdmin || isProcessingAction}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1"
                                  >
                                    {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                    <span className="ml-1">Reject</span>
                                  </Button>
                                </TooltipTrigger>
                                {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        )}
                        {user.role === 'chef' && (user as ChefProfile).isApproved && (
                          <span className="text-xs text-muted-foreground">No actions</span>
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
                        <Badge variant={menu.isPublic ? 'default' : 'secondary'}>
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
                          className={
                            menu.adminStatus === 'approved' ? 'bg-green-500 hover:bg-green-600' :
                              menu.adminStatus === 'rejected' ? '' : ''
                          }
                        >
                          {menu.adminStatus?.charAt(0).toUpperCase() + menu.adminStatus?.slice(1) || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Button variant="outline" size="sm" onClick={() => handleOpenMenuReviewDialog(menu)} className="text-xs">
                           <Eye className="h-3 w-3 mr-1"/> Review
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCustomerRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.id.substring(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{request.eventType}</TableCell>
                      <TableCell className="text-xs">{request.customerId.substring(0, 8)}...</TableCell>
                      <TableCell>{format(new Date(request.eventDate as any), 'PP')}</TableCell>
                      <TableCell className="text-right">{request.pax}</TableCell>
                      <TableCell className="text-right">${request.budget.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          request.status === 'booked' || request.status === 'customer_confirmed' ? 'default' :
                            request.status === 'cancelled_by_customer' || request.status === 'chef_declined' || request.status === 'proposal_declined' ? 'destructive' :
                              'secondary'
                        } className="capitalize">
                          {request.status?.replace(/_/g, ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleViewRequestDetails(request)} className="text-xs">
                          <Eye className="h-3 w-3 mr-1"/> View/Moderate
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

      {/* Dialog for Viewing/Moderating Customer Request */}
      {selectedRequestForAdminView && (
        <AlertDialog open={isRequestDetailsDialogOpen} onOpenChange={setIsRequestDetailsDialogOpen}>
          <AlertDialogContent className="sm:max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>View Customer Request Details - ID: {selectedRequestForAdminView.id.substring(0,8)}...</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
              <h4 className="font-semibold">Request Information:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><strong>Event Type:</strong> {selectedRequestForAdminView.eventType}</p>
                <p><strong>Customer ID:</strong> <span className="font-mono text-xs">{selectedRequestForAdminView.customerId}</span></p>
                <p><strong>Event Date:</strong> {format(new Date(selectedRequestForAdminView.eventDate as any), 'PPP')}</p>
                <p><strong>PAX:</strong> {selectedRequestForAdminView.pax}</p>
                <p><strong>Budget:</strong> ${selectedRequestForAdminView.budget.toFixed(2)}</p>
                <p><strong>Cuisine:</strong> {selectedRequestForAdminView.cuisinePreference}</p>
                <p><strong>Status:</strong> <Badge variant={selectedRequestForAdminView.status === 'booked' ? 'default' : 'secondary'} className="capitalize">{selectedRequestForAdminView.status?.replace(/_/g, ' ') || 'Unknown'}</Badge></p>
                {selectedRequestForAdminView.location && <p className="col-span-2"><strong>Location:</strong> {selectedRequestForAdminView.location}</p>}
                {selectedRequestForAdminView.notes && <p className="col-span-2"><strong>Notes:</strong> {selectedRequestForAdminView.notes}</p>}
              </div>
              <div className="mt-2">
                <Label htmlFor="adminNotesRequest">Admin Notes:</Label>
                <Textarea 
                  id="adminNotesRequest"
                  value={adminNotesForRequest}
                  onChange={(e) => setAdminNotesForRequest(e.target.value)}
                  placeholder="Internal notes for this request..."
                  className="mt-1"
                  disabled={!isAdmin || isProcessingAction}
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
                      <p className="text-right text-muted-foreground/70 text-[10px]">{format(new Date(msg.timestamp as any), 'PP p')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No messages for this request.</p>
              )}
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={isProcessingAction}>Close</AlertDialogCancel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleModerateRequest(selectedRequestForAdminView.id, 'resolved')} variant="default" disabled={!isAdmin || isProcessingAction}>
                      {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Mark as Resolved
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleModerateRequest(selectedRequestForAdminView.id, 'customer_warned')} variant="outline" disabled={!isAdmin || isProcessingAction}>
                      {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Warn Customer
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleModerateRequest(selectedRequestForAdminView.id, 'customer_suspended')} variant="destructive" disabled={!isAdmin || isProcessingAction}>
                      {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Suspend Customer
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialog for Reviewing Menu */}
      {selectedMenuForReview && (
        <AlertDialog open={isMenuReviewDialogOpen} onOpenChange={setIsMenuReviewDialogOpen}>
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Review Menu: {selectedMenuForReview.title}</AlertDialogTitle>
              {selectedMenuForReview.imageUrl && (
                <div className="my-2 rounded-md overflow-hidden aspect-video relative">
                  <Image src={selectedMenuForReview.imageUrl} alt={selectedMenuForReview.title} layout="fill" objectFit="cover" data-ai-hint={selectedMenuForReview.dataAiHint || "menu food item"} />
                </div>
              )}
            </AlertDialogHeader>
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
              <p><strong>Current Status:</strong> <Badge variant={selectedMenuForReview.adminStatus === 'approved' ? 'default' : (selectedMenuForReview.adminStatus === 'rejected' ? 'destructive' : 'secondary')} className="capitalize">{selectedMenuForReview.adminStatus}</Badge></p>
              <div className="mt-2">
                <Label htmlFor="adminNotesMenu">Admin Notes:</Label>
                <Textarea 
                  id="adminNotesMenu"
                  value={adminNotesForMenu}
                  onChange={(e) => setAdminNotesForMenu(e.target.value)}
                  placeholder="Internal notes for this menu..."
                  className="mt-1"
                  disabled={!isAdmin || isProcessingAction}
                />
              </div>
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={isProcessingAction}>Close</AlertDialogCancel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleApproveMenu(selectedMenuForReview.id)} variant="default" disabled={!isAdmin || isProcessingAction || selectedMenuForReview.adminStatus === 'approved'}>
                      {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Approve
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => handleRejectMenu(selectedMenuForReview.id)} variant="destructive" disabled={!isAdmin || isProcessingAction || selectedMenuForReview.adminStatus === 'rejected'}>
                      {isProcessingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Reject
                    </Button>
                  </TooltipTrigger>
                  {!isAdmin && <TooltipContent><p>Admin privileges required.</p></TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

