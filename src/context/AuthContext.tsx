
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { AppUserProfileContext } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: AppUserProfileContext | null;
  loading: boolean; // True while Firebase auth state is resolving initially
  profileLoading: boolean; // True while Firestore profile AND custom claims are loading for an authenticated user
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
  const [loading, setLoading] = useState(true); // For initial Firebase Auth check
  const [profileLoading, setProfileLoading] = useState(true); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChef, setIsChef] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isChefApproved, setIsChefApproved] = useState(false);
  const [isChefSubscribed, setIsChefSubscribed] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfileLoading(true); 

      if (currentUser) {
        let claimsAdmin = false;
        try {
          console.log("AuthContext: Current user found, fetching ID token result for UID:", currentUser.uid);
          const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh
          console.log("AuthContext: ID Token Claims for user", currentUser.uid, ":", idTokenResult.claims);
          claimsAdmin = idTokenResult.claims.admin === true;
          if (!claimsAdmin) {
            console.warn("AuthContext: 'admin' custom claim not found or not true for user:", currentUser.uid, "Claims found:", idTokenResult.claims);
          }
          setIsAdmin(claimsAdmin);
        } catch (error) {
          console.error("AuthContext: Error fetching ID token result for custom claims for UID:", currentUser.uid, error);
          setIsAdmin(false);
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = docSnap.data() as AppUserProfileContext;
            setUserProfile(profileData);
            const currentIsChef = profileData.role === 'chef';
            const currentIsCustomer = profileData.role === 'customer';
            
            setIsChef(currentIsChef);
            setIsCustomer(currentIsCustomer);

            if (currentIsChef && profileData.role === 'chef') {
              setIsChefApproved(profileData.isApproved || false);
              setIsChefSubscribed(profileData.isSubscribed || false);
            } else {
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
            console.log("AuthContext: Profile data loaded/updated for UID:", currentUser.uid, profileData);
          } else {
            console.warn("AuthContext: No such user profile document in Firestore for UID:", currentUser.uid);
            setUserProfile(null);
            setIsChef(false);
            setIsCustomer(false);
            setIsChefApproved(false);
            setIsChefSubscribed(false);
          }
          setProfileLoading(false); 
        }, (error) => {
          console.error("AuthContext: Error with profile snapshot listener for UID:", currentUser.uid, error);
          setUserProfile(null);
          setIsChef(false);
          setIsCustomer(false);
          setIsChefApproved(false);
          setIsChefSubscribed(false);
          setProfileLoading(false);
        });
        
        return () => {
          console.log("AuthContext: Cleaning up profile listener for UID:", currentUser.uid);
          unsubscribeProfile();
        };

      } else { 
        console.log("AuthContext: No current user.");
        setUserProfile(null);
        setIsChef(false);
        setIsCustomer(false);
        setIsAdmin(false);
        setIsChefApproved(false);
        setIsChefSubscribed(false);
        setProfileLoading(false); 
      }
      setLoading(false); 
    });

    return () => {
      console.log("AuthContext: Cleaning up auth state listener.");
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
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
