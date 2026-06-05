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
import { uid } from '../lib/dates';

export default function Lists({ store, setStore }) {
  const boards = store.boards || [];
  const [sel, setSel] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [drafts, setDrafts] = useState({}); // listId -> add-item text

  const lists = store.listsByBoard?.[sel] || [];

  const setBoardLists = (fn) =>
    setStore((s) => ({
      ...s,
      listsByBoard: { ...s.listsByBoard, [sel]: fn(s.listsByBoard?.[sel] || []) },
    }));

  const addList = () => setBoardLists((ls) => [...ls, { id: uid(), name: 'NEW LIST', items: [] }]);
  const delList = (lid) => setBoardLists((ls) => ls.filter((l) => l.id !== lid));
  const renameList = (lid, name) =>
    setBoardLists((ls) => ls.map((l) => (l.id === lid ? { ...l, name: name.trim() || l.name } : l)));
  const addItem = (lid, text) => {
    const t = (text || '').trim();
    if (!t) return;
    setBoardLists((ls) =>
      ls.map((l) => (l.id === lid ? { ...l, items: [...l.items, { id: uid(), text: t, done: false, header: false }] } : l))
    );
    setDrafts((d) => ({ ...d, [lid]: '' }));
  };
  const toggleItem = (lid, id) =>
    setBoardLists((ls) =>
      ls.map((l) => (l.id === lid ? { ...l, items: l.items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) } : l))
    );
  const delItem = (lid, id) =>
    setBoardLists((ls) =>
      ls.map((l) => (l.id === lid ? { ...l, items: l.items.filter((x) => x.id !== id) } : l))
    );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <Text style={styles.title}>Lists</Text>
      </View>

      {/* Board tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap} contentContainerStyle={styles.tabs}>
        {boards.map((b, i) => (
          <Pressable key={i} onPress={() => setSel(i)} style={styles.tab}>
            <Text style={[styles.tabText, i === sel && styles.tabActive]}>{b}</Text>
            {i === sel && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {lists.length === 0 && <Text style={styles.empty}>No lists in this tab. Add one below.</Text>}

        {lists.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.cardHeader}>
              {editingId === l.id ? (
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  autoFocus
                  onChangeText={setEditName}
                  onBlur={() => { renameList(l.id, editName); setEditingId(null); }}
                  onSubmitEditing={() => { renameList(l.id, editName); setEditingId(null); }}
                />
              ) : (
                <Text
                  style={styles.cardTitle}
                  onPress={() => { setEditingId(l.id); setEditName(l.name); }}
                >
                  {l.name}
                </Text>
              )}
              <Pressable onPress={() => delList(l.id)} hitSlop={8}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>

            {l.items.map((it) => (
              <View key={it.id} style={styles.row}>
                <Pressable style={[styles.check, it.done && styles.checkOn]} onPress={() => toggleItem(l.id, it.id)}>
                  {it.done && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>
                <Text style={[styles.rowText, it.done && styles.rowTextDone]} onPress={() => toggleItem(l.id, it.id)}>
                  {it.text}
                </Text>
                <Pressable onPress={() => delItem(l.id, it.id)} hitSlop={8}>
                  <Text style={styles.rowDel}>✕</Text>
                </Pressable>
              </View>
            ))}

            <TextInput
              style={styles.addItem}
              placeholder="Add an item"
              placeholderTextColor="#9ca3af"
              value={drafts[l.id] || ''}
              onChangeText={(t) => setDrafts((d) => ({ ...d, [l.id]: t }))}
              onSubmitEditing={() => addItem(l.id, drafts[l.id])}
              returnKeyType="done"
              blurOnSubmit={false}
            />
          </View>
        ))}

        <Pressable style={styles.newList} onPress={addList}>
          <Text style={styles.newListText}>+ NEW LIST</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  topbar: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  tabsWrap: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabs: { paddingHorizontal: 16, gap: 18, alignItems: 'flex-end' },
  tab: { paddingVertical: 10 },
  tabText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: '#9ca3af' },
  tabActive: { color: '#111827' },
  tabUnderline: { height: 2, backgroundColor: '#4ade80', borderRadius: 2, marginTop: 6 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 30 },
  empty: { color: '#9ca3af', fontSize: 15, textAlign: 'center', marginTop: 24, marginBottom: 16 },
  card: { marginBottom: 22 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: '#111827' },
  nameInput: { flex: 1, fontSize: 20, fontWeight: '700', color: '#111827', borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingVertical: 2 },
  del: { fontSize: 16, color: '#cbd0d6', paddingLeft: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef0f2', gap: 12 },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#fbbf24', backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  rowText: { flex: 1, fontSize: 16, color: '#111827' },
  rowTextDone: { textDecorationLine: 'line-through', color: '#d1d5db' },
  rowDel: { fontSize: 14, color: '#cbd0d6' },
  addItem: { fontSize: 15, color: '#111827', paddingVertical: 10 },
  newList: { paddingVertical: 12 },
  newListText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});
