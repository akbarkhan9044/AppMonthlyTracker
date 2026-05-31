import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiUrl, API_BASE } from './src/config';

export default function App() {
  const [waka, setWaka] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadCoding() {
    setLoading(true);
    setError('');
    setSummary('');
    try {
      const res = await fetch(apiUrl('/api/wakatime'));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setWaka(data);
    } catch (e) {
      setError(e.message || 'Failed to load coding stats.');
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary() {
    setLoading(true);
    setError('');
    try {
      // Until the to-do data is synced (Supabase), we send the coding stats we
      // already have so the AI summary endpoint has something to talk about.
      const stats = {
        streak: 0,
        today: { done: 0, total: 0 },
        week: { done: 0, total: 0, rate: 0 },
        coding: waka || undefined,
      };
      const res = await fetch(apiUrl('/api/summary'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setSummary(data.summary || 'No summary returned.');
    } catch (e) {
      setError(e.message || 'Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.app}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.wordmark}>ATOMIC TRACKER<Text style={styles.star}>*</Text></Text>
        <Text style={styles.subtitle}>Connected to {API_BASE.replace('https://', '')}</Text>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={loadCoding} disabled={loading}>
            <Text style={styles.btnText}>Load coding stats</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={generateSummary}
            disabled={loading}
          >
            <Text style={[styles.btnText, styles.btnGhostText]}>AI summary</Text>
          </Pressable>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 18 }} color="#111827" />}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {waka && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coding time</Text>
            <View style={styles.statsRow}>
              <Stat label="Today" value={waka.todayText || '0m'} />
              <Stat label="This week" value={waka.weekText || '0m'} />
              <Stat label="Daily avg" value={waka.dailyAverageText || '0m'} />
            </View>
            {waka.projects?.length > 0 && (
              <>
                <Text style={styles.section}>Top projects</Text>
                {waka.projects.map((p) => (
                  <View key={p.name} style={styles.lineRow}>
                    <Text style={styles.lineName}>{p.name}</Text>
                    <Text style={styles.lineVal}>{p.text}</Text>
                  </View>
                ))}
              </>
            )}
            {waka.languages?.length > 0 && (
              <View style={styles.chips}>
                {waka.languages.map((l) => (
                  <Text key={l.name} style={styles.chip}>{l.name} · {l.text}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {!!summary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI summary</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        )}

        <Text style={styles.note}>
          This screen reads from the same Netlify functions as the website.
          To-do data will sync once the shared database (Supabase) is added.
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 20, paddingTop: 70 },
  wordmark: { fontSize: 18, fontWeight: '600', letterSpacing: 2, color: '#111827', textAlign: 'center' },
  star: { color: '#e0731f' },
  subtitle: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, backgroundColor: '#111827', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  btnGhostText: { color: '#111827' },
  error: { color: '#e0457b', marginTop: 16, fontSize: 14, lineHeight: 20 },
  card: { marginTop: 20, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16 },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2, textTransform: 'uppercase' },
  section: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', color: '#9ca3af', marginTop: 16, marginBottom: 8 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eef0f2' },
  lineName: { fontSize: 14, color: '#111827' },
  lineVal: { fontSize: 13, color: '#6b7280' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { fontSize: 12, color: '#6b7280', backgroundColor: '#eef0f2', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  summary: { fontSize: 15, lineHeight: 22, color: '#111827' },
  note: { fontSize: 12, color: '#9ca3af', lineHeight: 18, marginTop: 28, textAlign: 'center' },
});
