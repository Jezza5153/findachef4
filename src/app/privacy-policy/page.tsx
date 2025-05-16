
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
          <CardDescription className="text-lg">
            Your privacy is important to us at FindAChef.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-foreground/80">
          <p>
            <strong>Last Updated: {new Date().toLocaleDateString()}</strong>
          </p>
          <p>
            This is a placeholder for FindAChef's Privacy Policy. In a real application, this page would detail:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>What information we collect (e.g., personal details, resume data, usage data).</li>
            <li>How we use the information (e.g., to provide services, improve the platform, for communication).</li>
            <li>How we share information (e.g., with chefs/customers during bookings, with service providers).</li>
            <li>Data security measures in place.</li>
            <li>User rights regarding their data (access, correction, deletion).</li>
            <li>Cookie policy and tracking technologies.</li>
            <li>Information specific to chefs and customers.</li>
            <li>Data retention policies (e.g., data stored for 12 months after last activity unless a deletion request is processed).</li>
            <li>Contact information for privacy-related inquiries.</li>
          </ul>
          <p>
            We are committed to protecting your personal information and ensuring transparency in how we handle it.
            Please check back for the full Privacy Policy.
          </p>
          <p>
            If you have any immediate questions, please contact us at privacy@findachef.com (placeholder email).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    