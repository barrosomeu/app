import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";

import {
  api,
  Orcamento as OrcamentoT,
  CompanySettings,
} from "@/src/api/orcamentos";
import {
  COLORS,
  LOGO_URL,
  RADIUS,
  SPACING,
  STATUS_COLORS,
  STATUS_LABELS,
  fmtDatePT,
  fmtEuro,
} from "@/src/constants/brand";
import { buildOrcamentoHtml } from "@/src/pdf/template";

export default function OrcamentoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orc, setOrc] = useState<OrcamentoT | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [o, c] = await Promise.all([api.getOrcamento(id as string), api.getCompany()]);
      setOrc(o);
      setCompany(c);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function generateAndShare() {
    if (!orc || !company) return;
    try {
      setBusy("share");
      const html = buildOrcamentoHtml(orc, company);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const ok = await Sharing.isAvailableAsync();
      if (ok) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Orçamento ${orc.numero}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Partilha indisponível", "Não é possível partilhar neste dispositivo.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível gerar o PDF");
    } finally {
      setBusy(null);
    }
  }

  async function previewPdf() {
    if (!orc || !company) return;
    try {
      setBusy("preview");
      const html = buildOrcamentoHtml(orc, company);
      if (Platform.OS === "ios") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const ok = await Sharing.isAvailableAsync();
        if (ok) await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Erro pré-visualização");
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: "rascunho" | "enviado" | "aceite") {
    if (!orc) return;
    try {
      const updated = await api.updateOrcamento(orc.id, { status } as any);
      setOrc(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Erro ao atualizar");
    }
  }

  async function remove() {
    if (!orc) return;
    Alert.alert("Apagar Orçamento?", `Nº ${orc.numero} será removido.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteOrcamento(orc.id);
            router.back();
          } catch (e: any) {
            Alert.alert("Erro", e?.message);
          }
        },
      },
    ]);
  }

  if (loading || !orc || !company) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={COLORS.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="chevron-back" size={28} color={COLORS.onSurface} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>Orçamento</Text>
          <Text style={styles.headerNum}>Nº {orc.numero}</Text>
        </View>
        <Pressable onPress={remove} hitSlop={12} testID="delete-btn">
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 180 }}>
        {/* DOC PREVIEW */}
        <View style={styles.doc}>
          <View style={styles.docHeader}>
            <Image source={{ uri: LOGO_URL }} style={styles.docLogo} contentFit="contain" />
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.companyName}>{company.nome_empresa}</Text>
              <Text style={styles.companyLine}>{company.nome_titular}</Text>
              <Text style={styles.companyLine}>{company.morada}</Text>
              <Text style={styles.companyLine}>NIF: {company.nif}</Text>
              <Text style={styles.companyLine}>Tel: {company.telefone}</Text>
              <Text style={styles.companyLine}>{company.email}</Text>
            </View>
          </View>

          <View style={styles.titleBand}>
            <Text style={styles.titleBandText}>
              {orc.para_seguro ? "ORÇAMENTO PARA CLIENTE / SEGURO" : "ORÇAMENTO PARA CLIENTE"}
            </Text>
          </View>

          {/* META */}
          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>Dados do Orçamento</Text>
              <Row k="Nº" v={orc.numero} />
              <Row k="Emissão" v={fmtDatePT(orc.data_emissao)} />
              <Row k="Validade" v={fmtDatePT(orc.validade_ate)} />
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaTitle}>Cliente</Text>
              <Row k="Nome" v={orc.cliente_nome || "—"} />
              <Row k="NIF" v={orc.cliente_nif || "—"} />
              <Row k="Contacto" v={orc.cliente_contacto || "—"} />
            </View>
          </View>

          {orc.cliente_morada ? (
            <View style={styles.fullRow}>
              <Text style={styles.metaTitle}>Morada do Cliente</Text>
              <Text style={styles.fullText}>{orc.cliente_morada}</Text>
            </View>
          ) : null}

          {orc.para_seguro && (
            <View style={styles.fullRow}>
              <Text style={styles.metaTitle}>Sinistro / Seguradora</Text>
              <View style={styles.kvWrap}>
                {!!orc.segurado && <KV k="Segurado" v={orc.segurado} />}
                {!!orc.seguradora && <KV k="Seguradora" v={orc.seguradora} />}
                {!!orc.apolice && <KV k="Apólice" v={orc.apolice} />}
                {!!orc.sinistro_data && <KV k="Sinistro em" v={orc.sinistro_data} />}
                {!!orc.obra && <KV k="Obra" v={orc.obra} />}
                {!!orc.vistoria && <KV k="Vistoria" v={orc.vistoria} />}
              </View>
            </View>
          )}

          <Text style={styles.tableTitle}>Descrição dos Trabalhos</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.th, { flex: 3 }]}>Descrição</Text>
              <Text style={[styles.th, styles.thNum]}>Qtd</Text>
              <Text style={[styles.th, styles.thCtr]}>Un.</Text>
              <Text style={[styles.th, styles.thNum]}>Preço</Text>
              <Text style={[styles.th, styles.thCtr]}>IVA</Text>
              <Text style={[styles.th, styles.thNum]}>Total</Text>
            </View>
            {orc.items.map((it, idx) => (
              <View
                key={it.id}
                style={[styles.tr, idx % 2 === 1 && { backgroundColor: COLORS.surfaceTertiary }]}
              >
                <Text style={[styles.td, { flex: 3 }]}>{it.descricao}</Text>
                <Text style={[styles.td, styles.tdNum]}>{it.quantidade}</Text>
                <Text style={[styles.td, styles.tdCtr]}>{it.unidade}</Text>
                <Text style={[styles.td, styles.tdNum]}>{fmtEuro(it.preco_unitario)}</Text>
                <Text style={[styles.td, styles.tdCtr]}>{it.iva}%</Text>
                <Text style={[styles.td, styles.tdNum, { fontWeight: "700" }]}>
                  {fmtEuro(it.quantidade * it.preco_unitario)}
                </Text>
              </View>
            ))}
            {orc.items.length === 0 && (
              <Text style={styles.emptyItems}>Sem itens</Text>
            )}
          </View>

          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totLabel}>Subtotal</Text>
              <Text style={styles.totVal}>{fmtEuro(orc.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totLabel}>IVA</Text>
              <Text style={styles.totVal}>{fmtEuro(orc.total_iva)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totLabelFinal}>TOTAL</Text>
              <Text style={styles.totValFinal}>{fmtEuro(orc.total)}</Text>
            </View>
          </View>

          {!!orc.observacoes && (
            <View style={styles.obsBox}>
              <Text style={styles.obsTitle}>OBSERVAÇÕES</Text>
              <Text style={styles.obsText}>{orc.observacoes}</Text>
            </View>
          )}

          <Text style={styles.termsText}>
            Validade do orçamento: {orc.validade_dias} dias.{"\n"}
            {orc.para_seguro
              ? "Proposta destinada a fins de seguro e reparação da ocorrência indicada."
              : ""}
          </Text>
        </View>

        {/* STATUS */}
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Estado</Text>
          <View style={styles.statusRow}>
            {(["rascunho", "enviado", "aceite"] as const).map((s) => {
              const active = orc.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  testID={`status-${s}`}
                  style={[
                    styles.statusBtn,
                    active && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] },
                  ]}
                >
                  <Text style={[styles.statusBtnText, active && { color: "#fff" }]}>
                    {STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* AÇÕES — Editar / Clonar */}
        <View style={styles.actionsCard}>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push(`/novo?editId=${orc.id}`)}
            testID="edit-btn"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.brandTertiary }]}>
              <Ionicons name="create-outline" size={20} color={COLORS.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Editar Orçamento</Text>
              <Text style={styles.actionSub}>Alterar dados, itens, totais</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push(`/novo?cloneId=${orc.id}`)}
            testID="clone-btn"
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="copy-outline" size={20} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Clonar Orçamento</Text>
              <Text style={styles.actionSub}>Criar novo com base neste</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable
          style={[styles.actionSecondary]}
          onPress={previewPdf}
          disabled={!!busy}
          testID="preview-pdf-btn"
        >
          {busy === "preview" ? (
            <ActivityIndicator color={COLORS.brandPrimary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color={COLORS.brandPrimary} />
              <Text style={styles.actionSecondaryText}>Pré-ver PDF</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionPrimary]}
          onPress={generateAndShare}
          disabled={!!busy}
          testID="share-pdf-btn"
        >
          {busy === "share" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.actionPrimaryText}>Partilhar PDF</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={styles.kvV} numberOfLines={1}>{v}</Text>
    </View>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kvInline}>
      <Text style={styles.kvK}>{k}: </Text>
      <Text style={styles.kvVInline}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 14, color: COLORS.muted, fontWeight: "600" },
  headerNum: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.onSurface,
    fontVariant: ["tabular-nums"],
  },

  doc: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docHeader: {
    flexDirection: "row",
    paddingBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brandPrimary,
    marginBottom: SPACING.md,
  },
  docLogo: { width: 72, height: 72 },
  companyName: { fontWeight: "800", color: COLORS.brandPrimary, fontSize: 14 },
  companyLine: { color: COLORS.onSurfaceTertiary, fontSize: 11, textAlign: "right" },
  titleBand: {
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  titleBandText: { color: "#fff", fontWeight: "800", letterSpacing: 0.8, fontSize: 12 },

  metaRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  metaCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaTitle: {
    fontSize: 10,
    color: COLORS.brandPrimary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fullRow: {
    backgroundColor: COLORS.surfaceTertiary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  fullText: { color: COLORS.onSurface, fontSize: 13 },
  kvWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kvRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 1 },
  kvK: { color: COLORS.muted, fontSize: 11 },
  kvV: { color: COLORS.onSurface, fontSize: 11, fontWeight: "700", maxWidth: "60%" },
  kvInline: { flexDirection: "row" },
  kvVInline: { color: COLORS.onSurface, fontSize: 11, fontWeight: "700" },

  tableTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.brandPrimary,
    backgroundColor: COLORS.brandTertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: COLORS.brandPrimary, paddingVertical: 6 },
  th: { color: "#fff", fontSize: 10, fontWeight: "800", paddingHorizontal: 6 },
  thNum: { flex: 1, textAlign: "right" },
  thCtr: { flex: 1, textAlign: "center" },
  tr: { flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.divider },
  td: { color: COLORS.onSurface, fontSize: 11, paddingHorizontal: 6 },
  tdNum: { flex: 1, textAlign: "right", fontVariant: ["tabular-nums"] },
  tdCtr: { flex: 1, textAlign: "center" },
  emptyItems: { textAlign: "center", color: COLORS.muted, padding: SPACING.lg },

  totalsCard: {
    marginTop: SPACING.md,
    alignSelf: "flex-end",
    width: "60%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 6 },
  totalRowFinal: { backgroundColor: COLORS.brandPrimary },
  totLabel: { color: COLORS.onSurfaceTertiary, fontSize: 12 },
  totVal: { color: COLORS.onSurface, fontWeight: "700", fontSize: 12, fontVariant: ["tabular-nums"] },
  totLabelFinal: { color: "#fff", fontWeight: "800", letterSpacing: 0.6 },
  totValFinal: { color: "#fff", fontWeight: "800", fontSize: 15, fontVariant: ["tabular-nums"] },

  obsBox: {
    marginTop: SPACING.md,
    backgroundColor: "#FFFBEB",
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  obsTitle: { color: "#B45309", fontWeight: "800", fontSize: 10, marginBottom: 4, letterSpacing: 0.6 },
  obsText: { color: COLORS.onSurface, fontSize: 12 },
  termsText: { color: COLORS.muted, fontSize: 10, marginTop: SPACING.md, lineHeight: 16 },

  statusBox: {
    marginTop: SPACING.lg,
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.brandPrimary,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statusRow: { flexDirection: "row", gap: SPACING.sm },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  statusBtnText: { fontWeight: "700", color: COLORS.onSurfaceTertiary, fontSize: 13 },

  actionsCard: {
    marginTop: SPACING.md,
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontWeight: "700", color: COLORS.onSurface, fontSize: 14 },
  actionSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  actionDivider: { height: 1, backgroundColor: COLORS.divider, marginLeft: 64 },

  actions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionSecondary: {
    flex: 1,
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
  actionSecondaryText: { color: COLORS.brandPrimary, fontWeight: "800" },
  actionPrimary: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.brandPrimary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  actionPrimaryText: { color: "#fff", fontWeight: "800" },
});
