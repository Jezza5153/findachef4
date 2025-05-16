
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ListChecks, UserCog, FileWarning } from 'lucide-react';

export default function AdminPage() {
  const adminFeatures = [
    { name: "View All Chefs & Customers", icon: <UserCog className="mr-2 h-5 w-5 text-primary" /> },
    { name: "Approve New Chefs", icon: <ListChecks className="mr-2 h-5 w-5 text-green-600" /> },
    { name: "Approve Menus", icon: <ListChecks className="mr-2 h-5 w-5 text-green-600" /> },
    { name: "Moderate Reports (Chef Misconduct, Customer Fraud)", icon: <FileWarning className="mr-2 h-5 w-5 text-destructive" /> },
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
            Platform moderation and management tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This area is for platform administrators to manage users, content, and ensure the smooth operation of FindAChef.
            Access is restricted.
          </p>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Intended Features:</h3>
            <ul className="space-y-3">
              {adminFeatures.map((feature) => (
                <li key={feature.name} className="flex items-center text-foreground/90 p-3 bg-muted/30 rounded-md shadow-sm">
                  {feature.icon}
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 p-4 border-l-4 border-yellow-500 bg-yellow-500/10 rounded-md">
            <h4 className="font-semibold text-yellow-700">Development Note:</h4>
            <p className="text-sm text-yellow-600">
              This is a placeholder page. Full admin functionality, including authentication and data management, 
              requires significant backend development and secure access controls.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
