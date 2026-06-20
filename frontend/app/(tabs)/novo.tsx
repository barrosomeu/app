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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { api, OrcamentoItem, Cliente, Servico } from "@/src/api/orcamentos";
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
  const params = useLocalSearchParams<{ editId?: string; cloneId?: string }>();
  const editId = typeof params.editId === "string" ? params.editId : undefined;
  const cloneId = typeof params.cloneId === "string" ? params.cloneId : undefined;
  const mode: "new" | "edit" | "clone" = editId ? "edit" : cloneId ? "clone" : "new";

  const [autoNumero, setAutoNumero] = useState<string>("…");
  const [numero, setNumero] = useState<string>("");
  const [numeroEdited, setNumeroEdited] = useState(false);
  const [showNumeroEdit, setShowNumeroEdit] = useState(false);

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

  // Catalogs
  const [clientesDB, setClientesDB] = useState<Cliente[]>([]);
  const [servicosDB, setServicosDB] = useState<Servico[]>([]);
  const [showClientePicker, setShowClientePicker] = useState(false);
  const [showServicoPicker, setShowServicoPicker] = useState(false);
  const [clienteQuery, setClienteQuery] = useState("");
  const [servicoQuery, setServicoQuery] = useState("");

  useEffect(() => {
    api.nextNumber()
      .then((r) => {
        setAutoNumero(r.numero);
        if (!numeroEdited && mode === "new") setNumero(r.numero);
        if (mode === "clone" && !numeroEdited) setNumero(r.numero);
      })
      .catch(() => setAutoNumero("—"));
    api.listClientes().then(setClientesDB).catch(() => {});
    api.listServicos().then(setServicosDB).catch(() => {});
  }, []);

  // Load existing orçamento for edit/clone
  useFocusEffect(
    useCallback(() => {
      const sourceId = editId || cloneId;
      if (!sourceId) return;
      let cancelled = false;
      (async () => {
        try {
          const o = await api.getOrcamento(sourceId);
          if (cancelled) return;
          setParaSeguro(o.para_seguro);
          setCliente({
            nome: o.cliente_nome,
            nif: o.cliente_nif,
            contacto: o.cliente_contacto,
            morada: o.cliente_morada,
          });
          setSinistro({
            segurado: o.segurado,
            seguradora: o.seguradora,
            apolice: o.apolice,
            data: o.sinistro_data,
            obra: o.obra,
            vistoria: o.vistoria,
          });
          setItems(o.items.map((it) => ({ ...it, id: it.id || genId() })));
          setObservacoes(o.observacoes);
          setValidadeDias(String(o.validade_dias || 30));
          if (mode === "edit") {
            setNumero(o.numero);
            setNumeroEdited(true);
          }
        } catch (e: any) {
          Alert.alert("Erro", e?.message ?? "Erro a carregar orçamento");
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [editId, cloneId, mode])
  );

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

  function pickCliente(c: Cliente) {
    setCliente({
      nome: c.nome,
      nif: c.nif,
      contacto: c.contacto,
      morada: c.morada,
    });
    setShowClientePicker(false);
    Haptics.selectionAsync();
  }

  function pickServico(s: Servico) {
    setDraft({
      id: "",
      descricao: s.descricao,
      quantidade: 1,
      unidade: s.unidade,
      preco_unitario: s.preco_unitario,
      iva: s.iva,
    });
    setShowServicoPicker(false);
    Haptics.selectionAsync();
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
    if (!numero.trim() || !/^\d{4,}$/.test(numero.trim())) {
      Alert.alert("Número inválido", "O número deve ter pelo menos 4 dígitos (ex: 2026111).");
      return;
    }
    try {
      setSaving(true);
      const payload = {
        numero: numero.trim(),
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
      };
      let orc;
      if (mode === "edit" && editId) {
        orc = await api.updateOrcamento(editId, payload as any);
      } else {
        orc = await api.createOrcamento({ ...payload, status: "rascunho" } as any);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // reset only in new mode
      if (mode === "new") {
        setCliente({ nome: "", nif: "", contacto: "", morada: "" });
        setSinistro({ segurado: "", seguradora: "", apolice: "", data: "", obra: "", vistoria: "" });
        setItems([]);
        setObservacoes("");
        setNumeroEdited(false);
        const r = await api.nextNumber();
        setAutoNumero(r.numero);
        setNumero(r.numero);
      }
      if (goPreview) {
        router.replace(`/orcamento/${orc.id}`);
      } else {
        router.replace("/(tabs)");
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
        {mode !== "new" && (
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 8 }}>
            <Ionicons name="chevron-back" size={26} color={COLORS.onSurface} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          {mode === "edit" ? "Editar Orçamento" : mode === "clone" ? "Clonar Orçamento" : "Novo Orçamento"}
        </Text>
        <Pressable
          style={styles.numPill}
          onPress={() => setShowNumeroEdit(true)}
          testID="numero-edit-btn"
        >
          <Text style={styles.numPillText}>Nº {numero || autoNumero}</Text>
          <Ionicons name="pencil" size={12} color={COLORS.brandPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
        testID="novo-form-scroll"
      >
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
        <View style={styles.sectionTitleRow}>
          <Ionicons name="person" size={16} color={COLORS.brandPrimary} />
          <Text style={styles.sectionTitle}>Cliente</Text>
        </View>

        {/* Dual picker: Existente vs Novo */}
        <View style={styles.clientePickerRow}>
          <Pressable
            style={[styles.clientePickerBtn, clientesDB.length === 0 && { opacity: 0.5 }]}
            disabled={clientesDB.length === 0}
            onPress={() => {
              setClienteQuery("");
              setShowClientePicker(true);
            }}
            testID="cliente-picker-btn"
          >
            <Ionicons name="people" size={22} color={COLORS.brandPrimary} />
            <Text style={styles.clientePickerTitle}>Cliente Existente</Text>
            <Text style={styles.clientePickerSub}>
              {clientesDB.length} guardado{clientesDB.length === 1 ? "" : "s"}
            </Text>
          </Pressable>
          <Pressable
            style={styles.clientePickerBtn}
            onPress={() => {
              setCliente({ nome: "", nif: "", contacto: "", morada: "" });
              Haptics.selectionAsync();
            }}
            testID="cliente-novo-btn"
          >
            <Ionicons name="person-add" size={22} color="#B45309" />
            <Text style={[styles.clientePickerTitle, { color: "#B45309" }]}>Cliente Novo</Text>
            <Text style={styles.clientePickerSub}>Preencher abaixo</Text>
          </Pressable>
        </View>

        <FormField
          label="Nome"
          value={cliente.nome}
          onChangeText={(t: string) => setCliente({ ...cliente, nome: t })}
          placeholder="Nome do cliente"
          testID="cliente-nome"
        />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <FormField
              label="NIF"
              value={cliente.nif}
              onChangeText={(t: string) => setCliente({ ...cliente, nif: t })}
              placeholder="123456789"
              keyboardType="number-pad"
              testID="cliente-nif"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Contacto"
              value={cliente.contacto}
              onChangeText={(t: string) => setCliente({ ...cliente, contacto: t })}
              placeholder="Telefone/Email"
              testID="cliente-contacto"
            />
          </View>
        </View>
        <FormField
          label="Morada"
          value={cliente.morada}
          onChangeText={(t: string) => setCliente({ ...cliente, morada: t })}
          placeholder="Morada / Local da obra"
          testID="cliente-morada"
        />

        {paraSeguro && (
          <>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.brandPrimary} />
              <Text style={styles.sectionTitle}>Sinistro / Seguradora</Text>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Segurado"
                  value={sinistro.segurado}
                  onChangeText={(t: string) => setSinistro({ ...sinistro, segurado: t })}
                  placeholder="Nome do segurado"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Seguradora"
                  value={sinistro.seguradora}
                  onChangeText={(t: string) => setSinistro({ ...sinistro, seguradora: t })}
                  placeholder="Companhia"
                />
              </View>
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Apólice"
                  value={sinistro.apolice}
                  onChangeText={(t: string) => setSinistro({ ...sinistro, apolice: t })}
                  placeholder="Nº apólice"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Sinistro em"
                  value={sinistro.data}
                  onChangeText={(t: string) => setSinistro({ ...sinistro, data: t })}
                  placeholder="DD/MM/AAAA"
                />
              </View>
            </View>
            <FormField
              label="Obra / Local"
              value={sinistro.obra}
              onChangeText={(t: string) => setSinistro({ ...sinistro, obra: t })}
              placeholder="Local da intervenção"
            />
            <FormField
              label="Vistoria"
              value={sinistro.vistoria}
              onChangeText={(t: string) => setSinistro({ ...sinistro, vistoria: t })}
              placeholder="Nome do perito / data"
            />
          </>
        )}

        {/* ITENS */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="hammer" size={16} color={COLORS.brandPrimary} />
          <Text style={styles.sectionTitle}>Trabalhos</Text>
        </View>

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
            <View style={styles.itemFormHead}>
              <Text style={styles.itemFormTitle}>Novo trabalho</Text>
              {servicosDB.length > 0 && (
                <Pressable
                  style={styles.linkBtn}
                  onPress={() => {
                    setServicoQuery("");
                    setShowServicoPicker(true);
                  }}
                  testID="servico-picker-btn"
                >
                  <Ionicons name="bookmark" size={12} color={COLORS.brandPrimary} />
                  <Text style={styles.linkText}>Catálogo</Text>
                </Pressable>
              )}
            </View>
            <FormField
              label="Descrição"
              value={draft.descricao}
              onChangeText={(t: string) => setDraft({ ...draft, descricao: t })}
              placeholder="Ex.: Lavar e aplicação de massa WEBER"
              multiline
              testID="draft-descricao"
            />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Qtd"
                  value={String(draft.quantidade)}
                  onChangeText={(t: string) =>
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
                  onChangeText={(t: string) =>
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

        <View style={styles.sectionTitleRow}>
          <Ionicons name="document-text" size={16} color={COLORS.brandPrimary} />
          <Text style={styles.sectionTitle}>Observações</Text>
        </View>
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

        <View style={styles.sectionTitleRow}>
          <Ionicons name="time" size={16} color={COLORS.brandPrimary} />
          <Text style={styles.sectionTitle}>Validade</Text>
        </View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {["15", "30", "60", "90"].map((d) => {
            const active = validadeDias === d;
            return (
              <Pressable
                key={d}
                style={[styles.miniChip, active && styles.miniChipActive]}
                onPress={() => setValidadeDias(d)}
              >
                <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>
                  {d} dias
                </Text>
              </Pressable>
            );
          })}
        </View>

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

      {/* NUMERO EDIT MODAL */}
      <Modal
        visible={showNumeroEdit}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNumeroEdit(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowNumeroEdit(false)}>
          <Pressable style={styles.numeroModal} onPress={() => {}}>
            <Text style={styles.numeroModalTitle}>Número do orçamento</Text>
            <Text style={styles.muted}>
              Por defeito atribuído automaticamente: {autoNumero}
            </Text>
            <TextInput
              style={[styles.input, { marginTop: SPACING.md, fontSize: 22, fontWeight: "800", textAlign: "center" }]}
              value={numero}
              onChangeText={(t) => {
                setNumero(t);
                setNumeroEdited(true);
              }}
              keyboardType="number-pad"
              testID="numero-edit-input"
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => {
                  setNumero(autoNumero);
                  setNumeroEdited(false);
                  setShowNumeroEdit(false);
                }}
                testID="numero-reset"
              >
                <Ionicons name="refresh" size={16} color={COLORS.brandPrimary} />
                <Text style={styles.secondaryBtnText}>Auto</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={() => setShowNumeroEdit(false)}
                testID="numero-confirm"
              >
                <Text style={styles.primaryBtnText}>OK</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CLIENTE PICKER */}
      <Modal
        visible={showClientePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClientePicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={() => setShowClientePicker(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Escolher Cliente</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={[styles.searchWrap, { margin: SPACING.lg }]}>
            <Ionicons name="search" size={16} color={COLORS.muted} />
            <TextInput
              value={clienteQuery}
              onChangeText={setClienteQuery}
              placeholder="Procurar cliente…"
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0 }}>
            {clientesDB
              .filter((c) => c.nome.toLowerCase().includes(clienteQuery.toLowerCase()))
              .map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.pickerItem}
                  onPress={() => pickCliente(c)}
                  testID={`pick-cliente-${c.nome}`}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{c.nome.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{c.nome}</Text>
                    <Text style={styles.muted}>{c.contacto || c.nif || c.morada || "—"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                </Pressable>
              ))}
          </ScrollView>
        </View>
      </Modal>

      {/* SERVIÇO PICKER */}
      <Modal
        visible={showServicoPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServicoPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={() => setShowServicoPicker(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Catálogo</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={[styles.searchWrap, { margin: SPACING.lg }]}>
            <Ionicons name="search" size={16} color={COLORS.muted} />
            <TextInput
              value={servicoQuery}
              onChangeText={setServicoQuery}
              placeholder="Procurar serviço…"
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0 }}>
            {servicosDB
              .filter((s) => s.descricao.toLowerCase().includes(servicoQuery.toLowerCase()))
              .map((s) => (
                <Pressable
                  key={s.id}
                  style={styles.pickerItem}
                  onPress={() => pickServico(s)}
                  testID={`pick-servico-${s.id}`}
                >
                  <View style={[styles.avatar, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="construct" size={18} color="#B45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName} numberOfLines={2}>{s.descricao}</Text>
                    <Text style={styles.muted}>
                      {fmtEuro(s.preco_unitario)} / {s.unidade}  ·  usado {s.uso_count}×
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                </Pressable>
              ))}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  linkBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.brandTertiary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  linkText: { color: COLORS.brandPrimary, fontWeight: "700", fontSize: 11 },
  clientePickerRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  clientePickerBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    gap: 4,
  },
  clientePickerTitle: {
    fontWeight: "800",
    fontSize: 13,
    color: COLORS.brandPrimary,
    marginTop: 4,
  },
  clientePickerSub: {
    color: COLORS.muted,
    fontSize: 11,
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
  itemFormHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  itemFormTitle: {
    fontWeight: "800",
    fontSize: 14,
    color: COLORS.brandPrimary,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  numeroModal: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  numeroModalTitle: { fontSize: 16, fontWeight: "800", color: COLORS.onSurface },

  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: { color: COLORS.muted, fontWeight: "600", width: 60 },
  modalTitle: { fontWeight: "800", fontSize: 16, color: COLORS.onSurface },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: COLORS.onSurface,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: "#fff",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  pickerName: { fontWeight: "700", color: COLORS.onSurface, fontSize: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.brandPrimary, fontWeight: "800" },
});
