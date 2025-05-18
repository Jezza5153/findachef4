
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ListChecks, UserCog, FileWarning, UserCheck, FileSearch2, BadgeCheck, MessageCircleWarning, Gavel, Award, MessageSquare, LockKeyhole, CalendarX2, UsersRound, Banknote, PauseCircle, Undo2, ClipboardCheck, FileCheck2, BotMessageSquare, ShieldBan, CreditCard, CalendarCheck2 as CalendarCheckIcon, Download, AlertTriangle, CalendarClock, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { ChefProfile, CustomerProfile } from '@/types';
import { format } from 'date-fns';

type UserView = Partial<ChefProfile & CustomerProfile>;

export default function AdminPage() {
  const [allUsers, setAllUsers] = useState<UserView[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedUsers = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
          } as UserView;
        });
        setAllUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        // In a real app, you'd handle this error more gracefully
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

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
    // { name: "View All Chefs & Customers", icon: <UsersRound className="mr-2 h-5 w-5 text-primary" /> }, // This is now implemented below
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
            Access is restricted.
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

      <Card className="shadow-lg">
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
                    <TableHead>Chef Subscribed</TableHead>
                    <TableHead>User ID</TableHead>
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
                          user.isApproved ? <Badge variant="default" className="bg-green-500 hover:bg-green-600">Yes</Badge> : <Badge variant="destructive">No</Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'chef' ? (
                           user.isSubscribed ? <Badge variant="default" className="bg-green-500 hover:bg-green-600">Yes</Badge> : <Badge variant="secondary">No</Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]" title={user.id}>{user.id?.substring(0, 10)}...</TableCell>
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
          This is a basic admin view. Full admin functionality, including secure role-based access control, user actions (approve, ban, etc.),
          and detailed logs, requires significant backend development and secure infrastructure.
        </p>
      </div>
    </div>
  );
}
