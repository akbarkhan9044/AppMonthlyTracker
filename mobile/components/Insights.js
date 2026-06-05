import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { computeStats } from '../lib/stats';
import { apiUrl } from '../src/config';

export default function Insights({ store, waka }) {
  const stats = useMemo(() => computeStats(store), [store]);
  const maxDay = useMemo(() => Math.max(1, ...stats.last7.map((d) => d.total)), [stats]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const payload = waka ? { ...stats, coding: waka } : stats;
      const res = await fetch(apiUrl('/api/summary'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stats: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setSummary(data.summary || 'No summary returned.');
    } catch (e) {
      setError(e.message || 'Could not generate summary.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Insights</Text>

      <View style={styles.grid}>
        <Stat value={String(stats.streak)} label="day streak" accent />
        <Stat value={`${stats.today.done}/${stats.today.total}`} label="done today" />
        <Stat value={`${stats.week.done}/${stats.week.total}`} label={`week · ${stats.week.rate}%`} />
        <Stat value={String(stats.allTime.done)} label="all-time" />
      </View>

      <Text style={styles.section}>Last 7 days</Text>
      <View style={styles.spark}>
        {stats.last7.map((d) => (
          <View key={d.key} style={styles.sparkCol}>
            <View style={styles.sparkBarWrap}>
              <View style={[styles.sparkTotal, { height: `${(d.total / maxDay) * 100}%` }]} />
              <View style={[styles.sparkDone, { height: `${(d.done / maxDay) * 100}%` }]} />
            </View>
            <Text style={styles.sparkLabel}>{d.label[0]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>AI summary</Text>
      <View style={styles.aiBox}>
        {summary ? (
          <Text style={styles.aiText}>{summary}</Text>
        ) : error ? (
          <Text style={styles.aiError}>{error}</Text>
        ) : (
          <Text style={styles.aiHint}>A short written update on your streak, today, this week{waka ? ', and your coding time' : ''}.</Text>
        )}
        <Pressable style={styles.btn} onPress={generate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{summary ? 'Regenerate' : 'Generate AI summary'}</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, accent }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47%', flexGrow: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statAccent: { color: '#e0731f' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: '#9ca3af', textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8 },
  sparkCol: { flex: 1, alignItems: 'center', height: '100%' },
  sparkBarWrap: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  sparkTotal: { position: 'absolute', bottom: 0, width: '70%', backgroundColor: '#e5e7eb', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  sparkDone: { width: '70%', backgroundColor: '#4ade80', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  sparkLabel: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  aiBox: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16 },
  aiText: { fontSize: 15, lineHeight: 22, color: '#111827', marginBottom: 14 },
  aiHint: { fontSize: 14, lineHeight: 20, color: '#9ca3af', marginBottom: 14 },
  aiError: { fontSize: 14, lineHeight: 20, color: '#e0457b', marginBottom: 14 },
  btn: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
