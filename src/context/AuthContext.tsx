
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore';
import type { AppUserProfileContext, ChefProfile, CustomerProfile, AdminProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: AppUserProfileContext | null;
  loading: boolean; // Combined loading state
  authLoading: boolean; // Firebase auth state resolution
  profileLoading: boolean; // Firestore profile and claims loading
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
      console.log("AuthContext: onAuthStateChanged triggered. CurrentUser UID:", currentUser?.uid || "null");
      
      // Reset all profile-dependent states when currentUser changes or logs out
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up previous Firestore profile listener for old user or on logout.");
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }
      setUserProfile(null);
      setIsAdmin(false);
      setIsChef(false);
      setIsCustomer(false);
      setIsChefApproved(false);
      setIsChefSubscribed(false);
      
      setUser(currentUser); // Set Firebase user immediately

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
          setIsAdmin(false); // Ensure isAdmin is false on error
        }

        // Now fetch Firestore profile
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
              const currentIsAdminFromFirestore = profileData.role === 'admin';

              setIsChef(currentIsChef);
              setIsCustomer(currentIsCustomer);
              
              // Re-affirm isAdmin based on claims, but log if Firestore role mismatches
              if (currentIsAdminFromFirestore && !claimsAdmin) {
                console.warn("AuthContext: User has 'admin' role in Firestore, but 'admin' custom claim is missing or false. Custom claims determine actual admin access.");
              } else if (!currentIsAdminFromFirestore && claimsAdmin) {
                 console.log("AuthContext: User has 'admin' custom claim (isAdmin=true), granting admin access. Firestore role is:", profileData.role);
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
              setUserProfile(null); // Ensure profile is null if not found
              // Reset dependent flags if profile doesn't exist
              setIsChef(false);
              setIsCustomer(false);
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
            setProfileLoading(false); // Firestore profile processing complete
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
          setProfileLoading(false); // Ensure profile loading is false even on outer error
        }
      } else { 
        console.log("AuthContext: No current user (logged out). Resetting profile states.");
        // No user, so no profile or claims to load
        setProfileLoading(false);
      }
      setAuthLoading(false); // Firebase auth state has resolved
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribeAuth();
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up Firestore profile listener on AuthProvider unmount.");
        profileUnsubscribe();
      }
    };
  }, []); 

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading: authLoading || profileLoading,
      authLoading,
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
