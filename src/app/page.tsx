import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, DollarSign, Lock, ShieldCheck, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Testimonial } from '@/types';

const benefits = [
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: 'Verified Chefs',
    description: 'Access a curated network of professional chefs with verified credentials and experience.',
  },
  {
    icon: <Lock className="h-10 w-10 text-primary" />,
    title: 'Secure Payments',
    description: 'Enjoy peace of mind with our secure in-app payment system for all bookings.',
  },
  {
    icon: <Users className="h-10 w-10 text-primary" />,
    title: 'Chef-Hosted Events',
    description: 'Discover unique culinary events hosted by our talented chefs, or book them for your own.',
  },
  {
    icon: <DollarSign className="h-10 w-10 text-primary" />,
    title: 'Transparent Pricing',
    description: 'Clear, upfront pricing for menus and services. No hidden fees.',
  }
];

const testimonials: Testimonial[] = [
  {
    id: '1',
    customerName: 'Sarah L.',
    text: "CulinaryConnect made finding a chef for my anniversary dinner so easy! The food was incredible, and the whole process was seamless.",
    eventName: 'Anniversary Dinner',
    avatarUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '2',
    customerName: 'John B.',
    text: "As a chef, this platform has opened up so many new opportunities for me. The booking system is fantastic.",
    eventName: 'Chef User',
    avatarUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '3',
    customerName: 'Maria G.',
    text: "We booked a chef for a corporate event, and everyone was impressed. Highly recommend CulinaryConnect!",
    eventName: 'Corporate Event',
    avatarUrl: 'https://placehold.co/100x100.png',
  }
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-br from-amber-100 via-beige-50 to-orange-100">
        <div className="absolute inset-0">
            <Image 
              src="https://placehold.co/1920x1080.png" 
              alt="Gourmet food platter" 
              layout="fill" 
              objectFit="cover" 
              className="opacity-20"
              data-ai-hint="gourmet food"
            />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            <span className="block">Discover Your Next</span>
            <span className="block text-primary">Culinary Experience</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-foreground/80 sm:text-xl md:text-2xl">
            Connect with talented independent chefs for any occasion. Book private chefs, explore unique menus, or join exclusive chef-hosted events.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button asChild size="lg" className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/customer/menus">Find a Chef</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-4 border-primary text-primary hover:bg-primary/10">
              <Link href="/chef/signup">Become a Chef</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Platform Benefits Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Why Choose CulinaryConnect?</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
              We provide a seamless, secure, and inspiring platform for all your culinary needs.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="items-center">
                  {benefit.icon}
                  <CardTitle className="mt-4 text-xl font-semibold">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/70">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Simple Steps to Culinary Delights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4 text-2xl font-bold w-16 h-16 flex items-center justify-center">1</div>
              <h3 className="text-xl font-semibold mb-2">Discover & Connect</h3>
              <p className="text-foreground/70">Browse chef profiles and menus, or post your event request. Chefs can showcase their talents and find new clients.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4 text-2xl font-bold w-16 h-16 flex items-center justify-center">2</div>
              <h3 className="text-xl font-semibold mb-2">Collaborate & Plan</h3>
              <p className="text-foreground/70">Use our secure messaging to discuss details, customize menus, and finalize arrangements with ease.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4 text-2xl font-bold w-16 h-16 flex items-center justify-center">3</div>
              <h3 className="text-xl font-semibold mb-2">Book & Enjoy</h3>
              <p className="text-foreground/70">Confirm bookings through our secure platform. Relax and savor an unforgettable culinary experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section (Placeholder) */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Loved by Chefs and Customers</h2>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="flex flex-col shadow-lg">
                <CardContent className="pt-6 flex-grow">
                  <p className="text-foreground/80 italic">"{testimonial.text}"</p>
                </CardContent>
                <CardHeader className="flex flex-row items-center space-x-4 pt-4 mt-auto">
                  <Image 
                    src={testimonial.avatarUrl!} 
                    alt={testimonial.customerName} 
                    width={50} 
                    height={50} 
                    className="rounded-full"
                    data-ai-hint="person avatar"
                  />
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.customerName}</p>
                    <p className="text-sm text-foreground/60">{testimonial.eventName}</p>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-primary/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Ready to Get Started?</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
            Join CulinaryConnect today and elevate your dining experiences or showcase your culinary talents.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button asChild size="lg" className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/customer/menus">Explore Menus</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-4 border-primary text-primary hover:bg-primary/10">
              <Link href="/chef/signup">Join as a Chef</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
