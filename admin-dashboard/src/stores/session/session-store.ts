import { create } from "zustand";

import { getValueFromCookie, setValueToCookie } from "@/server/server-actions";

export const SESSION_COOKIE_KEY = "mplads_session";

export const OFFICER_COOKIE_KEY = "mplads_officer";

const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function newSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

type SessionState = {
  email: string | null;
  hydrate: (email: string | null) => void;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionState>()((set) => ({
  email: null,
  hydrate: (email) => set({ email }),
  signIn: async (email) => {
    set({ email });
    await setValueToCookie(SESSION_COOKIE_KEY, newSessionToken(), { path: "/", maxAge: SESSION_COOKIE_MAX_AGE });
    await setValueToCookie(OFFICER_COOKIE_KEY, email, { path: "/", maxAge: SESSION_COOKIE_MAX_AGE });
  },
  signOut: async () => {
    set({ email: null });
    await setValueToCookie(SESSION_COOKIE_KEY, "", { path: "/", maxAge: 0 });
    await setValueToCookie(OFFICER_COOKIE_KEY, "", { path: "/", maxAge: 0 });
  },
}));

export async function getSessionEmail(): Promise<string | null> {
  const [session, email] = await Promise.all([
    getValueFromCookie(SESSION_COOKIE_KEY),
    getValueFromCookie(OFFICER_COOKIE_KEY),
  ]);
  return session && email ? email : null;
}
