import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../src/config';
import { dayKey, today0, uid } from '../lib/dates';
import Board from './Board';
import Lists from './Lists';
import Insights from './Insights';
import Coding from './Coding';
import Challenge from './Challenge';
import TabBar from './TabBar';

const SEED_BOARDS = ['Personal', 'Someday', 'Groceries', 'Interior design'];
const EMPTY = { days: {}, listsByBoard: {}, boards: SEED_BOARDS, challenge: { startKey: null, coded: {} } };

export default function Main({ session }) {
  const userId = session.user.id;
  const [store, setStore] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today0());
  const [tab, setTab] = useState('today');
  const [waka, setWaka] = useState(null);
  const [wakaError, setWakaError] = useState('');
  const [wakaLoading, setWakaLoading] = useState(true);
  const lastSyncedRef = useRef(null);

  // The challenge now lives inside the synced store so it matches the web.
  const challenge = store.challenge || { startKey: null, coded: {} };
  const setChallenge = (updater) =>
    setStore((s) => {
      const cur = s.challenge || { startKey: null, coded: {} };
      return { ...s, challenge: typeof updater === 'function' ? updater(cur) : updater };
    });

  // --- Cloud load + realtime ---
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('app_state')
          .select('data')
          .eq('user_id', userId)
          .maybeSingle();
        if (!active) return;
        const remote = data?.data && Object.keys(data.data).length ? data.data : EMPTY;
        lastSyncedRef.current = JSON.stringify(remote);
        setStore({ ...EMPTY, ...remote });
      } catch (e) {
        // stay empty
      } finally {
        if (active) setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`app_state_mobile:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new?.data) {
            lastSyncedRef.current = JSON.stringify(payload.new.data);
            setStore({ ...EMPTY, ...payload.new.data });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // --- Push (debounced) ---
  useEffect(() => {
    if (loading) return;
    const json = JSON.stringify(store);
    if (json === lastSyncedRef.current) return;
    const id = setTimeout(() => {
      lastSyncedRef.current = json;
      supabase.from('app_state').upsert({ user_id: userId, data: store }, { onConflict: 'user_id' }).then(() => {});
    }, 700);
    return () => clearTimeout(id);
  }, [store, loading, userId]);

  // --- WakaTime (shared by Insights / Coding / Challenge) ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/wakatime'));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        setWaka(data);
      } catch (e) {
        setWakaError(e.message || 'Could not load coding stats.');
      } finally {
        setWakaLoading(false);
      }
    })();
  }, []);

  // Snapshot per-day coded seconds into the (synced) challenge, once the store
  // has loaded so we don't clobber the remote copy.
  useEffect(() => {
    if (loading || !waka?.last7?.length) return;
    setStore((s) => {
      const coded = { ...(s.challenge?.coded || {}) };
      let changed = false;
      for (const d of waka.last7) {
        if (d.date && coded[d.date] !== d.seconds) {
          coded[d.date] = d.seconds;
          changed = true;
        }
      }
      if (!changed) return s;
      return { ...s, challenge: { ...(s.challenge || { startKey: null, coded: {} }), coded } };
    });
  }, [waka, loading]);

  // --- Day mutations ---
  const key = dayKey(date);
  const mutateDay = (fn) =>
    setStore((s) => ({ ...s, days: { ...s.days, [key]: fn(s.days[key] || []) } }));
  const addTask = (text) => {
    const t = (text || '').trim();
    if (!t) return;
    mutateDay((a) => [...a, { id: uid(), text: t, done: false, header: false, recur: false }]);
  };
  const toggle = (id) => mutateDay((a) => a.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => mutateDay((a) => a.filter((x) => x.id !== id));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === 'today' && (
          <Board
            store={store}
            date={date}
            setDate={setDate}
            addTask={addTask}
            toggle={toggle}
            remove={remove}
            onSignOut={() => supabase.auth.signOut()}
          />
        )}
        {tab === 'lists' && <Lists store={store} setStore={setStore} />}
        {tab === 'insights' && <Insights store={store} waka={waka} />}
        {tab === 'coding' && <Coding waka={waka} wakaError={wakaError} wakaLoading={wakaLoading} />}
        {tab === 'challenge' && (
          <Challenge store={store} challenge={challenge} setChallenge={setChallenge} waka={waka} />
        )}
      </View>
      <TabBar tab={tab} setTab={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  body: { flex: 1 },
  center: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
});
