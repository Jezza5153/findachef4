export interface Menu {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  pricePerHead: number;
  dietaryInfo: string[]; // e.g., ["Vegetarian", "Gluten-Free"]
  isPublic: boolean;
  chefId?: string;
  chefName?: string;
  chefProfilePictureUrl?: string; // Added for displaying in non-anonymized contexts
  pax?: number; // Number of people the menu serves
  costPrice?: number; // For chef's internal calculation
  imageUrl?: string; // Optional image for the menu
}

export interface ChefProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  specialties: string[];
  profilePictureUrl?: string;
  experienceSummary?: string; // Parsed from resume
  skills?: string[]; // Parsed from resume
  education?: string; // Could be part of experienceSummary or separate
  portfolioLinks?: string[];
}

export interface CustomerRequest {
  id:string;
  eventType: string;
  budget: number;
  cuisinePreference: string;
  pax: number;
  eventDate: Date | undefined;
  notes: string;
  customerId?: string; // Optional for now
}

export interface Testimonial {
  id: string;
  customerName: string;
  text: string;
  eventName?: string;
  avatarUrl?: string;
}

export interface Option {
  value: string;
  label: string;
}
