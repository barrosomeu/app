import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { api, CompanySettings } from "@/src/api/orcamentos";
import { COLORS, LOGO_URL, RADIUS, SPACING } from "@/src/constants/brand";

export default function DefinicoesScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CompanySettings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.getCompany();
      setData(d);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Erro a carregar definições");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save() {
    if (!data) return;
    try {
      setSaving(true);
      const updated = await api.updateCompany(data);
      setData(updated);
      Alert.alert("Guardado", "Dados da empresa atualizados.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color={COLORS.brandPrimary} />
      </View>
    );
  }

  function set<K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) {
    setData((d) => (d ? { ...d, [k]: v } : d));
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.surface }}
    >
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.headerTitle}>Definições da Empresa</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandCard}>
          <Image source={{ uri: LOGO_URL }} style={styles.brandLogo} contentFit="contain" />
          <Text style={styles.brandName}>{data.nome_empresa}</Text>
          <Text style={styles.brandSub}>{data.nome_titular}</Text>
        </View>

        <Section title="Identificação">
          <Field
            label="Nome da empresa"
            value={data.nome_empresa}
            onChangeText={(t) => set("nome_empresa", t)}
            testID="def-nome-empresa"
          />
          <Field
            label="Titular"
            value={data.nome_titular}
            onChangeText={(t) => set("nome_titular", t)}
            testID="def-nome-titular"
          />
          <Field
            label="NIF"
            value={data.nif}
            onChangeText={(t) => set("nif", t)}
            keyboardType="number-pad"
            testID="def-nif"
          />
        </Section>

        <Section title="Contactos">
          <Field
            label="Morada"
            value={data.morada}
            onChangeText={(t) => set("morada", t)}
            testID="def-morada"
          />
          <Field
            label="Telefone"
            value={data.telefone}
            onChangeText={(t) => set("telefone", t)}
            keyboardType="phone-pad"
            testID="def-telefone"
          />
          <Field
            label="Email"
            value={data.email}
            onChangeText={(t) => set("email", t)}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="def-email"
          />
        </Section>

        <Section title="Pagamento (opcional)">
          <Field
            label="IBAN"
            value={data.iban}
            onChangeText={(t) => set("iban", t)}
            placeholder="PT50 0000 0000 0000 0000 0000 0"
            testID="def-iban"
          />
        </Section>

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          testID="def-save"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveText}>Guardar Alterações</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footer}>
          Estes dados aparecem em todos os orçamentos gerados.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: any) {
  return (
    <View style={{ marginTop: SPACING.lg }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, testID, ...rest }: any) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        testID={testID}
        style={styles.input}
        placeholderTextColor={COLORS.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.onSurface },
  brandCard: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  brandLogo: { width: 90, height: 90, marginBottom: SPACING.sm },
  brandName: { fontSize: 18, fontWeight: "800", color: COLORS.brandPrimary },
  brandSub: { color: COLORS.muted, marginTop: 2, fontSize: 13 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brandPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },
  sectionBody: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.onSurfaceTertiary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: COLORS.surfaceTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: COLORS.onSurface,
  },
  saveBtn: {
    marginTop: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  footer: { color: COLORS.muted, textAlign: "center", marginTop: SPACING.md, fontSize: 12 },
});
