import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useGetActiveTimeEntry,
  useClockIn,
  useClockOut,
  useListCrewTimeEntries,
  useListCrew,
} from "@workspace/api-client-react";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ClockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [crewId, setCrewId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem("cc_crew_id").then((val) => {
      if (val) setCrewId(parseInt(val));
    });
  }, []);

  const { data: activeEntry, isLoading: loadingEntry, refetch: refetchActive } =
    useGetActiveTimeEntry(crewId!, {
      query: { enabled: !!crewId, refetchInterval: 30000 }
    });

  const { data: timesheet } =
    useListCrewTimeEntries(crewId!, {
      query: { enabled: !!crewId }
    });

  const { data: allCrew } = useListCrew({ query: {} });

  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // Running timer
  useEffect(() => {
    if (!activeEntry?.clockIn) { setElapsed(0); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(activeEntry.clockIn).getTime()) / 1000);
      setElapsed(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeEntry?.clockIn]);

  const handleClockIn = useCallback(async () => {
    if (!crewId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clockIn.mutate(
      { data: { crewId } },
      {
        onSuccess: () => { refetchActive(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
        onError: () => Alert.alert("Error", "Failed to clock in."),
      }
    );
  }, [crewId, clockIn, refetchActive]);

  const handleClockOut = useCallback(async () => {
    if (!crewId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clockOut.mutate(
      { data: { crewId } },
      {
        onSuccess: () => { refetchActive(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
        onError: () => Alert.alert("Error", "Failed to clock out."),
      }
    );
  }, [crewId, clockOut, refetchActive]);

  const isClockedIn = !!activeEntry?.clockIn && !activeEntry?.clockOut;
  const isPending = clockIn.isPending || clockOut.isPending;

  const s = makeStyles(colors);

  const selectCrew = async (id: number) => {
    await AsyncStorage.setItem("cc_crew_id", String(id));
    setCrewId(id);
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 90 }}>
        <View style={s.headerRow}>
          <Text style={[s.title, { color: colors.foreground }]}>Time Clock</Text>
        </View>

        {/* Crew selector if no stored ID */}
        {!crewId && (
          <View style={[s.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>SELECT YOUR NAME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {(allCrew ?? []).map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => selectCrew(c.id)}
                  style={[s.crewChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[s.crewChipText, { color: colors.foreground }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Main Clock Card */}
        {crewId && (
          <>
            {loadingEntry ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
            ) : (
              <View style={[s.clockCard, {
                backgroundColor: isClockedIn ? colors.primary + "12" : colors.card,
                borderColor: isClockedIn ? colors.primary : colors.border,
              }]}>
                <View style={[s.clockStatusDot, { backgroundColor: isClockedIn ? colors.primary : colors.mutedForeground }]} />
                <Text style={[s.clockStatus, { color: isClockedIn ? colors.primary : colors.mutedForeground }]}>
                  {isClockedIn ? "CLOCKED IN" : "CLOCKED OUT"}
                </Text>
                <Text style={[s.timer, { color: colors.foreground }]}>
                  {isClockedIn ? formatDuration(elapsed) : "00:00:00"}
                </Text>
                {isClockedIn && activeEntry?.clockIn && (
                  <Text style={[s.sinceText, { color: colors.mutedForeground }]}>
                    Since {formatTime(activeEntry.clockIn)}
                  </Text>
                )}

                <TouchableOpacity
                  style={[
                    s.clockButton,
                    {
                      backgroundColor: isClockedIn ? colors.destructive : colors.primary,
                      opacity: isPending ? 0.6 : 1,
                    },
                  ]}
                  onPress={isClockedIn ? handleClockOut : handleClockIn}
                  disabled={isPending}
                  activeOpacity={0.8}
                >
                  {isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={isClockedIn ? "stop-circle-outline" : "play-circle-outline"}
                        size={24}
                        color="#fff"
                      />
                      <Text style={s.clockButtonText}>
                        {isClockedIn ? "Clock Out" : "Clock In"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { AsyncStorage.removeItem("cc_crew_id"); setCrewId(null); }} style={{ marginTop: 8 }}>
                  <Text style={[s.switchText, { color: colors.mutedForeground }]}>Switch crew member</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Recent entries */}
            {timesheet && timesheet.length > 0 && (
              <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
                <Text style={[s.sectionTitle, { color: colors.foreground }]}>Recent Hours</Text>
                {timesheet.slice(0, 5).map((entry: any) => (
                  <View key={entry.id} style={[s.entryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View>
                      <Text style={[s.entryDate, { color: colors.foreground }]}>{formatDate(entry.clockIn)}</Text>
                      <Text style={[s.entryTime, { color: colors.mutedForeground }]}>
                        {formatTime(entry.clockIn)} {entry.clockOut ? `– ${formatTime(entry.clockOut)}` : "(active)"}
                      </Text>
                    </View>
                    {entry.duration && (
                      <Text style={[s.entryDuration, { color: colors.primary }]}>
                        {(entry.duration / 3600).toFixed(1)}h
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {!crewId && (
          <View style={s.emptyState}>
            <Ionicons name="person-outline" size={48} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Select your name above to get started</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    headerRow: { paddingHorizontal: 20, marginBottom: 20 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold" },
    section: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 16 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 10 },
    crewChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    crewChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    clockCard: {
      marginHorizontal: 20, borderRadius: 24, borderWidth: 2,
      padding: 28, alignItems: "center", gap: 8, marginBottom: 20,
    },
    clockStatusDot: { width: 10, height: 10, borderRadius: 5 },
    clockStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
    timer: { fontSize: 56, fontFamily: "Inter_700Bold", letterSpacing: -2, marginVertical: 8 },
    sinceText: { fontSize: 13, fontFamily: "Inter_400Regular" },
    clockButton: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, marginTop: 12,
    },
    clockButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
    switchText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
    entryRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
    },
    entryDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    entryTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    entryDuration: { fontSize: 16, fontFamily: "Inter_700Bold" },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 40 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
