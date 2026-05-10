import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { track } from '../../lib/analytics';

const LANGUAGES = [
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
];

type CEFROption = { level: string; label: string; description: string; color: string };
const CEFR_OPTIONS: CEFROption[] = [
  { level: 'A1', label: 'A1 — Beginner',        description: 'I know almost no German',              color: Colors.levelA1 },
  { level: 'A2', label: 'A2 — Elementary',       description: 'I know basic greetings and phrases',   color: Colors.levelA2 },
  { level: 'B1', label: 'B1 — Intermediate',     description: 'I can hold simple conversations',      color: Colors.levelB1 },
  { level: 'B2', label: 'B2 — Upper-Intermediate', description: 'I can discuss most everyday topics', color: Colors.levelB2 },
];

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'language' | 'level'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState('de');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (!selectedLevel) {
      Alert.alert('Pick a level', 'Please select your current level to continue.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        language: selectedLanguage,
        cefr_level: selectedLevel,
        onboarding_complete: true,
      })
      .eq('id', user!.id);

    if (error) {
      setSaving(false);
      Alert.alert('Something went wrong', error.message);
      return;
    }

    track('onboarding_completed', { language: selectedLanguage, level: selectedLevel });
    await refreshProfile();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Step indicator */}
        <View style={styles.steps}>
          <View style={[styles.stepDot, step === 'language' && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'level' && styles.stepDotActive]} />
        </View>

        {step === 'language' ? (
          <>
            <Text style={styles.title}>What do you want{'\n'}to learn?</Text>
            <Text style={styles.subtitle}>More languages coming soon.</Text>

            <View style={styles.optionList}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.optionCard, selectedLanguage === lang.code && styles.optionCardSelected]}
                  onPress={() => setSelectedLanguage(lang.code)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionFlag}>{lang.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{lang.label}</Text>
                    <Text style={styles.optionSub}>{lang.native}</Text>
                  </View>
                  {selectedLanguage === lang.code && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('level')} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.back} onPress={() => setStep('language')}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>What's your{'\n'}current level?</Text>
            <Text style={styles.subtitle}>Be honest — you'll learn more efficiently.</Text>

            <View style={styles.optionList}>
              {CEFR_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.level}
                  style={[styles.optionCard, selectedLevel === opt.level && styles.optionCardSelected]}
                  onPress={() => setSelectedLevel(opt.level)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.levelBadge, { backgroundColor: opt.color + '22' }]}>
                    <Text style={[styles.levelBadgeText, { color: opt.color }]}>{opt.level}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                    <Text style={styles.optionSub}>{opt.description}</Text>
                  </View>
                  {selectedLevel === opt.level && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, saving && styles.disabled]}
              onPress={handleFinish}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>{saving ? 'Saving…' : 'Start learning'}</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },

  steps: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.gold, width: 28, borderRadius: 5 },
  stepLine: { flex: 0, width: 24, height: 2, backgroundColor: Colors.border, marginHorizontal: 6 },

  back: { marginBottom: 24 },
  backText: { fontSize: 15, color: Colors.textMuted },

  title: { fontSize: 30, fontWeight: '800', color: Colors.white, lineHeight: 38, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textMuted, marginTop: 8, marginBottom: 32 },

  optionList: { gap: 12 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 16, padding: 16,
  },
  optionCardSelected: { borderColor: Colors.gold, backgroundColor: Colors.goldBg },
  optionFlag: { fontSize: 32 },
  optionLabel: { fontSize: 16, fontWeight: '700', color: Colors.white },
  optionSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  levelBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  levelBadgeText: { fontSize: 13, fontWeight: '800' },

  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', color: Colors.black },

  nextBtn: {
    backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: Colors.black },
  disabled: { opacity: 0.5 },
});
