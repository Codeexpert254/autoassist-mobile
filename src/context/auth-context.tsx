import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

export type AccountRole = "motorist" | "mechanic";

type SignUpInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: AccountRole;
};

type AuthContextValue = {
  backendEnabled: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<ProfileRow>;
  signUp: (input: SignUpInput) => Promise<{ profile: ProfileRow | null; requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<ProfileRow | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const loadProfileForSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      return null;
    }

    const nextProfile = await fetchProfile(nextSession.user.id);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const restore = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        await loadProfileForSession(data.session);
      } catch (error) {
        console.warn("Unable to restore AutoAssist session", error);
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void restore();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      void loadProfileForSession(nextSession).catch((error) => {
        console.warn("Unable to load AutoAssist profile", error);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileForSession]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return null;
    const nextProfile = await fetchProfile(session.user.id);
    setProfile(nextProfile);
    return nextProfile;
  }, [session?.user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("Live backend is not configured on this device.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    if (!data.session?.user) throw new Error("Login succeeded but no session was returned.");

    const nextProfile = await fetchProfile(data.session.user.id);
    setSession(data.session);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    if (!supabase) throw new Error("Live backend is not configured on this device.");

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          role: input.role,
        },
      },
    });

    if (error) throw error;

    const requiresEmailConfirmation = !data.session;
    const nextProfile = data.user && data.session ? await fetchProfile(data.user.id) : null;

    if (data.session) setSession(data.session);
    if (nextProfile) setProfile(nextProfile);

    return { profile: nextProfile, requiresEmailConfirmation };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      backendEnabled: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
