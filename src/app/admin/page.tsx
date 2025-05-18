
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ListChecks, UserCog, FileWarning, UserCheck, FileSearch2, BadgeCheck, MessageCircleWarning, Gavel, Award, MessageSquare, LockKeyhole, CalendarX2, UsersRound, Banknote, PauseCircle, Undo2, ClipboardCheck, FileCheck2, BotMessageSquare, ShieldBan, CreditCard, CalendarCheck2 as CalendarCheckIcon, Download, AlertTriangle, CalendarClock, Loader2, Utensils, CheckCircle, XCircle, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, Timestamp, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { ChefProfile, CustomerProfile, Menu, CustomerRequest } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type UserView = Partial<ChefProfile & CustomerProfile>; // Allows mixing fields from both

export default function AdminPage() {
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<UserView[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [allCustomerRequests, setAllCustomerRequests] = useState<CustomerRequest[]>([]);
  const [isLoadingCustomerRequests, setIsLoadingCustomerRequests] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);


  useEffect(() => {
    const fetchAdminData = async () => {
      // Fetch Users
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

      // Fetch Menus
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

      // Fetch Customer Requests
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
            eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate),
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
    setIsProcessingAction(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isApproved: true, updatedAt: serverTimestamp() });
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, isApproved: true } : u));
      toast({ title: "Chef Approved", description: `Chef with ID ${userId.substring(0,6)}... has been approved.` });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({ title: "Error", description: "Could not approve chef.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setIsProcessingAction(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isApproved: false, updatedAt: serverTimestamp() }); 
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, isApproved: false } : u));
      toast({ title: "Chef Rejected (Conceptual)", description: `Chef ID ${userId.substring(0,6)}... action noted.` });
    } catch (error) {
       console.error("Error conceptually rejecting user:", error);
      toast({ title: "Error", description: "Could not process rejection for chef.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleApproveMenu = async (menuId: string) => {
    setIsProcessingAction(true);
    try {
      const menuDocRef = doc(db, "menus", menuId);
      await updateDoc(menuDocRef, { adminStatus: 'approved', updatedAt: serverTimestamp() });
      setAllMenus(prevMenus => prevMenus.map(m => m.id === menuId ? { ...m, adminStatus: 'approved' } : m));
      toast({ title: "Menu Approved", description: `Menu ID ${menuId.substring(0,6)}... has been approved.` });
    } catch (error) {
      console.error("Error approving menu:", error);
      toast({ title: "Error", description: "Could not approve menu.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectMenu = async (menuId: string) => {
    setIsProcessingAction(true);
    try {
      const menuDocRef = doc(db, "menus", menuId);
      await updateDoc(menuDocRef, { adminStatus: 'rejected', updatedAt: serverTimestamp() });
      setAllMenus(prevMenus => prevMenus.map(m => m.id === menuId ? { ...m, adminStatus: 'rejected' } : m));
      toast({ title: "Menu Rejected", description: `Menu ID ${menuId.substring(0,6)}... has been rejected.` });
    } catch (error) {
      console.error("Error rejecting menu:", error);
      toast({ title: "Error", description: "Could not reject menu.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
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

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg mb-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCog className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Admin Dashboard</CardTitle>
          <CardDescription className="text-lg">
            Platform moderation, user management, and quality control tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This area is for platform administrators to manage users, content, and ensure the smooth operation of FindAChef.
            Access is restricted. (Note: True role-based access control requires backend implementation).
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
          <CardTitle className="flex items-center"><UsersRound className="mr-2 h-6 w-6 text-primary"/> All Platform Users</CardTitle>
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
                        <Badge variant={user.role === 'chef' ? 'default' : 'secondary'} className="capitalize">
                          {user.role || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt ? format(user.createdAt, 'PP') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {user.role === 'chef' ? (
                          user.isApproved ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Approved</Badge>
                          ) : (
                            <Badge variant="destructive">Pending</Badge>
                          )
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'chef' && !user.isApproved && (
                          <div className="flex space-x-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApproveUser(user.id!)}
                              disabled={isProcessingAction}
                              className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1"
                            >
                              {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-3 w-3"/>}
                              <span className="ml-1">Approve</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleRejectUser(user.id!)}
                              disabled={isProcessingAction}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1"
                            >
                             {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <XCircle className="h-3 w-3"/>}
                             <span className="ml-1">Reject</span>
                            </Button>
                          </div>
                        )}
                         {user.role === 'chef' && user.isApproved && (
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
          <CardTitle className="flex items-center"><Utensils className="mr-2 h-6 w-6 text-primary"/> All Platform Menus</CardTitle>
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
                        {menu.adminStatus === 'pending' && (
                           <div className="flex space-x-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApproveMenu(menu.id)}
                              disabled={isProcessingAction}
                              className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1"
                            >
                              {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle className="h-3 w-3"/>}
                              <span className="ml-1">Approve</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleRejectMenu(menu.id)}
                              disabled={isProcessingAction}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1"
                            >
                              {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin"/> : <XCircle className="h-3 w-3"/>}
                              <span className="ml-1">Reject</span>
                            </Button>
                          </div>
                        )}
                        {menu.adminStatus !== 'pending' && (
                           <Button variant="outline" size="sm" onClick={() => alert(`Viewing menu: ${menu.title}`)} className="text-xs">
                             View
                           </Button>
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Send className="mr-2 h-6 w-6 text-primary"/> All Customer Requests</CardTitle>
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
                      <TableCell className="font-mono text-xs">{request.id.substring(0,8)}...</TableCell>
                      <TableCell className="font-medium">{request.eventType}</TableCell>
                      <TableCell className="text-xs">{request.customerId.substring(0,8)}...</TableCell>
                      <TableCell>{format(request.eventDate, 'PP')}</TableCell>
                      <TableCell className="text-right">{request.pax}</TableCell>
                      <TableCell className="text-right">${request.budget.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                            request.status === 'booked' || request.status === 'customer_confirmed' ? 'default' :
                            request.status === 'cancelled_by_customer' || request.status === 'chef_declined' ? 'destructive' :
                            'secondary'
                        } className="capitalize">
                            {request.status?.replace(/_/g, ' ') || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Button variant="outline" size="sm" onClick={() => alert(`Viewing request: ${request.id}`)} className="text-xs">
                           View/Moderate
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


      <div className="mt-8 p-4 border-l-4 border-yellow-500 bg-yellow-500/10 rounded-md">
        <h4 className="font-semibold text-yellow-700">Development Note:</h4>
        <p className="text-sm text-yellow-600">
          Admin actions now update Firestore. Full admin functionality, including secure role-based access control (preventing non-admins from viewing this page or performing actions),
          and detailed logs, requires significant backend development and secure infrastructure (e.g., Firebase Auth custom claims for admin roles).
        </p>
      </div>
    </div>
  );
}
