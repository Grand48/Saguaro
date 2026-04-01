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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useListSideQuests,
  useUpdateSideQuest,
  getListSideQuestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

type SideQuest = {
  id: number;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "claimed" | "completed";
  adminLocked: boolean;
  claimedByCrewId?: number | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  claimedBy?: { id: number; name: string } | null;
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "#6b7280" },
  medium: { label: "Medium", color: "#f59e0b" },
  high: { label: "High", color: "#ef4444" },
  urgent: { label: "Urgent", color: "#dc2626" },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "#6b7280" },
  claimed: { label: "Claimed", color: "#3b82f6" },
  completed: { label: "Completed", color: "#22c55e" },
};

export default function QuestsScreen() {
  const colors = useColors();
  const qc = useQueryClient();

  const [myCrewId, setMyCrewId] = useState<number | null>(null);
  const [myCrewName, setMyCrewName] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "available" | "mine" | "completed">("all");
  const [detailQuest, setDetailQuest] = useState<SideQuest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const { data: quests = [], isLoading } = useListSideQuests({
    query: { refetchInterval: 15000 },
  });

  const { mutate: updateQuest, isPending: isUpdating } = useUpdateSideQuest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSideQuestsQueryKey() });
        setDetailQuest(null);
      },
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: getListSideQuestsQueryKey() });
    setRefreshing(false);
  };

  const filteredQuests = (quests as SideQuest[]).filter((q) => {
    if (filter === "available") return !q.adminLocked && q.status === "open";
    if (filter === "mine") return q.claimedByCrewId === myCrewId && q.status === "claimed";
    if (filter === "completed") return q.status === "completed";
    return true;
  });

  const handleClaim = (quest: SideQuest) => {
    if (!myCrewId) {
      Alert.alert("No Identity", "Go to More → Select Crew to set your identity first.");
      return;
    }
    if (quest.adminLocked) {
      Alert.alert("Locked", "This quest is locked by admin and cannot be claimed yet.");
      return;
    }
    Alert.alert("Claim Quest", `Claim "${quest.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Claim",
        onPress: () =>
          updateQuest({
            id: quest.id,
            data: { status: "claimed", claimedByCrewId: myCrewId },
          }),
      },
    ]);
  };

  const handleComplete = (quest: SideQuest) => {
    Alert.alert("Complete Quest", `Mark "${quest.title}" as complete?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: () => updateQuest({ id: quest.id, data: { status: "completed" } }),
      },
    ]);
  };

  const handleUnclaim = (quest: SideQuest) => {
    Alert.alert("Unclaim Quest", `Release "${quest.title}" back to open?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Release",
        style: "destructive",
        onPress: () =>
          updateQuest({
            id: quest.id,
            data: { status: "open", claimedByCrewId: null },
          }),
      },
    ]);
  };

  const renderQuest = ({ item }: { item: SideQuest }) => {
    const isLocked = item.adminLocked;
    const isMine = item.claimedByCrewId === myCrewId;
    const priorityColor = PRIORITY_CONFIG[item.priority]?.color ?? "#6b7280";
    const statusColor = STATUS_CONFIG[item.status]?.color ?? "#6b7280";
    const isCompleted = item.status === "completed";

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: isLocked && item.status === "open" ? 0.6 : 1,
          },
        ]}
        onPress={() => setDetailQuest(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            {isLocked && item.status === "open" ? (
              <Ionicons name="lock-closed" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            ) : isCompleted ? (
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="flash" size={18} color={priorityColor} style={{ marginRight: 8 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.questTitle,
                  {
                    color: isLocked && item.status === "open" ? colors.mutedForeground : colors.text,
                    textDecorationLine: isCompleted ? "line-through" : "none",
                  },
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {item.description ? (
                <Text style={[styles.questDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.badge, { backgroundColor: priorityColor + "22", borderColor: priorityColor + "44" }]}>
              <Text style={[styles.badgeText, { color: priorityColor }]}>
                {PRIORITY_CONFIG[item.priority]?.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.badge, { backgroundColor: statusColor + "22", borderColor: statusColor + "44" }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_CONFIG[item.status]?.label}
            </Text>
          </View>
          {item.claimedBy && (
            <Text style={[styles.claimedByText, { color: colors.mutedForeground }]}>
              <Ionicons name="person" size={11} /> {item.claimedBy.name}
            </Text>
          )}
          {isLocked && item.status === "open" && (
            <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
              Admin unlock required
            </Text>
          )}
        </View>

        {/* Action buttons */}
        {!isLocked && item.status === "open" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleClaim(item)}
          >
            <Text style={styles.actionBtnText}>Claim Quest</Text>
          </TouchableOpacity>
        )}
        {isMine && item.status === "claimed" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#22c55e", flex: 1 }]}
              onPress={() => handleComplete(item)}
            >
              <Text style={styles.actionBtnText}>Mark Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.muted, flex: 1 }]}
              onPress={() => handleUnclaim(item)}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Release</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="flash" size={22} color={colors.primary} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Side Quests</Text>
        </View>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
          {(quests as SideQuest[]).filter((q) => !q.adminLocked && q.status === "open").length} available
        </Text>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" }}
      >
        {(["all", "available", "mine", "completed"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterTab,
              { borderColor: filter === f ? colors.primary : colors.border },
              filter === f && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                s.filterTabText,
                { color: filter === f ? "#fff" : colors.mutedForeground },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filteredQuests.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="flash-outline" size={48} color={colors.mutedForeground} />
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
            {filter === "available" ? "No available quests right now" : "No quests found"}
          </Text>
          {filter === "available" && (
            <Text style={[s.emptySubText, { color: colors.mutedForeground }]}>
              Admin must unlock a quest before it can be claimed
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredQuests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderQuest}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!detailQuest} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailQuest(null)}>
        {detailQuest && (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[s.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]} numberOfLines={2}>
                {detailQuest.title}
              </Text>
              <TouchableOpacity onPress={() => setDetailQuest(null)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              {detailQuest.adminLocked && detailQuest.status === "open" && (
                <View style={[s.lockedBanner, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b44" }]}>
                  <Ionicons name="lock-closed" size={16} color="#f59e0b" />
                  <Text style={{ color: "#f59e0b", fontSize: 13, flex: 1, marginLeft: 8 }}>
                    This quest is locked. An admin must unlock it before it can be claimed.
                  </Text>
                </View>
              )}

              <View style={[s.detailRow, { borderColor: colors.border }]}>
                <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>Priority</Text>
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: PRIORITY_CONFIG[detailQuest.priority]?.color + "22",
                      borderColor: PRIORITY_CONFIG[detailQuest.priority]?.color + "44",
                    },
                  ]}
                >
                  <Text style={[s.badgeText, { color: PRIORITY_CONFIG[detailQuest.priority]?.color }]}>
                    {PRIORITY_CONFIG[detailQuest.priority]?.label}
                  </Text>
                </View>
              </View>

              <View style={[s.detailRow, { borderColor: colors.border }]}>
                <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>Status</Text>
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor: STATUS_CONFIG[detailQuest.status]?.color + "22",
                      borderColor: STATUS_CONFIG[detailQuest.status]?.color + "44",
                    },
                  ]}
                >
                  <Text style={[s.badgeText, { color: STATUS_CONFIG[detailQuest.status]?.color }]}>
                    {STATUS_CONFIG[detailQuest.status]?.label}
                  </Text>
                </View>
              </View>

              {detailQuest.claimedBy && (
                <View style={[s.detailRow, { borderColor: colors.border }]}>
                  <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>Claimed By</Text>
                  <Text style={{ color: colors.text, fontSize: 14, fontFamily: "Inter_500Medium" }}>
                    {detailQuest.claimedBy.name}
                  </Text>
                </View>
              )}

              {detailQuest.description ? (
                <View style={{ gap: 8 }}>
                  <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>Description</Text>
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>{detailQuest.description}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
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
    headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
    card: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      gap: 0,
    },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
    cardLeft: { flexDirection: "row", flex: 1, alignItems: "flex-start" },
    cardRight: { marginLeft: 8 },
    questTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
    questDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 18 },
    cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    claimedByText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    lockedText: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic", marginLeft: "auto" },
    actionBtn: {
      marginTop: 10,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
    filterTab: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderWidth: 1,
    },
    filterTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
    emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", textAlign: "center" },
    emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
    modalHeader: {
      paddingTop: 20,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
    lockedBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      gap: 4,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  });

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardLeft: { flexDirection: "row", flex: 1, alignItems: "flex-start" },
  cardRight: { marginLeft: 8 },
  questTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  questDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 18 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  claimedByText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lockedText: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  actionBtn: { marginTop: 10, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
