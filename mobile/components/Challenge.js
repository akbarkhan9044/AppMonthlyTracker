import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { computeChallenge, CODE_GOAL, TASK_GOAL } from '../lib/stats';
import { dayKey, today0 } from '../lib/dates';

const CELL_COLORS = {
  done: '#4ade80',
  today: '#e0731f',
  missed: '#d1d5db',
  upcoming: '#eef0f2',
};

export default function Challenge({ store, challenge, setChallenge, waka }) {
  const view = useMemo(
    () => computeChallenge(store, challenge, waka?.todaySeconds),
    [store, challenge, waka]
  );

  if (!view) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>100 Days challenge</Text>
        <Text style={styles.hint}>
          Build a daily habit: a day counts when you complete at least 2 tasks or code at least 1 hour. Track 100 days of consistency.
        </Text>
        <Pressable
          style={styles.btn}
          onPress={() => setChallenge((c) => ({ ...c, startKey: dayKey(today0()) }))}
        >
          <Text style={styles.btnText}>Start the challenge</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const t = view.today;
  const tasksMet = (t?.tasksCount || 0) >= TASK_GOAL;
  const codeMet = (t?.coded || 0) >= CODE_GOAL;
  const hrs = Math.floor((t?.coded || 0) / 3600);
  const mins = Math.floor(((t?.coded || 0) % 3600) / 60);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>100 Days challenge</Text>

      <View style={styles.grid3}>
        <Stat value={`${view.currentDay}`} sub="/100" label="current day" />
        <Stat value={`${view.completed}`} label="completed" />
        <Stat value={`${100 - view.completed}`} label="remaining" />
      </View>

      <Text style={styles.section}>Today — do either one</Text>
      <View style={styles.reqRow}>
        <Text style={[styles.req, tasksMet && styles.reqMet]}>
          {tasksMet ? '✓' : '○'} Complete 2 tasks ({t?.tasksCount || 0}/{TASK_GOAL})
        </Text>
      </View>
      <View style={styles.reqRow}>
        <Text style={[styles.req, codeMet && styles.reqMet]}>
          {codeMet ? '✓' : '○'} Code 1 hour ({hrs}h {mins}m){!waka ? ' · open Coding to sync' : ''}
        </Text>
      </View>

      <Text style={styles.section}>Progress</Text>
      <View style={styles.cells}>
        {view.days.map((d) => (
          <View key={d.key} style={[styles.cell, { backgroundColor: CELL_COLORS[d.status] }]} />
        ))}
      </View>
      <View style={styles.legend}>
        <Legend color={CELL_COLORS.done} label="Completed" />
        <Legend color={CELL_COLORS.today} label="Today" />
        <Legend color={CELL_COLORS.missed} label="Missed" />
        <Legend color={CELL_COLORS.upcoming} label="Upcoming" />
      </View>

      <Pressable
        style={styles.resetBtn}
        onPress={() => setChallenge((c) => ({ ...c, startKey: null }))}
      >
        <Text style={styles.resetText}>Reset challenge</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ value, sub, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}<Text style={styles.statSub}>{sub}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 18 },
  hint: { fontSize: 15, lineHeight: 22, color: '#6b7280', marginBottom: 22 },
  btn: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  grid3: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statSub: { fontSize: 13, fontWeight: '500', color: '#9ca3af' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: '#9ca3af', textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  reqRow: { paddingVertical: 4 },
  req: { fontSize: 15, color: '#9ca3af' },
  reqMet: { color: '#111827', fontWeight: '600' },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cell: { width: '8%', aspectRatio: 1, borderRadius: 3, marginBottom: 0 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: '#9ca3af' },
  resetBtn: { marginTop: 24, backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  resetText: { color: '#111827', fontWeight: '500', fontSize: 15 },
});
