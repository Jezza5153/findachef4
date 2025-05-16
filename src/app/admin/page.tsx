
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ListChecks, UserCog, FileWarning, UserCheck, FileSearch2, BadgeCheck, MessageCircleWarning, Gavel, Award } from 'lucide-react';

export default function AdminPage() {
  const adminFeatures = [
    { name: "View All Chefs & Customers", icon: <UserCog className="mr-2 h-5 w-5 text-primary" /> },
    { name: "Manually approve new chef accounts", description: "Check resume quality, no contact info, professionalism.", icon: <UserCheck className="mr-2 h-5 w-5 text-blue-600" /> },
    { name: "Approve Menus", icon: <ListChecks className="mr-2 h-5 w-5 text-green-600" /> },
    { name: "Review GPT resume parse accuracy", description: "Fix any resume to tag mismatches.", icon: <FileSearch2 className="mr-2 h-5 w-5 text-indigo-600" /> },
    { name: "Check for fake tags or exaggerated bios", description: "Ensure chef tags match their real experience.", icon: <BadgeCheck className="mr-2 h-5 w-5 text-teal-600" /> },
    { name: "Review Flagged Messages (Contact Info, Unsafe Content)", icon: <MessageCircleWarning className="mr-2 h-5 w-5 text-destructive" /> },
    { name: "Manage Violations (Warnings, Penalties, Bans)", icon: <Gavel className="mr-2 h-5 w-5 text-red-700" /> },
    { name: "Moderate Reports (Chef Misconduct, Customer Fraud)", icon: <FileWarning className="mr-2 h-5 w-5 text-destructive" /> },
    { name: "Assign 'Trusted by FindAChef' Badge", icon: <Award className="mr-2 h-5 w-5 text-amber-600" /> },
    { name: "Trust Score Override", icon: <ShieldAlert className="mr-2 h-5 w-5 text-yellow-600" /> },
    { name: "View Flagged Resumes (Contact Info, Unsafe Content)", icon: <FileWarning className="mr-2 h-5 w-5 text-destructive" /> },
  ];

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert className="h-8 w-8" />
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
              {adminFeatures.map((feature) => (
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
