import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DAY_NAMES, addDays, dayKey, fmtTopDate, sameDay, today0 } from '../lib/dates';

export default function Board({ store, date, setDate, addTask, toggle, remove, onSignOut }) {
  const [draft, setDraft] = useState('');
  const key = dayKey(date);
  const items = store.days[key] || [];
  const isToday = sameDay(date, today0());

  const submit = () => {
    addTask(draft);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topbar}>
        <Text style={styles.wordmark}>ATOMIC TRACKER<Text style={styles.star}>*</Text></Text>
        <Pressable onPress={onSignOut}>
          <Text style={styles.signout}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => setDate(addDays(date, -1))}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Pressable style={styles.navCenter} onPress={() => setDate(today0())}>
          <Text style={styles.navDate}>{fmtTopDate(date)}</Text>
          <Text style={styles.navDay}>{DAY_NAMES[date.getDay()]}{isToday ? '  • TODAY' : ''}</Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => setDate(addDays(date, 1))}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {items.length === 0 && <Text style={styles.empty}>No to-dos yet. Add one below.</Text>}
        {items.map((it) =>
          it.header ? (
            <Text key={it.id} style={styles.header}>{it.text}</Text>
          ) : (
            <View key={it.id} style={styles.row}>
              <Pressable style={[styles.check, it.done && styles.checkOn]} onPress={() => toggle(it.id)}>
                {it.done && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
              <Text style={[styles.rowText, it.done && styles.rowTextDone]} onPress={() => toggle(it.id)}>
                {it.text}
              </Text>
              <Pressable onPress={() => remove(it.id)} hitSlop={8}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          )
        )}
      </ScrollView>

      <View style={styles.addBar}>
        <TextInput
          style={styles.addInput}
          placeholder="Add a to-do"
          placeholderTextColor="#9ca3af"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  wordmark: { fontSize: 14, fontWeight: '600', letterSpacing: 1.5, color: '#111827' },
  star: { color: '#e0731f' },
  signout: { fontSize: 13, color: '#9ca3af' },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 28, color: '#9ca3af' },
  navCenter: { flex: 1, alignItems: 'center' },
  navDate: { fontSize: 11, letterSpacing: 0.5, color: '#9ca3af', marginBottom: 2 },
  navDay: { fontSize: 24, fontWeight: '700', color: '#111827' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { color: '#9ca3af', fontSize: 15, marginTop: 24, textAlign: 'center' },
  header: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: '#9ca3af', textTransform: 'uppercase', marginTop: 18, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eef0f2', gap: 12 },
  check: { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#fbbf24', backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  rowText: { flex: 1, fontSize: 16, color: '#111827' },
  rowTextDone: { textDecorationLine: 'line-through', color: '#d1d5db' },
  del: { fontSize: 15, color: '#cbd0d6', paddingHorizontal: 4 },
  addBar: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 28 },
  addInput: { fontSize: 16, color: '#111827', paddingVertical: 8 },
});
