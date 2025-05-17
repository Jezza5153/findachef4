
export interface Menu {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  pricePerHead: number;
  dietaryInfo: string[]; // e.g., ["Vegetarian", "Gluten-Free"]
  isPublic: boolean;
  chefId: string; // Made non-optional
  chefName?: string;
  chefProfilePictureUrl?: string; 
  pax?: number; 
  costPrice?: number; 
  imageUrl?: string; 
  dataAiHint?: string; 
  averageRating?: number; 
  numberOfRatings?: number; 
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface ParseResumeOutput {
  experience: string;
  skills: string[];
  education?: string;
}

export interface ChefProfile {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  abn?: string;
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
  role?: 'chef' | 'customer' | 'admin';
  isApproved?: boolean;
  isSubscribed?: boolean;
  createdAt?: any; // Firestore Timestamp
  blockedDates?: string[]; // Array of ISO date strings
}

export interface CustomerRequest {
  id:string;
  eventType: string;
  budget: number;
  cuisinePreference: string;
  pax: number;
  eventDate: Date | undefined;
  notes?: string; 
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
  id: string; // Firestore document ID
  chefId: string; // UID of the chef who owns this item
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  notes?: string;
  purchased: boolean;
  menuId?: string; 
  eventId?: string; 
  createdAt?: any; // Firestore Timestamp
}

export interface CalendarEvent {
  id: string; // Firestore document ID
  chefId: string; // UID of the chef who owns this event
  date: string; // YYYY-MM-DD format
  title: string;
  customerName?: string;
  pax: number;
  menuName: string;
  pricePerHead: number;
  location?: string;
  notes?: string; 
  coChefs?: string[];
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  weather?: string;
  toolsNeeded?: string[];
  createdAt?: any; // Firestore Timestamp
}

export interface ChefWallEvent {
  id: string;
  title: string;
  description: string;
  maxPax: number;
  eventDateTime: string; 
  location: string;
  pricePerPerson: number;
  chefsInvolved: string[]; 
  tags: string[]; 
  imageUrl?: string;
  isPublic: boolean;
  chefId: string; 
  chefName: string; 
  chefAvatarUrl?: string; 
  dataAiHint?: string;
}

export interface CustomerWallPost {
  id: string;
  customerName: string;
  customerAvatarUrl?: string;
  eventType: string;
  numberOfPeople: number;
  budget: string; 
  cuisinePreferences: string;
  desiredDates: string; 
  extraNotes?: string;
  isPublic: boolean; 
  postedAt: string; 
  dataAiHint?: string;
}

export interface CustomerProfile {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  kitchenEquipment?: string[]; 
  addressDetails?: string;
  defaultEventType?: string;
  defaultPax?: number;
  defaultBudget?: string; 
  defaultBudgetAmount?: number;
  defaultFrequency?: string; 
  defaultTheme?: string;
  defaultDietaryNotes?: string;
  defaultExtraComments?: string;
  role?: 'chef' | 'customer' | 'admin';
  createdAt?: any; // Firestore Timestamp
}

export type CostType = 'Ingredient' | 'Equipment' | 'Tax' | 'BAS' | 'Travel' | 'Other';

export interface Receipt {
  id: string;
  fileName?: string; 
  vendor: string;
  date: Date; // Will be stored as Firestore Timestamp, converted on fetch/save
  totalAmount: number;
  assignedToEventId?: string;
  assignedToMenuId?: string;
  costType: CostType;
  notes?: string;
  chefId?: string; // UID of the chef who owns this receipt
  createdAt?: any; // Firestore Timestamp
  imageUrl?: string; // URL if uploaded to storage
}

// Tax Advice Flow Types
export interface TaxAdviceInput {
  region: string;
  query: string;
}

export interface TaxAdviceOutput {
  advice: string;
  disclaimer: string;
}
