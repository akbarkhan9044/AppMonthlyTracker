import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Main from './components/Main';

export default function App() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setChecked(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {!checked ? (
        <View style={styles.center}>
          <ActivityIndicator color="#111827" />
        </View>
      ) : session ? (
        <Main session={session} />
      ) : (
        <Login />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
