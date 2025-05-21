
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore'; 
import type { AppUserProfileContext, ChefProfile, CustomerProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: AppUserProfileContext | null;
  loading: boolean; // True while Firebase auth state is resolving initially AND profile/claims are loading
  authLoading: boolean; // Specifically for Firebase auth state resolution
  profileLoading: boolean; // Specifically for Firestore profile and custom claims loading
  isAdmin: boolean;
  isChef: boolean;
  isCustomer: boolean;
  isChefApproved: boolean;
  isChefSubscribed: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfileContext | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // For Firebase auth state
  const [profileLoading, setProfileLoading] = useState(true); // For Firestore profile & claims
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChef, setIsChef] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isChefApproved, setIsChefApproved] = useState(false);
  const [isChefSubscribed, setIsChefSubscribed] = useState(false);

  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    let profileUnsubscribe: Unsubscribe | undefined = undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. CurrentUser UID:", currentUser?.uid || null);
      
      // Reset all profile-dependent states when currentUser changes before fetching new data
      setUserProfile(null);
      setIsAdmin(false);
      setIsChef(false);
      setIsCustomer(false);
      setIsChefApproved(false);
      setIsChefSubscribed(false);
      
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up previous Firestore profile listener for old user or on logout.");
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

      setUser(currentUser); 

      if (currentUser) {
        setProfileLoading(true); // Start loading profile and claims for the new user
        console.log("AuthContext: User found (UID:", currentUser.uid, "). Starting profile and claims loading.");

        let claimsAdmin = false;
        try {
          console.log("AuthContext: Attempting to fetch ID token result with force refresh for UID:", currentUser.uid);
          const idTokenResult = await currentUser.getIdTokenResult(true); 
          console.log("AuthContext: ID Token Claims for user", currentUser.uid, ":", idTokenResult.claims);
          claimsAdmin = !!(idTokenResult.claims && idTokenResult.claims.admin === true);
          setIsAdmin(claimsAdmin);
          if (!claimsAdmin) {
            console.warn("AuthContext: 'admin' custom claim not found or not true for user:", currentUser.uid, "Claims found:", idTokenResult.claims);
          } else {
            console.log("AuthContext: 'admin' custom claim IS TRUE for user:", currentUser.uid);
          }
        } catch (error) {
          console.error("AuthContext: Error fetching ID token result for custom claims for UID:", currentUser.uid, error);
          setIsAdmin(false); // Default to false on error
        }

        // Now set up Firestore listener for profile
        try {
          console.log("AuthContext: Setting up Firestore profile listener for UID:", currentUser.uid);
          const userDocRef = doc(db, "users", currentUser.uid);
          profileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const profileData = { 
                id: docSnap.id, 
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
              } as AppUserProfileContext;
              
              console.log("AuthContext: Firestore profile data loaded/updated for UID:", currentUser.uid, "Role:", profileData.role);
              setUserProfile(profileData);
              
              const currentIsChef = profileData.role === 'chef';
              const currentIsCustomer = profileData.role === 'customer';
              // Admin status from claims is primary, this is just for logging consistency
              const currentIsAdminRoleInFirestore = profileData.role === 'admin';

              console.log("AuthContext: Setting isChef based on role:", currentIsChef);
              setIsChef(currentIsChef);
              setIsCustomer(currentIsCustomer);
              
              if (currentIsAdminRoleInFirestore && !claimsAdmin) {
                console.warn("AuthContext: User has 'admin' role in Firestore, but 'admin' custom claim is missing or false. Custom claims determine admin access.");
              } else if (!currentIsAdminRoleInFirestore && claimsAdmin) {
                 console.log("AuthContext: User has 'admin' custom claim, granting admin access. Firestore role is:", profileData.role);
              }

              if (currentIsChef) {
                const chefProfileData = profileData as ChefProfile;
                setIsChefApproved(chefProfileData.isApproved || false);
                setIsChefSubscribed(chefProfileData.isSubscribed || false);
                console.log("AuthContext: Chef specific flags - Approved:", chefProfileData.isApproved, "Subscribed:", chefProfileData.isSubscribed);
              } else {
                setIsChefApproved(false);
                setIsChefSubscribed(false);
              }
            } else {
              console.warn("AuthContext: No such user profile document in Firestore for UID:", currentUser.uid);
              setUserProfile(null); // Explicitly set to null if not found
              // Reset flags if profile doesn't exist
              setIsChef(false);
              setIsCustomer(false);
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
            setProfileLoading(false); // Profile and claims processing done for this user
          }, (error) => {
            console.error("AuthContext: Error with Firestore profile snapshot listener for UID:", currentUser.uid, error);
            setUserProfile(null);
            setIsChef(false);
            setIsCustomer(false);
            setIsChefApproved(false);
            setIsChefSubscribed(false);
            setProfileLoading(false); 
          });
        } catch (e) {
          console.error("AuthContext: Outer error setting up Firestore profile snapshot for UID:", currentUser.uid, e);
          setUserProfile(null);
          setIsChef(false);
          setIsCustomer(false);
          setIsChefApproved(false);
          setIsChefSubscribed(false);
          setProfileLoading(false);
        }
      } else { 
        console.log("AuthContext: No current user (logged out). Resetting profile states.");
        setProfileLoading(false); // No profile or claims to load if no user
      }
      setAuthLoading(false); // Firebase auth state has resolved
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribeAuth();
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up profile onSnapshot listener on AuthProvider unmount.");
        profileUnsubscribe();
      }
    };
  }, []); 

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading: authLoading || profileLoading, // Combined loading state for consumers
      authLoading, // Exposed for specific needs if any
      profileLoading, // Exposed for specific needs if any
      isAdmin, 
      isChef, 
      isCustomer, 
      isChefApproved, 
      isChefSubscribed 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
