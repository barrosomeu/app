import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api, Cliente } from "@/src/api/orcamentos";
import { COLORS, RADIUS, SPACING } from "@/src/constants/brand";

export default function ClientesScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listClientes();
      setItems(data);
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = search.trim()
    ? items.filter(
        (c) =>
          c.nome.toLowerCase().includes(search.toLowerCase()) ||
          c.nif.includes(search) ||
          c.contacto.includes(search)
      )
    : items;

  function openCreate() {
    setEditing({
      id: "",
      nome: "",
      nif: "",
      contacto: "",
      morada: "",
      notas: "",
      created_at: "",
    });
    setShowForm(true);
  }

  function openEdit(c: Cliente) {
    setEditing({ ...c });
    setShowForm(true);
  }

  async function saveCliente() {
    if (!editing || !editing.nome.trim()) {
      Alert.alert("Falta o nome", "O nome é obrigatório.");
      return;
    }
    try {
      if (editing.id) {
        await api.updateCliente(editing.id, editing);
      } else {
        await api.createCliente(editing);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert("Erro", e?.message);
    }
  }

  function confirmDelete(c: Cliente) {
    Alert.alert("Apagar cliente?", `${c.nome} será removido da lista.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          await api.deleteCliente(c.id);
          load();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <Pressable style={styles.addBtn} onPress={openCreate} testID="add-cliente-btn">
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.muted} />
        <TextInput
          placeholder="Procurar por nome, NIF ou contacto"
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          testID="search-cliente"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brandPrimary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={COLORS.brandPrimary} />
          <Text style={styles.muted}>
            {search ? "Sem resultados" : "Sem clientes guardados"}
          </Text>
          {!search && (
            <Pressable style={styles.primaryBtn} onPress={openCreate}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Adicionar cliente</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              testID={`cliente-card-${item.id}`}
              onPress={() => openEdit(item)}
              style={styles.card}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.nome.substring(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.nome}</Text>
                {!!item.contacto && (
                  <Text style={styles.cardLine}>
                    <Ionicons name="call-outline" size={12} /> {item.contacto}
                  </Text>
                )}
                {!!item.nif && <Text style={styles.cardLine}>NIF: {item.nif}</Text>}
                {!!item.morada && (
                  <Text style={styles.cardLine} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} /> {item.morada}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => confirmDelete(item)}
                hitSlop={10}
                style={styles.iconBtn}
                testID={`cliente-delete-${item.id}`}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editing?.id ? "Editar Cliente" : "Novo Cliente"}
            </Text>

            <Field
              label="Nome *"
              value={editing?.nome ?? ""}
              onChangeText={(t: string) => setEditing((e) => (e ? { ...e, nome: t } : e))}
              testID="form-nome"
            />
            <Field
              label="NIF"
              value={editing?.nif ?? ""}
              onChangeText={(t: string) => setEditing((e) => (e ? { ...e, nif: t } : e))}
              keyboardType="number-pad"
              testID="form-nif"
            />
            <Field
              label="Contacto"
              value={editing?.contacto ?? ""}
              onChangeText={(t: string) => setEditing((e) => (e ? { ...e, contacto: t } : e))}
              testID="form-contacto"
            />
            <Field
              label="Morada"
              value={editing?.morada ?? ""}
              onChangeText={(t: string) => setEditing((e) => (e ? { ...e, morada: t } : e))}
              testID="form-morada"
            />
            <Field
              label="Notas"
              value={editing?.notas ?? ""}
              onChangeText={(t: string) => setEditing((e) => (e ? { ...e, notas: t } : e))}
              testID="form-notas"
              multiline
            />

            <View style={styles.modalBtns}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalSave}
                onPress={saveCliente}
                testID="save-cliente-btn"
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.modalSaveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({ label, multiline, testID, ...rest }: any) {
  return (
    <View style={{ marginBottom: SPACING.sm }}>
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
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.onSurface },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.onSurface, paddingVertical: 4 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.md, padding: SPACING.lg },
  muted: { color: COLORS.muted, fontSize: 13 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.brandPrimary,
    fontWeight: "800",
    fontSize: 18,
  },
  cardName: { fontSize: 15, fontWeight: "700", color: COLORS.onSurface },
  cardLine: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.onSurfaceTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
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
  modalBtns: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  modalCancelText: { color: COLORS.onSurfaceTertiary, fontWeight: "700" },
  modalSave: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: { color: "#fff", fontWeight: "800" },
});
