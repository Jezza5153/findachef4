import type { SVGProps } from 'react';
import Link from 'next/link';
import { ChefHat } from 'lucide-react';

interface LogoProps extends Omit<SVGProps<SVGSVGElement>, ' έτσι'> {
  href?: string;
  textClassName?: string;
}

export function Logo({ href = "/", className, textClassName, ...props }: LogoProps) {
  return (
    <Link href={href} className="flex items-center space-x-2">
      <ChefHat className={cn("h-8 w-8 text-primary", className)} {...props} />
      <span className={cn("text-2xl font-bold text-foreground", textClassName)}>
        CulinaryConnect
      </span>
    </Link>
  );
}

// Helper cn function (consider moving to lib/utils if not already there and used by other components)
// For this component, defining it locally to keep it self-contained as an example.
// In a real project, this would come from '@/lib/utils'.
function cn(...inputs: Array<string | undefined | null | false>) {
  return inputs.filter(Boolean).join(' ');
}
