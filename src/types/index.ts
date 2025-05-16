


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
  dataAiHint?: string; // For Unsplash search keywords for placeholder images
  averageRating?: number; // Optional: for customer reviews
  numberOfRatings?: number; // Optional: for customer reviews
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
  // Fields below could be added for more detailed directory filtering/display
  // experienceLevel?: 'Entry' | 'Junior' | 'Mid-Level' | 'Senior' | 'Executive'; 
  // starRating?: number; // e.g. 1-5 based on internal metrics or customer reviews
  // city?: string;
  // country?: string;
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

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
  customerName?: string;
  pax: number;
  menuName: string;
  pricePerHead: number;
  location?: string;
  notes?: string; // Dietary notes, special requests etc.
  coChefs?: string[];
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  // Placeholders for future features
  weather?: string; 
  toolsNeeded?: string[];
}

export interface ChefWallEvent {
  id: string;
  title: string;
  description: string;
  maxPax: number;
  eventDateTime: string; // Combined date and time string
  location: string;
  pricePerPerson: number;
  chefsInvolved: string[]; // Array of chef names or IDs
  tags: string[]; // e.g., ["Casual", "Fine Dining", "Outdoor"]
  imageUrl?: string;
  isPublic: boolean;
  chefId: string; // ID of the chef who posted
  chefName: string; // Name of the chef
  chefAvatarUrl?: string; // Avatar of the posting chef
}

export interface CustomerWallPost {
  id: string;
  customerName: string;
  customerAvatarUrl?: string;
  eventType: string;
  numberOfPeople: number;
  budget: string; // e.g., "$500 total" or "$50/person"
  cuisinePreferences: string;
  desiredDates: string; // Text field for flexibility
  extraNotes?: string;
  isPublic: boolean; // Public (all chefs) or Private (specific chef - future feature)
  postedAt: string; // e.g., "2 hours ago"
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  kitchenEquipment?: string[]; // e.g., ["Oven", "Mixer"]
  addressDetails?: string;
  defaultEventType?: string;
  defaultPax?: number;
  defaultBudget?: string; // e.g., "per person" or "total"
  defaultBudgetAmount?: number;
  defaultFrequency?: string; // e.g., "Once", "Weekly"
  defaultTheme?: string;
  defaultDietaryNotes?: string;
  defaultExtraComments?: string;
}
