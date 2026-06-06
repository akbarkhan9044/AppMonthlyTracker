import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [step, setStep] = useState('email'); // email | code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendCode() {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('code');
    } catch (err) {
      setError(err.message || 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const token = code.trim();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      });
      if (error) throw error;
      // onAuthStateChange in App.js takes over from here.
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.wordmark}>ATOMIC TRACKER<Text style={styles.star}>*</Text></Text>

        {step === 'email' ? (
          <>
            <Text style={styles.text}>
              Sign in to start. Each account keeps its own private to-dos, synced across your devices.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendCode}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.btn} onPress={sendCode} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send sign-in code</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.text}>
              Enter the code we emailed to <Text style={styles.bold}>{email}</Text>.
            </Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Enter code"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              maxLength={10}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              onSubmitEditing={verify}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Pressable style={styles.btn} onPress={verify} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & sign in</Text>}
            </Pressable>
            <Pressable onPress={() => { setStep('email'); setCode(''); setError(''); }}>
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  wordmark: { fontSize: 22, fontWeight: '600', letterSpacing: 2, color: '#111827', textAlign: 'center', marginBottom: 18 },
  star: { color: '#e0731f' },
  text: { fontFamily: undefined, fontSize: 15, lineHeight: 22, color: '#6b7280', textAlign: 'center', marginBottom: 22 },
  bold: { color: '#111827', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16, color: '#111827', marginBottom: 12, textAlign: 'center' },
  codeInput: { letterSpacing: 4, fontSize: 20 },
  btn: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#e0457b', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  link: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 16 },
});
