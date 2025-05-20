
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore'; 
import type { AppUserProfileContext, ChefProfile, CustomerProfile, AdminProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: AppUserProfileContext | null;
  loading: boolean; // True while Firebase auth state is resolving initially
  profileLoading: boolean; // True while Firestore profile AND custom claims are loading
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
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChef, setIsChef] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isChefApproved, setIsChefApproved] = useState(false);
  const [isChefSubscribed, setIsChefSubscribed] = useState(false);

  useEffect(() => {
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    let profileUnsubscribe: Unsubscribe | undefined = undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. UID:", currentUser?.uid || null);
      setUser(currentUser);
      
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up previous profile onSnapshot listener for UID:", user?.uid || 'N/A (old user)');
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

      // Reset all profile-dependent states when user changes
      setUserProfile(null);
      setIsAdmin(false);
      setIsChef(false);
      setIsCustomer(false);
      setIsChefApproved(false);
      setIsChefSubscribed(false);

      if (currentUser) {
        setProfileLoading(true); // Start profile loading when user is found
        let claimsAdmin = false;
        try {
          console.log("AuthContext: Attempting to fetch ID token result with force refresh for UID:", currentUser.uid);
          const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh
          console.log("AuthContext: ID Token Claims for user", currentUser.uid, ":", idTokenResult.claims);
          claimsAdmin = idTokenResult.claims.admin === true;
          if (!claimsAdmin) {
            console.warn("AuthContext: 'admin' custom claim not found or not true for user:", currentUser.uid, "Claims found:", idTokenResult.claims);
          }
          setIsAdmin(claimsAdmin);
        } catch (error) {
          console.error("AuthContext: Error fetching ID token result for custom claims for UID:", currentUser.uid, error);
          setIsAdmin(false); // Explicitly set to false on error
        }

        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          profileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const profileData = { 
                id: docSnap.id, 
                ...docSnap.data(),
                // Ensure timestamps are converted if they come from Firestore
                createdAt: docSnap.data().createdAt instanceof Timestamp ? (docSnap.data().createdAt as Timestamp).toDate() : new Date(docSnap.data().createdAt as any),
                updatedAt: docSnap.data().updatedAt instanceof Timestamp ? (docSnap.data().updatedAt as Timestamp).toDate() : new Date(docSnap.data().updatedAt as any),
              } as AppUserProfileContext;
              setUserProfile(profileData);
              const currentIsChef = profileData.role === 'chef';
              const currentIsCustomer = profileData.role === 'customer';
              
              setIsChef(currentIsChef);
              setIsCustomer(currentIsCustomer);
              
              // Re-check admin based on Firestore role, but claims take precedence if set
              if (profileData.role === 'admin' && !claimsAdmin) { 
                  // This is mostly a logging scenario, as claims-based isAdmin is already set.
                  console.warn("AuthContext: User has 'admin' role in Firestore, but this is overridden by custom claims check for isAdmin flag.");
              }

              if (currentIsChef && profileData.role === 'chef') {
                const chefProfileData = profileData as ChefProfile;
                setIsChefApproved(chefProfileData.isApproved || false);
                setIsChefSubscribed(chefProfileData.isSubscribed || false);
              } else {
                setIsChefApproved(false);
                setIsChefSubscribed(false);
              }
              console.log("AuthContext: Profile data loaded/updated via onSnapshot for UID:", currentUser.uid, profileData);
            } else {
              console.warn("AuthContext: No such user profile document in Firestore for UID:", currentUser.uid);
              setUserProfile(null); // Ensure profile is null if doc doesn't exist
              // Reset dependent states
              setIsChef(false);
              setIsCustomer(false);
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
            setProfileLoading(false); // Profile loading (Firestore part) is done
          }, (error) => {
            console.error("AuthContext: Error with profile snapshot listener for UID:", currentUser.uid, error);
            setUserProfile(null);
            // Reset dependent states
            setIsChef(false);
            setIsCustomer(false);
            setIsChefApproved(false);
            setIsChefSubscribed(false);
            setProfileLoading(false); // Ensure loading is set to false on error too
          });
        } catch (e) {
          console.error("AuthContext: Outer error setting up profile snapshot for UID:", currentUser.uid, e);
          setUserProfile(null);
          setIsChef(false);
          setIsCustomer(false);
          setIsChefApproved(false);
          setIsChefSubscribed(false);
          setProfileLoading(false);
        }
      } else { 
        console.log("AuthContext: No current user (logged out). Resetting states.");
        // States already reset at the beginning of this block
        setProfileLoading(false); // No profile to load
      }
      setAuthLoading(false); // Firebase auth state itself is resolved
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribeAuth();
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up profile onSnapshot listener on AuthProvider unmount for UID (if any):", user?.uid || 'N/A');
        profileUnsubscribe();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading: authLoading, 
      profileLoading, 
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
