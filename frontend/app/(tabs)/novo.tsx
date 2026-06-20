import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api, OrcamentoItem } from "@/src/api/orcamentos";
import {
  COLORS,
  IVA_OPTIONS,
  RADIUS,
  SPACING,
  UNIDADE_OPTIONS,
  fmtEuro,
} from "@/src/constants/brand";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function NovoOrcamentoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [nextNumero, setNextNumero] = useState<string>("…");

  const [paraSeguro, setParaSeguro] = useState(true);
  const [cliente, setCliente] = useState({
    nome: "",
    nif: "",
    contacto: "",
    morada: "",
  });
  const [sinistro, setSinistro] = useState({
    segurado: "",
    seguradora: "",
    apolice: "",
    data: "",
    obra: "",
    vistoria: "",
  });
  const [items, setItems] = useState<OrcamentoItem[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [validadeDias, setValidadeDias] = useState("30");
  const [saving, setSaving] = useState(false);

  // Add-item form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [draft, setDraft] = useState<OrcamentoItem>({
    id: "",
    descricao: "",
    quantidade: 1,
    unidade: "serviço",
    preco_unitario: 0,
    iva: 23,
  });

  useEffect(() => {
    api.nextNumber().then((r) => setNextNumero(r.numero)).catch(() => setNextNumero("—"));
  }, []);

  const subtotal = items.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);
  const totalIva = items.reduce(
    (s, i) => s + i.quantidade * i.preco_unitario * (i.iva / 100),
    0
  );
  const total = subtotal + totalIva;

  function openAddItem() {
    setDraft({
      id: "",
      descricao: "",
      quantidade: 1,
      unidade: "serviço",
      preco_unitario: 0,
      iva: 23,
    });
    setShowItemForm(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function saveItem() {
    if (!draft.descricao.trim()) {
      Alert.alert("Falta a descrição", "Por favor indica o que vai ser feito.");
      return;
    }
    setItems((prev) => [...prev, { ...draft, id: genId() }]);
    setShowItemForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleSave(goPreview: boolean) {
    if (!cliente.nome.trim()) {
      Alert.alert("Falta o cliente", "Indica pelo menos o nome do cliente.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Sem itens", "Adiciona pelo menos um trabalho.");
      return;
    }
    try {
      setSaving(true);
      const orc = await api.createOrcamento({
        cliente_nome: cliente.nome,
        cliente_nif: cliente.nif,
        cliente_contacto: cliente.contacto,
        cliente_morada: cliente.morada,
        segurado: sinistro.segurado,
        seguradora: sinistro.seguradora,
        apolice: sinistro.apolice,
        sinistro_data: sinistro.data,
        obra: sinistro.obra,
        vistoria: sinistro.vistoria,
        observacoes,
        items,
        validade_dias: parseInt(validadeDias) || 30,
        para_seguro: paraSeguro,
        status: "rascunho",
      } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // reset
      setCliente({ nome: "", nif: "", contacto: "", morada: "" });
      setSinistro({ segurado: "", seguradora: "", apolice: "", data: "", obra: "", vistoria: "" });
      setItems([]);
      setObservacoes("");
      if (goPreview) {
        router.push(`/orcamento/${orc.id}`);
      } else {
        router.push("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.surface }}
    >
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.headerTitle}>Novo Orçamento</Text>
        <View style={styles.numPill}>
          <Text style={styles.numPillText}>Nº {nextNumero}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
        testID="novo-form-scroll"
      >
        {/* Para Seguro */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Orçamento para seguradora</Text>
            <Text style={styles.muted}>Inclui dados de sinistro / apólice</Text>
          </View>
          <Switch
            testID="para-seguro-switch"
            value={paraSeguro}
            onValueChange={setParaSeguro}
            trackColor={{ false: COLORS.borderStrong, true: COLORS.brandPrimary }}
            thumbColor="#fff"
          />
        </View>

        {/* CLIENTE */}
        <SectionTitle icon="person" title="Cliente" />
        <FormField
          label="Nome"
          value={cliente.nome}
          onChangeText={(t) => setCliente({ ...cliente, nome: t })}
          placeholder="Nome do cliente"
          testID="cliente-nome"
        />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FormField
              label="NIF"
              value={cliente.nif}
              onChangeText={(t) => setCliente({ ...cliente, nif: t })}
              placeholder="123456789"
              keyboardType="number-pad"
              testID="cliente-nif"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Contacto"
              value={cliente.contacto}
              onChangeText={(t) => setCliente({ ...cliente, contacto: t })}
              placeholder="Telefone/Email"
              testID="cliente-contacto"
            />
          </View>
        </View>
        <FormField
          label="Morada"
          value={cliente.morada}
          onChangeText={(t) => setCliente({ ...cliente, morada: t })}
          placeholder="Morada / Local da obra"
          testID="cliente-morada"
        />

        {/* SINISTRO */}
        {paraSeguro && (
          <>
            <SectionTitle icon="shield-checkmark" title="Sinistro / Seguradora" />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Segurado"
                  value={sinistro.segurado}
                  onChangeText={(t) => setSinistro({ ...sinistro, segurado: t })}
                  placeholder="Nome do segurado"
                  testID="sinistro-segurado"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Seguradora"
                  value={sinistro.seguradora}
                  onChangeText={(t) => setSinistro({ ...sinistro, seguradora: t })}
                  placeholder="Companhia"
                  testID="sinistro-seguradora"
                />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Apólice"
                  value={sinistro.apolice}
                  onChangeText={(t) => setSinistro({ ...sinistro, apolice: t })}
                  placeholder="Nº apólice"
                  testID="sinistro-apolice"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Sinistro em"
                  value={sinistro.data}
                  onChangeText={(t) => setSinistro({ ...sinistro, data: t })}
                  placeholder="DD/MM/AAAA"
                  testID="sinistro-data"
                />
              </View>
            </View>
            <FormField
              label="Obra / Local"
              value={sinistro.obra}
              onChangeText={(t) => setSinistro({ ...sinistro, obra: t })}
              placeholder="Local da intervenção"
              testID="sinistro-obra"
            />
            <FormField
              label="Vistoria"
              value={sinistro.vistoria}
              onChangeText={(t) => setSinistro({ ...sinistro, vistoria: t })}
              placeholder="Nome do perito / data"
              testID="sinistro-vistoria"
            />
          </>
        )}

        {/* ITENS */}
        <SectionTitle icon="hammer" title="Trabalhos" />

        {items.length === 0 && !showItemForm && (
          <View style={styles.itemsEmpty}>
            <Ionicons name="construct-outline" size={26} color={COLORS.muted} />
            <Text style={styles.muted}>Sem trabalhos. Adiciona o primeiro.</Text>
          </View>
        )}

        {items.map((it, idx) => (
          <View key={it.id} style={styles.itemCard} testID={`item-card-${idx}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemDesc}>{it.descricao}</Text>
              <Text style={styles.itemMeta}>
                {it.quantidade} {it.unidade} × {fmtEuro(it.preco_unitario)}  ·  IVA {it.iva}%
              </Text>
              <Text style={styles.itemTotal}>
                {fmtEuro(it.quantidade * it.preco_unitario)}
              </Text>
            </View>
            <Pressable
              onPress={() => removeItem(it.id)}
              hitSlop={10}
              testID={`item-remove-${idx}`}
              style={styles.itemDelete}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </Pressable>
          </View>
        ))}

        {showItemForm ? (
          <View style={styles.itemForm} testID="item-form">
            <Text style={styles.itemFormTitle}>Novo trabalho</Text>
            <FormField
              label="Descrição"
              value={draft.descricao}
              onChangeText={(t) => setDraft({ ...draft, descricao: t })}
              placeholder="Ex.: Lavar e aplicação de massa WEBER"
              multiline
              testID="draft-descricao"
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Qtd"
                  value={String(draft.quantidade)}
                  onChangeText={(t) =>
                    setDraft({ ...draft, quantidade: parseFloat(t.replace(",", ".")) || 0 })
                  }
                  keyboardType="decimal-pad"
                  testID="draft-quantidade"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unidade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {UNIDADE_OPTIONS.map((u) => {
                      const active = draft.unidade === u;
                      return (
                        <Pressable
                          key={u}
                          onPress={() => setDraft({ ...draft, unidade: u })}
                          style={[styles.miniChip, active && styles.miniChipActive]}
                        >
                          <Text
                            style={[
                              styles.miniChipText,
                              active && styles.miniChipTextActive,
                            ]}
                          >
                            {u}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Preço Unit. (€)"
                  value={String(draft.preco_unitario)}
                  onChangeText={(t) =>
                    setDraft({ ...draft, preco_unitario: parseFloat(t.replace(",", ".")) || 0 })
                  }
                  keyboardType="decimal-pad"
                  testID="draft-preco"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>IVA</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {IVA_OPTIONS.map((v) => {
                    const active = draft.iva === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setDraft({ ...draft, iva: v })}
                        style={[styles.miniChip, active && styles.miniChipActive]}
                        testID={`draft-iva-${v}`}
                      >
                        <Text
                          style={[
                            styles.miniChipText,
                            active && styles.miniChipTextActive,
                          ]}
                        >
                          {v}%
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
            <Text style={styles.itemPreview}>
              Total: {fmtEuro(draft.quantidade * draft.preco_unitario * (1 + draft.iva / 100))}
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <Pressable
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => setShowItemForm(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtnSmall, { flex: 1 }]}
                onPress={saveItem}
                testID="draft-save"
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Adicionar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addBtn} onPress={openAddItem} testID="add-item-btn">
            <Ionicons name="add-circle" size={22} color={COLORS.brandPrimary} />
            <Text style={styles.addBtnText}>Adicionar trabalho</Text>
          </Pressable>
        )}

        {/* OBSERVAÇÕES */}
        <SectionTitle icon="document-text" title="Observações" />
        <TextInput
          style={styles.textArea}
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Notas adicionais, condições especiais…"
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={4}
          testID="observacoes"
        />

        <SectionTitle icon="time" title="Validade" />
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {["15", "30", "60", "90"].map((d) => {
            const active = validadeDias === d;
            return (
              <Pressable
                key={d}
                style={[styles.miniChip, active && styles.miniChipActive]}
                onPress={() => setValidadeDias(d)}
                testID={`validade-${d}`}
              >
                <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>
                  {d} dias
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TOTAIS */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalVal}>{fmtEuro(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA</Text>
            <Text style={styles.totalVal}>{fmtEuro(totalIva)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalLabelFinal}>TOTAL</Text>
            <Text style={styles.totalValFinal}>{fmtEuro(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM ACTIONS */}
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 80 }]}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => handleSave(false)}
          disabled={saving}
          testID="save-draft-btn"
        >
          <Ionicons name="save-outline" size={18} color={COLORS.brandPrimary} />
          <Text style={styles.secondaryBtnText}>Guardar</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={() => handleSave(true)}
          disabled={saving}
          testID="save-preview-btn"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Pré-visualizar</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={16} color={COLORS.brandPrimary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function FormField({
  label,
  testID,
  multiline,
  ...rest
}: any) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        testID={testID}
        multiline={multiline}
        placeholderTextColor={COLORS.muted}
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.onSurface },
  numPill: {
    backgroundColor: COLORS.brandTertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  numPillText: {
    color: COLORS.brandPrimary,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  switchTitle: { fontWeight: "700", color: COLORS.onSurface },
  muted: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.brandPrimary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: COLORS.onSurface,
  },
  row2: { flexDirection: "row", gap: SPACING.md },
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 14,
    color: COLORS.onSurface,
  },
  itemsEmpty: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    alignItems: "center",
    gap: 6,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  itemDesc: { fontWeight: "700", color: COLORS.onSurface, fontSize: 14 },
  itemMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  itemTotal: {
    color: COLORS.brandPrimary,
    fontWeight: "800",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  itemDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  itemForm: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  itemFormTitle: {
    fontWeight: "800",
    fontSize: 14,
    color: COLORS.brandPrimary,
    marginBottom: SPACING.sm,
  },
  itemPreview: {
    textAlign: "right",
    color: COLORS.brandPrimary,
    fontWeight: "800",
    marginVertical: SPACING.sm,
    fontVariant: ["tabular-nums"],
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.brandTertiary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  addBtnText: { color: COLORS.brandPrimary, fontWeight: "800" },
  miniChip: {
    paddingHorizontal: SPACING.md,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  miniChipActive: { backgroundColor: COLORS.brandPrimary, borderColor: COLORS.brandPrimary },
  miniChipText: { color: COLORS.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  miniChipTextActive: { color: "#fff" },

  totalsBox: {
    marginTop: SPACING.xl,
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  totalRowFinal: { backgroundColor: COLORS.brandPrimary },
  totalLabel: { color: COLORS.onSurfaceTertiary, fontWeight: "600" },
  totalVal: { color: COLORS.onSurface, fontWeight: "700", fontVariant: ["tabular-nums"] },
  totalLabelFinal: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  totalValFinal: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    flexDirection: "row",
    gap: SPACING.sm,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  primaryBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    flex: 0.6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.brandPrimary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  secondaryBtnText: { color: COLORS.brandPrimary, fontWeight: "800" },
});
