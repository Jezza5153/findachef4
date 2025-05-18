
export interface MenuIngredient {
  id: string; // for stable list rendering
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost?: number; // Calculated: quantity * costPerUnit
  notes?: string;
}

export interface Menu {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  pricePerHead: number; // Sale price per head
  dietaryInfo: string[];
  isPublic: boolean;
  chefId: string;
  chefName?: string;
  chefProfilePictureUrl?: string;
  pax?: number; // How many people this menu serves (e.g., for a set menu package)
  costPrice?: number; // Chef's final determined cost price per head
  imageUrl?: string;
  dataAiHint?: string;
  averageRating?: number;
  numberOfRatings?: number;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  menuIngredients?: MenuIngredient[];
  calculatedTotalIngredientCost?: number; // Sum of all menuIngredients.totalCost
  calculatedCostPricePerHead?: number; // calculatedTotalIngredientCost / pax
  adminStatus?: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
}

export interface ParseResumeOutput {
  experience: string;
  skills: string[];
  education?: string;
}

export interface Team {
  id: string;
  name: string;
  ownerChefId: string;
  memberChefIds: string[];
  brandName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfileBase {
  id: string; // Firebase UID
  name: string;
  email: string;
  profilePictureUrl?: string;
  role: 'chef' | 'customer' | 'admin';
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface ChefProfile extends UserProfileBase {
  role: 'chef';
  abn?: string;
  tagline?: string;
  bio: string;
  specialties: string[];
  experienceSummary?: string;
  skills?: string[];
  education?: string;
  portfolioItem1Url?: string;
  portfolioItem1Caption?: string;
  portfolioItem2Url?: string;
  portfolioItem2Caption?: string;
  resumeFileUrl?: string;
  isApproved?: boolean;
  isSubscribed?: boolean;
  blockedDates?: string[]; // Array of ISO date strings "YYYY-MM-DD"
  trustScore?: number;
  trustScoreBasis?: string;
  teamId?: string;
  teamName?: string;
  hasCompletedFirstCoOp?: boolean;
  collaboratorIds?: string[];
  outgoingCollaborationRequests?: string[];
  incomingCollaborationRequests?: string[];
}

export interface CustomerProfile extends UserProfileBase {
  role: 'customer';
  phone?: string;
  kitchenEquipment?: string[];
  addressDetails?: string;
  defaultEventType?: string;
  defaultPax?: number;
  defaultBudgetAmount?: number;
  defaultFrequency?: string;
  defaultTheme?: string;
  defaultDietaryNotes?: string;
  defaultExtraComments?: string;
}

export interface AdminProfile extends UserProfileBase {
  role: 'admin';
}

export type AppUserProfile = ChefProfile | CustomerProfile | AdminProfile;


export interface CustomerRequest {
  id: string;
  eventType: string;
  budget: number;
  cuisinePreference: string;
  pax: number;
  eventDate: any; // Firestore Timestamp or Date object
  location?: string;
  notes?: string;
  customerId: string;
  status?: 'new' | 'awaiting_customer_response' | 'proposal_sent' | 'chef_declined' | 'chef_accepted' | 'customer_confirmed' | 'booked' | 'cancelled_by_customer' | 'proposal_declined';
  createdAt?: any; // Firestore Timestamp or Date object
  updatedAt?: any; // Firestore Timestamp or Date object
  respondingChefIds?: string[];
  activeProposal?: {
    menuId: string;
    menuTitle: string;
    menuPricePerHead: number;
    chefId: string;
    chefName: string; 
    chefAvatarUrl?: string; 
    notes?: string;
    proposedAt: any; // Firestore Timestamp
  } | null; // Allow null for clearing proposal
  declinedChefIds?: string[];
  requestedMenuId?: string;
  requestedMenuTitle?: string;
  moderationStatus?: 'pending_review' | 'resolved' | 'customer_warned' | 'customer_suspended';
  adminNotes?: string;
}

export interface RequestMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  senderRole: 'chef' | 'customer' | 'system';
  text: string;
  timestamp: any; // Firestore Timestamp or Date object
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
  chefId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number; 
  notes?: string;
  purchased: boolean;
  menuId?: string;
  eventId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CalendarEvent {
  id: string; 
  chefId: string;
  date: any; // Firestore Timestamp or Date object
  title: string;
  customerName?: string;
  pax: number;
  menuName: string;
  pricePerHead: number;
  location?: string;
  notes?: string;
  coChefs?: string[];
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'WallEvent' | 'Completed';
  weather?: string;
  toolsNeeded?: string[];
  createdAt?: any; 
  updatedAt?: any; 
  teamId?: string;
  isWallEvent?: boolean;
}

export interface ChefWallEvent {
  id: string;
  title: string;
  description: string;
  maxPax: number;
  eventDateTime: string; // ISO String
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
  createdAt?: any; 
  updatedAt?: any; 
  teamId?: string;
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


export type CostType = 'Ingredient' | 'Equipment' | 'Tax' | 'BAS' | 'Travel' | 'Other';

export interface Receipt {
  id: string;
  chefId: string;
  fileName?: string;
  vendor: string;
  date: any; // Firestore Timestamp or Date object
  totalAmount: number;
  assignedToEventId?: string;
  assignedToMenuId?: string;
  costType: CostType;
  notes?: string;
  imageUrl?: string;
  createdAt?: any; 
  updatedAt?: any; 
}

export interface TaxAdviceInput {
  region: string;
  query: string;
}

export interface TaxAdviceOutput {
  advice: string;
  disclaimer: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: any; // Firestore Timestamp or Date object
  linkTo?: string;
  isRead?: boolean;
}

export interface MenuItemAssistInput {
  menuTitle: string;
  currentDescription?: string;
  cuisine: string;
  keyIngredients?: string;
}

export interface MenuItemAssistOutput {
  suggestedDescription: string;
}

export interface ReceiptParserInput {
  receiptImageUri: string;
}

export interface ReceiptParserOutput {
  vendor?: string;
  date?: string; // YYYY-MM-DD
  totalAmount?: number;
  suggestedCostType?: CostType;
}

export interface Booking {
  id: string; 
  customerId: string;
  customerName?: string; 
  chefId: string;
  chefName: string; 
  chefAvatarUrl?: string; 
  eventTitle: string; 
  eventDate: any; // Firestore Timestamp or Date object
  pax: number;
  totalPrice: number; 
  pricePerHead?: number;
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled_by_customer' | 'cancelled_by_chef' | 'payment_failed';
  createdAt: any; 
  updatedAt?: any; 
  menuTitle?: string; 
  location?: string;
  qrCodeScannedAt?: any; 
  paymentIntentId?: string; 
  requestId?: string; 
  chefWallEventId?: string; // Link if booked from a ChefWallEvent
}


export interface EnrichedCustomerRequest extends CustomerRequest {
  proposingChef?: Pick<ChefProfile, 'name' | 'profilePictureUrl'>;
}

export type AppUserProfileContext = UserProfileBase & Partial<ChefProfile> & Partial<CustomerProfile> & Partial<AdminProfile>;
