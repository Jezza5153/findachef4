
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

export interface ParseResumeOutput {
  experience: string;
  skills: string[];
  education?: string; 
}

export interface ChefProfile {
  id: string;
  name: string;
  email: string;
  tagline?: string; 
  bio: string;
  specialties: string[];
  profilePictureUrl?: string;
  experienceSummary?: string; 
  skills?: string[]; 
  education?: string; 
  portfolioItem1Url?: string; 
  portfolioItem1Caption?: string; 
  portfolioItem2Url?: string; 
  portfolioItem2Caption?: string; 
  resumeFileUrl?: string; 
}

export interface CustomerRequest {
  id:string;
  eventType: string;
  budget: number;
  cuisinePreference: string;
  pax: number;
  eventDate: Date | undefined;
  notes?: string; // Made notes optional to match form
  customerId?: string; 
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

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  notes?: string;
  purchased: boolean;
  menuId?: string; // Optional: for filtering by menu
  eventId?: string; // Optional: for filtering by event
}
