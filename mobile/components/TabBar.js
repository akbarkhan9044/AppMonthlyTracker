import { Pressable, StyleSheet, Text, View } from 'react-native';

const TABS = [
  { id: 'today', label: 'Today', icon: '✓' },
  { id: 'lists', label: 'Lists', icon: '≡' },
  { id: 'insights', label: 'Insights', icon: '▢' },
  { id: 'coding', label: 'Coding', icon: '‹›' },
  { id: 'challenge', label: '100 Days', icon: '◎' },
];

export default function TabBar({ tab, setTab }) {
  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <Pressable key={t.id} style={styles.tab} onPress={() => setTab(t.id)}>
            <Text style={[styles.icon, active && styles.active]}>{t.icon}</Text>
            <Text style={[styles.label, active && styles.active]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#ffffff', paddingBottom: 24, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  icon: { fontSize: 18, color: '#9ca3af' },
  label: { fontSize: 11, color: '#9ca3af' },
  active: { color: '#111827', fontWeight: '700' },
});
