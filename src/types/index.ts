
export interface Menu {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  pricePerHead: number;
  dietaryInfo: string[]; // e.g., ["Vegetarian", "Gluten-Free"]
  isPublic: boolean;
  chefId: string; 
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
  updatedAt?: any; // Firestore Timestamp
  blockedDates?: string[]; // Array of ISO date strings
  trustScore?: number;
  trustScoreBasis?: string;
}

export interface CustomerRequest {
  id: string;
  eventType: string;
  budget: number;
  cuisinePreference: string;
  pax: number;
  eventDate: any; // Firestore Timestamp
  notes?: string; 
  customerId: string;
  status?: 'new' | 'pending_proposals' | 'viewing_proposals' | 'booked' | 'cancelled';
  createdAt?: any; // Firestore Timestamp
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
  updatedAt?: any; // Firestore Timestamp
}

export interface CalendarEvent {
  id: string; // Firestore document ID
  chefId: string; 
  date: any; // Firestore Timestamp (or string YYYY-MM-DD if not querying by range)
  title: string;
  customerName?: string;
  pax: number;
  menuName: string;
  pricePerHead: number;
  location?: string;
  notes?: string; 
  coChefs?: string[];
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  weather?: string; // Placeholder
  toolsNeeded?: string[]; // Placeholder
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface ChefWallEvent {
  id: string;
  title: string;
  description: string;
  maxPax: number;
  eventDateTime: string; // Or Firestore Timestamp
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
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
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
  updatedAt?: any; // Firestore Timestamp
}

export type CostType = 'Ingredient' | 'Equipment' | 'Tax' | 'BAS' | 'Travel' | 'Other';

export interface Receipt {
  id: string;
  fileName?: string; 
  vendor: string;
  date: any; // Firestore Timestamp
  totalAmount: number;
  assignedToEventId?: string;
  assignedToMenuId?: string;
  costType: CostType;
  notes?: string;
  chefId?: string; 
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  imageUrl?: string; 
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

// Recent Activity Item
export interface ActivityItem {
  id: string;
  type: string; // e.g., 'new_request', 'menu_update', 'new_message'
  description: string;
  timestamp: any; // Firestore Timestamp
  linkTo?: string;
  isRead?: boolean;
}
