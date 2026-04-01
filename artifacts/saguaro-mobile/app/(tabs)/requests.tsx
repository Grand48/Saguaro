import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useListEmployeeRequests,
  useCreateEmployeeRequest,
  useDeleteEmployeeRequest,
  getListEmployeeRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

type EmployeeRequest = {
  id: number;
  crewId: number;
  category: "tool" | "equipment" | "supply" | "other";
  title: string;
  description?: string | null;
  quantity: number;
  priority: "low" | "normal" | "urgent";
  status: "pending" | "fulfilled";
  fulfilledAt?: string | null;
  createdAt: string;
  crew?: { id: number; name: string; role?: string } | null;
};

const CATEGORY_CONFIG = {
  tool: { label: "Tool", icon: "hammer-outline" as const, color: "#8b5cf6" },
  equipment: { label: "Equipment", icon: "construct-outline" as const, color: "#3b82f6" },
  supply: { label: "Supply", icon: "cube-outline" as const, color: "#f59e0b" },
  other: { label: "Other", icon: "ellipsis-horizontal-circle-outline" as const, color: "#6b7280" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "#6b7280" },
  normal: { label: "Normal", color: "#3b82f6" },
  urgent: { label: "Urgent", color: "#ef4444" },
};

export default function RequestsScreen() {
  const colors = useColors();
  const qc = useQueryClient();

  const [myCrewId, setMyCrewId] = useState<number | null>(null);
  const [myCrewName, setMyCrewName] = useState<string>("");
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<"tool" | "equipment" | "supply" | "other">("supply");
  const [formQuantity, setFormQuantity] = useState("1");
  const [formPriority, setFormPriority] = useState<"low" | "normal" | "urgent">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.multiGet(["cc_crew_id", "cc_crew_name"]).then((pairs) => {
        const idStr = pairs[0][1];
        const name = pairs[1][1] ?? "";
        setMyCrewId(idStr ? parseInt(idStr) : null);
        setMyCrewName(name);
      });
    }, [])
  );

  const { data: allRequests = [], isLoading } = useListEmployeeRequests(
    {},
    { query: { refetchInterval: 15000 } }
  );

  const { mutate: createRequest } = useCreateEmployeeRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEmployeeRequestsQueryKey() });
        resetForm();
        setShowForm(false);
      },
      onError: () => Alert.alert("Error", "Failed to submit request. Please try again."),
      onSettled: () => setIsSubmitting(false),
    },
  });

  const { mutate: deleteRequest } = useDeleteEmployeeRequest({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListEmployeeRequestsQueryKey() }),
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: getListEmployeeRequestsQueryKey() });
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormCategory("supply");
    setFormQuantity("1");
    setFormPriority("normal");
  };

  const handleSubmit = () => {
    if (!formTitle.trim()) {
      Alert.alert("Missing Info", "Please enter what you need.");
      return;
    }
    if (!myCrewId) {
      Alert.alert("No Identity", "Go to More → Select Crew to set your identity first.");
      return;
    }
    setIsSubmitting(true);
    createRequest({
      data: {
        crewId: myCrewId,
        category: formCategory,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        quantity: parseInt(formQuantity) || 1,
        priority: formPriority,
      },
    });
  };

  const handleDelete = (req: EmployeeRequest) => {
    Alert.alert("Cancel Request", `Remove your request for "${req.title}"?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteRequest({ id: req.id }),
      },
    ]);
  };

  const requests = (allRequests as EmployeeRequest[]).filter((r) =>
    filter === "mine" ? r.crewId === myCrewId : true
  );
  const pending = requests.filter((r) => r.status === "pending");
  const fulfilled = requests.filter((r) => r.status === "fulfilled");

  const renderRequest = ({ item }: { item: EmployeeRequest }) => {
    const cat = CATEGORY_CONFIG[item.category];
    const pri = PRIORITY_CONFIG[item.priority];
    const isMine = item.crewId === myCrewId;
    const isFulfilled = item.status === "fulfilled";

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isFulfilled ? colors.border : colors.border,
            opacity: isFulfilled ? 0.65 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.cardTitle, { color: isFulfilled ? colors.mutedForeground : colors.text, textDecorationLine: isFulfilled ? "line-through" : "none" }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <View style={[styles.badge, { backgroundColor: cat.color + "18", borderColor: cat.color + "33" }]}>
                <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: pri.color + "18", borderColor: pri.color + "33" }]}>
                <Text style={[styles.badgeText, { color: pri.color }]}>{pri.label}</Text>
              </View>
              {item.quantity > 1 && (
                <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>×{item.quantity}</Text>
                </View>
              )}
            </View>
          </View>
          {isMine && !isFulfilled && (
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {isFulfilled && <Ionicons name="checkmark-circle" size={22} color="#22c55e" />}
        </View>
        {item.description ? (
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {filter === "all" && item.crew && (
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            <Ionicons name="person" size={11} /> {item.crew.name}
          </Text>
        )}
      </View>
    );
  };

  const s = makeStyles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="cube" size={22} color={colors.primary} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Requests</Text>
        </View>
        <TouchableOpacity
          style={[s.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (!myCrewId) {
              Alert.alert("No Identity", "Go to More → Select Crew first.");
              return;
            }
            setShowForm(true);
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter toggle */}
      <View style={[s.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["mine", "all"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTabText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f === "mine" ? "My Requests" : "All Requests"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Pending */}
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
            PENDING ({pending.length})
          </Text>
          {pending.length === 0 ? (
            <View style={[s.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="cube-outline" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No pending requests</Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginBottom: 20 }}>
              {pending.map((item) => renderRequest({ item }))}
            </View>
          )}

          {/* Fulfilled */}
          {fulfilled.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                FULFILLED ({fulfilled.length})
              </Text>
              <View style={{ gap: 10 }}>
                {fulfilled.map((item) => renderRequest({ item }))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* New Request Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[s.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>New Request</Text>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Category */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {(["tool", "equipment", "supply", "other"] as const).map((cat) => {
                  const c = CATEGORY_CONFIG[cat];
                  const isSelected = formCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        s.catBtn,
                        {
                          backgroundColor: isSelected ? c.color : colors.muted,
                          borderColor: isSelected ? c.color : colors.border,
                        },
                      ]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Ionicons name={c.icon} size={16} color={isSelected ? "#fff" : colors.mutedForeground} />
                      <Text style={[s.catBtnText, { color: isSelected ? "#fff" : colors.mutedForeground }]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Title */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>WHAT DO YOU NEED? *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 18V cordless drill, safety gloves..."
                placeholderTextColor={colors.mutedForeground}
                value={formTitle}
                onChangeText={setFormTitle}
              />
            </View>

            {/* Description */}
            <View>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>DETAILS (optional)</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Size, model, brand preferences..."
                placeholderTextColor={colors.mutedForeground}
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Quantity + Priority */}
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>QUANTITY</Text>
                <TextInput
                  style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={formQuantity}
                  onChangeText={(v) => setFormQuantity(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>PRIORITY</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                  {(["low", "normal", "urgent"] as const).map((p) => {
                    const isSelected = formPriority === p;
                    const col = PRIORITY_CONFIG[p].color;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          s.priBtn,
                          {
                            backgroundColor: isSelected ? col : colors.muted,
                            borderColor: isSelected ? col : colors.border,
                            flex: 1,
                          },
                        ]}
                        onPress={() => setFormPriority(p)}
                      >
                        <Text style={[s.priBtnText, { color: isSelected ? "#fff" : colors.mutedForeground }]}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: isSubmitting ? colors.muted : colors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    header: {
      paddingTop: 60,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
    newBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    newBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    filterBar: { flexDirection: "row", gap: 8, padding: 12, borderBottomWidth: 1 },
    filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
    filterTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyBox: { padding: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 8, marginBottom: 16 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
    modalHeader: {
      paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
    fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
    textarea: { height: 80, paddingTop: 12 },
    catBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    catBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    priBtn: { paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
    priBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
    submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  });

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 0 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  badge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8, lineHeight: 18 },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
});
