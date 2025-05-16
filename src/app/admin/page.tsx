
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ListChecks, UserCog, FileWarning, UserCheck, FileSearch2, BadgeCheck, MessageCircleWarning, Gavel, Award, MessageSquare, LockKeyhole, CalendarX2, UsersRound, Banknote, PauseCircle, Undo2, ClipboardCheck, FileCheck2, BotMessageSquare, ShieldBan, CreditCard, CalendarCheck2 as CalendarCheckIcon, Download, AlertTriangle, CalendarClock } from 'lucide-react';

export default function AdminPage() {
  const adminFeatures = [
    { name: "Approve Co-hosted Events", description: "Confirm both chefs are approved and willing to collaborate on the event.", icon: <ClipboardCheck className="mr-2 h-5 w-5 text-purple-600" /> },
    { name: "Approve Menus", description: "Verify menu content, accurate pricing, no personal branding/links, and ensure chef identity remains hidden pre-booking.", icon: <ListChecks className="mr-2 h-5 w-5 text-green-600" /> },
    { name: "Approve post-event payouts (50% release)", description: "Confirm event is complete, customer hasn’t raised a dispute (48 hours post-event).", icon: <CreditCard className="mr-2 h-5 w-5 text-green-700" /> },
    { name: "Assign 'Trusted by FindAChef' Badge", description: "Manually assign to chefs with a proven track record. Not automated.", icon: <Award className="mr-2 h-5 w-5 text-amber-600" /> },
    { name: "Check for fake tags or exaggerated bios", description: "Ensure chef tags match their real experience.", icon: <BadgeCheck className="mr-2 h-5 w-5 text-teal-600" /> },
    { name: "Check receipt upload compliance", description: "Ensure receipts match event/menu tags. Required for post-event payout.", icon: <FileCheck2 className="mr-2 h-5 w-5 text-indigo-700" /> },
    { name: "Export Admin Audit Log", description: "Generate monthly PDF/CSV reports of all administrative actions for record-keeping.", icon: <Download className="mr-2 h-5 w-5 text-slate-500" /> },
    { name: "Freeze payments if dispute is raised", description: "Pause automatic release, investigate complaint.", icon: <ShieldBan className="mr-2 h-5 w-5 text-orange-700" /> },
    { name: "Issue refunds for cancelled events", description: "Apply refund rules (e.g., full refund if chef cancels <7 days before event, or 50% if customer cancels <30 days).", icon: <Undo2 className="mr-2 h-5 w-5 text-blue-700" /> },
    { name: "Manage Expired Requests Queue", description: "Handle stale or unresolved customer posts from The Wall. Delete after 14 days.", icon: <CalendarX2 className="mr-2 h-5 w-5 text-orange-600" /> },
    { name: "Manage Violations (Warnings, Penalties, Bans)", description: "Issue warnings for first offenses (15% fund deduction), enforce bans for second offenses.", icon: <Gavel className="mr-2 h-5 w-5 text-red-700" /> },
    { name: "Manually approve new chef accounts", description: "Check resume quality, no contact info, professionalism.", icon: <UserCheck className="mr-2 h-5 w-5 text-blue-600" /> },
    { name: "Moderate Reports (Chef Misconduct, Customer Fraud)", description: "Review user-submitted abuse reports daily. Handle reports of chef misconduct or customer fraud. Investigate and take appropriate action, especially immediate action if safety or fraud is involved. Record all conversation logs during disputes.", icon: <FileWarning className="mr-2 h-5 w-5 text-destructive" /> },
    { name: "Monitor active chat threads", description: "Look for off-platform contact attempts or spam.", icon: <MessageSquare className="mr-2 h-5 w-5 text-sky-600" /> },
    { name: "Monitor Event Conflict Alerts", description: "Review system-generated alerts for potential chef double-bookings or overbooking issues.", icon: <AlertTriangle className="mr-2 h-5 w-5 text-pink-600" /> },
    { name: "Oversee Automated Chat Locking", description: "Review and manage locks on conversation threads after bookings.", icon: <LockKeyhole className="mr-2 h-5 w-5 text-slate-600" /> },
    { name: "Review Flagged Messages (Contact Info, Unsafe Content)", description: "Review AI-flagged messages for off-platform contact attempts, unsafe content, or other policy violations.", icon: <MessageCircleWarning className="mr-2 h-5 w-5 text-destructive" /> },
    { name: "Review GPT resume parse accuracy", description: "Fix any resume to tag mismatches.", icon: <BotMessageSquare className="mr-2 h-5 w-5 text-indigo-600" /> },
    { name: "Review Published Chef Events", description: "Ensure event details on The Chef's Wall are clear, fair, and not duplicated.", icon: <CalendarCheckIcon className="mr-2 h-5 w-5 text-cyan-600" /> },
    { name: "Trust Score Override", description: "Monitor and, if necessary, manually override auto-generated chef trust scores based on platform activity, ratings, and warnings.", icon: <ShieldAlert className="mr-2 h-5 w-5 text-yellow-600" /> },
    { name: "View All Chefs & Customers", icon: <UsersRound className="mr-2 h-5 w-5 text-primary" /> },
    { name: "View Flagged Resumes (Contact Info, Unsafe Content)", description: "Review resumes, especially those AI-flagged for containing direct contact information or inappropriate content.", icon: <FileSearch2 className="mr-2 h-5 w-5 text-destructive" /> },
  ];

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
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

          <div className="mt-8 p-4 border-l-4 border-yellow-500 bg-yellow-500/10 rounded-md">
            <h4 className="font-semibold text-yellow-700">Development Note:</h4>
            <p className="text-sm text-yellow-600">
              This is a placeholder page. Full admin functionality, including authentication, data management, moderation queues, and action logs, 
              requires significant backend development and secure access controls.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
