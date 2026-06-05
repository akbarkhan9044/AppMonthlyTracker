import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Coding({ waka, wakaError, wakaLoading }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Coding time</Text>

      {wakaLoading && !waka && <ActivityIndicator style={{ marginTop: 20 }} color="#111827" />}
      {wakaError && !waka && <Text style={styles.error}>{wakaError}</Text>}

      {waka && (
        <>
          <View style={styles.grid}>
            <Stat value={waka.todayText || '0m'} label="today" />
            <Stat value={waka.weekText || '0m'} label="this week" />
            <Stat value={waka.dailyAverageText || '0m'} label="daily avg" />
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
            <>
              <Text style={styles.section}>Languages</Text>
              <View style={styles.chips}>
                {waka.languages.map((l) => (
                  <Text key={l.name} style={styles.chip}>{l.name} · {l.text}</Text>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 18 },
  error: { fontSize: 14, lineHeight: 20, color: '#e0457b', marginTop: 16 },
  grid: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: '#9ca3af', textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eef0f2' },
  lineName: { fontSize: 15, color: '#111827' },
  lineVal: { fontSize: 14, color: '#6b7280' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { fontSize: 13, color: '#6b7280', backgroundColor: '#eef0f2', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
});
