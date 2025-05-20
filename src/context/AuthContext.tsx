
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
      
      // Clean up previous profile listener if it exists
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up previous profile onSnapshot listener for UID:", user?.uid || 'N/A (old user)');
        profileUnsubscribe();
        profileUnsubscribe = undefined;
      }

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
          setIsAdmin(false);
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        profileUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const profileData = { id: docSnap.id, ...docSnap.data() } as AppUserProfileContext;
            setUserProfile(profileData);
            const currentIsChef = profileData.role === 'chef';
            const currentIsCustomer = profileData.role === 'customer';
            
            setIsChef(currentIsChef);
            setIsCustomer(currentIsCustomer);
            
            if (profileData.role === 'admin' && !claimsAdmin && !isAdmin) { // Check !isAdmin to avoid repeated warnings if claims just haven't propagated yet
                console.warn("AuthContext: User has 'admin' role in Firestore but not (yet) in custom claims. Claims take precedence for isAdmin flag once fetched.");
            }

            if (currentIsChef && profileData.role === 'chef') {
              const chefProfileData = profileData as ChefProfile;
              setIsChefApproved(chefProfileData.isApproved || false);
              setIsChefSubscribed(chefProfileData.isSubscribed || false);
            } else {
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
            console.log("AuthContext: Profile data loaded/updated via onSnapshot for UID:", currentUser.uid);
          } else {
            console.warn("AuthContext: No such user profile document in Firestore for UID:", currentUser.uid);
            setUserProfile(null);
            setIsChef(false);
            setIsCustomer(false);
            // isAdmin from claims is preserved even if profile doc is missing
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
          setProfileLoading(false); // Ensure loading is set to false on error too
        });
      } else { 
        console.log("AuthContext: No current user (logged out). Resetting states.");
        setUserProfile(null);
        setIsChef(false);
        setIsCustomer(false);
        setIsAdmin(false);
        setIsChefApproved(false);
        setIsChefSubscribed(false);
        setProfileLoading(false); 
      }
      setAuthLoading(false); // Firebase auth state itself is resolved
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribeAuth();
      if (profileUnsubscribe) {
        console.log("AuthContext: Cleaning up profile onSnapshot listener on AuthProvider unmount for UID:", user?.uid || 'N/A');
        profileUnsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // user dependency removed to prevent re-running listeners excessively; auth state is the trigger

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
    