'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, MessagesSquare, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Testimonial } from '@/types';

// Dummy data for home preview (not real dashboard links!)
const sampleMenus = [
  {
    id: '1',
    title: 'Mediterranean Feast',
    chef: 'Chef Luca',
    image: '/menus/mediterranean.jpg',
    shortDescription: 'Classic Mediterranean menu with fresh seafood and salads.',
  },
  {
    id: '2',
    title: 'Japanese Kaiseki',
    chef: 'Chef Hana',
    image: '/menus/kaiseki.jpg',
    shortDescription: 'Elegant Japanese multi-course meal using local produce.',
  },
  {
    id: '3',
    title: 'Vegan Banquet',
    chef: 'Chef Nadia',
    image: '/menus/vegan.jpg',
    shortDescription: 'Plant-based, seasonal, and sustainable.',
  },
];

const sampleEvents = [
  {
    id: '1',
    name: 'Autumn Tasting Night',
    chef: 'Chef Luca',
    date: '2025-06-15',
    image: '/events/autumn.jpg',
    shortDescription: 'Seasonal tasting menu with paired wines.',
  },
  {
    id: '2',
    name: 'Plant-Based Picnic',
    chef: 'Chef Nadia',
    date: '2025-06-21',
    image: '/events/vegan-picnic.jpg',
    shortDescription: 'Outdoor vegan event for families.',
  },
  {
    id: '3',
    name: 'Chef’s Table: Umami Edition',
    chef: 'Chef Hana',
    date: '2025-07-03',
    image: '/events/umami.jpg',
    shortDescription: 'Exclusive chef’s table event, limited seats.',
  },
];

const testimonials: Testimonial[] = [
  {
    name: "Jane D.",
    text: "I booked Chef Luca for a private dinner and everything was incredible—simple and secure.",
    chef: "Chef Luca",
    image: "/chefs/chef-luca.jpg",
  },
  {
    name: "Mark S.",
    text: "Love the platform! It’s so easy to connect with real chefs and organize events.",
    chef: "Chef Nadia",
    image: "/chefs/chef-nadia.jpg",
  },
];

const benefits = [
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: 'Verified Chefs',
    description: 'A curated network of real, professional chefs with verified credentials and experience.',
  },
  {
    icon: <MessagesSquare className="h-10 w-10 text-primary" />,
    title: 'Easy Chat & Booking',
    description: 'Chat with chefs and book directly through the platform—no third-party hassle.',
  },
  {
    icon: <Lock className="h-10 w-10 text-primary" />,
    title: 'Secure Payments',
    description: 'Your payments are protected. Our trust system keeps all parties accountable.',
  },
];

const HomePage: React.FC = () => (
  <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
    {/* Hero Section */}
    <section className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-10">
      <div className="flex-1 flex flex-col items-start gap-6">
        <h1 className="text-4xl md:text-6xl font-bold text-primary mb-2">
          Book a Local Chef or Discover Menus for Any Occasion
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-6">
          Find, chat with, and book professional chefs for private events, parties, or special occasions—all in one secure platform.
        </p>
        {/* DO NOT CHANGE THIS: Role-choice logic is original */}
        <div className="flex gap-4">
          <Link href="/chef/signup">
            <Button className="px-8 py-4 text-lg">
              I am a Chef
            </Button>
          </Link>
          <Link href="/customer/signup">
            <Button variant="outline" className="px-8 py-4 text-lg">
              I am a Customer
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="px-8 py-4 text-lg">
              Login
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex-1 flex justify-center">
        <Image
          src="/hero-chef.png"
          alt="Chef cooking"
          width={420}
          height={380}
          className="rounded-2xl shadow-lg object-cover"
          priority
        />
      </div>
    </section>

    {/* Recent Menus */}
    <section className="w-full max-w-5xl mt-20">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">Recent Menus</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {sampleMenus.map((menu) => (
          <Card key={menu.id} className="flex flex-col items-center py-6">
            <CardHeader className="flex flex-col items-center">
              <Image
                src={menu.image}
                alt={menu.title}
                width={110}
                height={80}
                className="rounded-lg mb-2 object-cover"
              />
              <CardTitle className="text-lg font-bold">{menu.title}</CardTitle>
              <span className="text-sm text-muted-foreground">{menu.chef}</span>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">{menu.shortDescription}</p>
              {/* No detail button for preview */}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* Recent Events */}
    <section className="w-full max-w-5xl mt-16">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">Upcoming Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {sampleEvents.map((event) => (
          <Card key={event.id} className="flex flex-col items-center py-6">
            <CardHeader className="flex flex-col items-center">
              <Image
                src={event.image}
                alt={event.name}
                width={110}
                height={80}
                className="rounded-lg mb-2 object-cover"
              />
              <CardTitle className="text-lg font-bold">{event.name}</CardTitle>
              <span className="text-sm text-muted-foreground">{event.chef}</span>
              <span className="text-xs text-muted-foreground">{event.date}</span>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">{event.shortDescription}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* Benefits */}
    <section className="w-full max-w-5xl mt-20 flex flex-col items-center">
      <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">Why FindAChef?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {benefits.map((benefit, idx) => (
          <Card key={idx} className="flex flex-col items-center py-8">
            <CardHeader>
              <div className="flex justify-center mb-2">{benefit.icon}</div>
              <CardTitle className="text-xl font-bold">{benefit.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">{benefit.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* Testimonials */}
    <section className="w-full max-w-5xl mt-24">
      <h2 className="text-2xl md:text-3xl font-semibold mb-8 text-center">What Customers Say</h2>
      <div className="flex flex-col md:flex-row gap-8">
        {testimonials.map((t, idx) => (
          <Card key={idx} className="flex-1">
            <CardHeader className="flex flex-row items-center gap-4">
              <Image
                src={t.image}
                alt={t.chef}
                width={48}
                height={48}
                className="rounded-full object-cover border"
              />
              <div>
                <CardTitle className="text-lg">{t.name}</CardTitle>
                <span className="text-sm text-muted-foreground">{t.chef}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="italic text-muted-foreground">"{t.text}"</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  </main>
);

export default HomePage;
