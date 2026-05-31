import { supabase } from './supabaseClient';

const TABLE = 'app_state';

// --- Auth ---------------------------------------------------------------
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// Email magic-link sign-in. The user clicks the link and lands back here
// already authenticated (supabase-js reads the session from the URL).
export async function sendMagicLink(email) {
  if (!supabase) throw new Error('Sync is not configured.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// --- Data ---------------------------------------------------------------
// Returns { data, updated_at } for the user, or null if no row yet.
export async function fetchRemote(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function pushRemote(userId, store) {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: store }, { onConflict: 'user_id' });
  if (error) throw error;
}

// Subscribe to realtime changes to this user's row. Returns an unsubscribe fn.
export function subscribeRemote(userId, cb) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`app_state:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.new?.data) cb(payload.new.data);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
