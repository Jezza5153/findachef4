
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { ChefProfile, CustomerProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: ChefProfile | CustomerProfile | null;
  loading: boolean;
  isChef: boolean;
  isCustomer: boolean;
  isChefApproved: boolean;
  isChefSubscribed: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<ChefProfile | CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChef, setIsChef] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isChefApproved, setIsChefApproved] = useState(false);
  const [isChefSubscribed, setIsChefSubscribed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data() as ChefProfile | CustomerProfile;
            setUserProfile(profileData);
            setIsChef(profileData.role === 'chef');
            setIsCustomer(profileData.role === 'customer');
            if (profileData.role === 'chef') {
              const chefProfile = profileData as ChefProfile;
              setIsChefApproved(chefProfile.isApproved || false);
              setIsChefSubscribed(chefProfile.isSubscribed || false);
            } else {
              setIsChefApproved(false);
              setIsChefSubscribed(false);
            }
          } else {
            console.log("No such user profile document in Firestore!");
            setUserProfile(null); // Ensure profile is null if not found
            setIsChef(false);
            setIsCustomer(false);
            setIsChefApproved(false);
            setIsChefSubscribed(false);
          }
        } catch (error) {
          console.error("Error fetching user profile from Firestore:", error);
          setUserProfile(null);
          setIsChef(false);
          setIsCustomer(false);
          setIsChefApproved(false);
          setIsChefSubscribed(false);
        }
      } else {
        setUserProfile(null);
        setIsChef(false);
        setIsCustomer(false);
        setIsChefApproved(false);
        setIsChefSubscribed(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isChef, isCustomer, isChefApproved, isChefSubscribed }}>
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
