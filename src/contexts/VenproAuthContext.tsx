import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  fetchUserProfile,
  signOut as authSignOut,
  getSession,
} from '@/services/authService';
import type { UserProfile } from '@/types';

interface VenproAuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  organizationId: string | null;
  isLoading: boolean;
  isSupabaseEnabled: boolean;
  setProfile: (profile: UserProfile | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const VenproAuthContext = createContext<VenproAuthContextValue | null>(null);

export function VenproAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const userProfile = await fetchUserProfile(session.user.id);
    setProfile(userProfile);
  }, [session?.user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    getSession().then((currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    refreshProfile().catch(() => setProfile(null));
  }, [session?.user, refreshProfile]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      organizationId: profile?.organizationId ?? null,
      isLoading,
      isSupabaseEnabled: isSupabaseConfigured,
      setProfile,
      refreshProfile,
      signOut,
    }),
    [session, profile, isLoading, refreshProfile, signOut],
  );

  return <VenproAuthContext.Provider value={value}>{children}</VenproAuthContext.Provider>;
}

export function useVenproAuth() {
  const context = useContext(VenproAuthContext);
  if (!context) {
    throw new Error('useVenproAuth debe usarse dentro de VenproAuthProvider');
  }
  return context;
}
