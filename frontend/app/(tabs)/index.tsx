import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { api, Orcamento } from "@/src/api/orcamentos";
import {
  COLORS,
  LOGO_URL,
  RADIUS,
  SPACING,
  STATUS_COLORS,
  STATUS_LABELS,
  fmtEuro,
  fmtDatePT,
} from "@/src/constants/brand";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "rascunho", label: "Rascunho" },
  { key: "enviado", label: "Enviado" },
  { key: "aceite", label: "Aceite" },
];

export default function OrcamentosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("todos");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listOrcamentos();
      setItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered =
    filter === "todos" ? items : items.filter((o) => o.status === filter);

  const totalSum = items.reduce((s, o) => s + (o.total || 0), 0);

  async function exportCsv() {
    if (items.length === 0) {
      Alert.alert("Sem dados", "Não há orçamentos para exportar.");
      return;
    }
    try {
      const headers = [
        "Nº",
        "Data Emissão",
        "Validade",
        "Cliente",
        "NIF",
        "Contacto",
        "Morada",
        "Obra",
        "Para Seguro",
        "Seguradora",
        "Apólice",
        "Estado",
        "Nº Itens",
        "Subtotal (€)",
        "IVA (€)",
        "Total (€)",
        "Observações",
      ];
      const esc = (v: any) => {
        const s = String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ");
        return `"${s}"`;
      };
      const num = (v: number) =>
        new Intl.NumberFormat("pt-PT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: false,
        }).format(v || 0).replace(".", ",");
      const rows = items.map((o) => [
        o.numero,
        o.data_emissao,
        o.validade_ate,
        o.cliente_nome,
        o.cliente_nif,
        o.cliente_contacto,
        o.cliente_morada,
        o.obra,
        o.para_seguro ? "Sim" : "Não",
        o.seguradora,
        o.apolice,
        o.status,
        o.items.length,
        num(o.subtotal),
        num(o.total_iva),
        num(o.total),
        o.observacoes,
      ]);
      // Excel PT-PT: separator=;
      const sep = ";";
      const csv =
        "\uFEFF" +
        [headers, ...rows].map((r) => r.map(esc).join(sep)).join("\r\n");

      const fileName = `orcamentos_construcoes_barros_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      const uri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const ok = await Sharing.isAvailableAsync();
      if (ok) {
        await Sharing.shareAsync(uri, {
          mimeType: "text/csv",
          dialogTitle: "Exportar Orçamentos",
          UTI: "public.comma-separated-values-text",
        });
      } else if (Platform.OS === "web") {
        // Web fallback: trigger download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert("Partilha indisponível", "Não foi possível partilhar o ficheiro.");
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao exportar");
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <LinearGradient
        colors={["#1E40AF", "#1B3F8B"]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.headerTitle}>Construções Barros</Text>
            <Text style={styles.headerSubtitle}>Orçamentos</Text>
          </View>
          <Pressable
            style={styles.exportBtn}
            onPress={exportCsv}
            testID="export-csv-btn"
            hitSlop={8}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Orçamentos</Text>
            <Text style={styles.statValue}>{items.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Valor Total</Text>
            <Text style={styles.statValue}>{fmtEuro(totalSum)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* FILTERS */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                testID={`filter-${f.key}`}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center} testID="orcamentos-loading">
          <ActivityIndicator color={COLORS.brandPrimary} />
          <Text style={styles.muted}>A carregar orçamentos…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={42} color={COLORS.error} />
          <Text style={styles.muted}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn} testID="retry-button">
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center} testID="orcamentos-empty">
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.brandPrimary} />
          </View>
          <Text style={styles.emptyTitle}>Sem orçamentos</Text>
          <Text style={styles.muted}>Cria o teu primeiro orçamento</Text>
          <Pressable
            testID="empty-create-btn"
            onPress={() => router.push("/(tabs)/novo")}
            style={styles.primaryBtn}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Criar Orçamento</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="orcamentos-list"
          data={filtered}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={COLORS.brandPrimary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`orcamento-card-${item.numero}`}
              onPress={() => router.push(`/orcamento/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.cardTop}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>Nº {item.numero}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: STATUS_COLORS[item.status] + "1A" },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_COLORS[item.status] },
                    ]}
                  />
                  <Text
                    style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}
                  >
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>

              <Text style={styles.clientName} numberOfLines={1}>
                {item.cliente_nome || "(Sem cliente)"}
              </Text>
              {!!item.obra && (
                <Text style={styles.obraText} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} color={COLORS.muted} />{" "}
                  {item.obra}
                </Text>
              )}

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.dateLabel}>Emissão</Text>
                  <Text style={styles.dateValue}>{fmtDatePT(item.data_emissao)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.dateLabel}>Total</Text>
                  <Text style={styles.totalValue}>{fmtEuro(item.total)}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: "#fff",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSubtitle: { color: "#E0E7FF", fontSize: 13, marginTop: 2 },
  exportBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statLabel: { color: "#C7D2FE", fontSize: 11, fontWeight: "600" },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },

  filterWrap: { height: 56, justifyContent: "center" },
  filterRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: "center" },
  chip: {
    paddingHorizontal: SPACING.lg,
    height: 36,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: COLORS.brandPrimary,
    borderColor: COLORS.brandPrimary,
  },
  chipText: { color: COLORS.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.onSurface },
  muted: { color: COLORS.muted, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
    shadowColor: COLORS.brandPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  card: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  numBadge: {
    backgroundColor: COLORS.brandTertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  numBadgeText: {
    color: COLORS.brandPrimary,
    fontWeight: "800",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  clientName: { fontSize: 16, fontWeight: "700", color: COLORS.onSurface },
  obraText: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  dateLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "600" },
  dateValue: { color: COLORS.onSurface, fontSize: 13, fontWeight: "600", marginTop: 2 },
  totalValue: {
    color: COLORS.brandPrimary,
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
});
