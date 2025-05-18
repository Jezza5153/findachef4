
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { ChefProfile, CustomerProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: ChefProfile | CustomerProfile | null;
  loading: boolean; // True while Firebase auth state is resolving initially
  profileLoading: boolean; // True while Firestore profile is loading for an authenticated user
  isChef: boolean;
  isCustomer: boolean;
  isAdmin: boolean;
  isChefApproved: boolean;
  isChefSubscribed: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<ChefProfile | CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true); // For initial Firebase Auth check
  const [profileLoading, setProfileLoading] = useState(false); // For Firestore profile loading
  const [isChef, setIsChef] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChefApproved, setIsChefApproved] = useState(false);
  const [isChefSubscribed, setIsChefSubscribed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true); // Start loading profile
        // Check for custom claims
        try {
          const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh of token
          setIsAdmin(idTokenResult.claims.admin === true);
        } catch (error) {
          console.error("Error fetching ID token result for custom claims:", error);
          setIsAdmin(false);
        }

        // Listen for profile changes from Firestore
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as ChefProfile | CustomerProfile;
            setUserProfile(profileData);
            const currentIsChef = profileData.role === 'chef';
            const currentIsCustomer = profileData.role === 'customer';
            // Note: isAdmin is now set from claims, not from profile.role === 'admin'
            // If you still want profile.role === 'admin' to grant admin, you'd OR it with claims.admin
            // setIsAdmin(profileData.role === 'admin' || idTokenResult.claims.admin === true); 

            setIsChef(currentIsChef);
            setIsCustomer(currentIsCustomer);

            if (currentIsChef) {
              const chefProfile = profileData as ChefProfile;
              setIsChefApproved(chefProfile.isApproved || false);
              setIsChefSubscribed(chefProfile.isSubscribed || false);
            } else {
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
          } else {
            console.warn("No such user profile document in Firestore for UID:", currentUser.uid);
            setUserProfile(null);
            setIsChef(false);
            setIsCustomer(false);
            // setIsAdmin(false); // Keep admin status from claims if profile doesn't exist yet
            setIsChefApproved(false);
            setIsChefSubscribed(false);
          }
          setProfileLoading(false); // Profile loading finished
        }, (error) => {
          console.error("Error with profile snapshot listener:", error);
          setUserProfile(null);
          setIsChef(false);
          setIsCustomer(false);
          // setIsAdmin(false);
          setIsChefApproved(false);
          setIsChefSubscribed(false);
          setProfileLoading(false);
        });
        
        // Return cleanup for profile listener when user changes
        // This inner return is for the onSnapshot cleanup
        return () => {
          unsubscribeProfile();
        };

      } else { // No current user
        setUserProfile(null);
        setIsChef(false);
        setIsCustomer(false);
        setIsAdmin(false);
        setIsChefApproved(false);
        setIsChefSubscribed(false);
        setProfileLoading(false); // No profile to load
      }
      setLoading(false); // Initial Firebase auth check finished
    });

    // Return cleanup for auth state listener
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, profileLoading, isChef, isCustomer, isAdmin, isChefApproved, isChefSubscribed }}>
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
