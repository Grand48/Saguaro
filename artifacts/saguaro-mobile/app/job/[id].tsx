import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Image, TextInput, KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  useGetJob,
  useListJobTasks,
  useListJobContacts,
  useListJobMessages,
  useListJobPhotos,
  useSendMessage,
  useListJobForms,
  useCreateJobForm,
  useSubmitJobForm,
  useDeleteJobForm,
  getListJobFormsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import SignaturePad, { pathsToSvgString } from "@/components/SignaturePad";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "#2563eb", bg: "#dbeafe" },
  in_progress: { label: "In Progress", color: "#d97706", bg: "#fef3c7" },
  completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2" },
};

const TABS = ["Overview", "Tasks", "Crew", "Chat", "Photos", "Contacts", "Forms"] as const;

const JOB_COMPLETION_FIELDS = [
  { key: "work_description", label: "Work completed", type: "textarea" },
  { key: "materials_used", label: "Materials used", type: "textarea" },
  { key: "issues_notes", label: "Issues / notes", type: "textarea" },
  { key: "client_present", label: "Client on site?", type: "yesno" },
  { key: "walkthrough_completed", label: "Walkthrough done?", type: "yesno" },
  { key: "site_cleaned", label: "Site cleaned?", type: "yesno" },
] as const;

const QC_FIELDS = [
  { key: "inspector_name", label: "Inspector name", type: "text" },
  { key: "meets_specifications", label: "Meets specs?", type: "yesno" },
  { key: "safety_protocols", label: "Safety followed?", type: "yesno" },
  { key: "site_cleanliness", label: "Site clean?", type: "yesno" },
  { key: "deficiencies", label: "Deficiencies", type: "textarea" },
  { key: "deficiencies_addressed", label: "Issues addressed?", type: "yesno" },
  { key: "photos_taken", label: "Photos taken?", type: "yesno" },
] as const;

function InfoRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, width: 60 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, flex: 1 }}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, text, colors }: { icon: any; text: string; colors: any }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
      <Ionicons name={icon} size={40} color={colors.mutedForeground} />
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{text}</Text>
    </View>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = parseInt(id ?? "0");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const [message, setMessage] = useState("");
  const [crewId, setCrewId] = useState<number | null>(null);
  const qc = useQueryClient();

  // Forms tab state
  const [formView, setFormView] = useState<"list" | "fill" | "sign">("list");
  const [activeFormId, setActiveFormId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [signerName, setSignerName] = useState("");
  const [sigPaths, setSigPaths] = useState<string[]>([]);
  const [sigEmpty, setSigEmpty] = useState(true);

  React.useEffect(() => {
    AsyncStorage.getItem("cc_crew_id").then((v) => { if (v) setCrewId(parseInt(v)); });
  }, []);

  const { data: job, isLoading } = useGetJob(jobId, { query: { enabled: !!jobId } });
  const { data: tasks } = useListJobTasks(jobId, { query: { enabled: !!jobId } });
  const { data: contacts } = useListJobContacts(jobId, { query: { enabled: !!jobId } });
  const { data: messages, refetch: refetchMessages } = useListJobMessages(jobId, {
    query: { enabled: !!jobId && activeTab === "Chat", refetchInterval: 10000 }
  });
  const { data: photos } = useListJobPhotos(jobId, {
    query: { enabled: !!jobId && activeTab === "Photos" }
  });
  const sendMessage = useSendMessage();
  const { data: forms = [] } = useListJobForms(jobId, { query: { enabled: !!jobId && activeTab === "Forms" } });
  const { mutate: createForm, isPending: isCreatingForm } = useCreateJobForm({
    mutation: {
      onSuccess: (form: any) => {
        qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) });
        setActiveFormId(form.id);
        setFormValues({});
        setFormView("fill");
      },
    },
  });
  const { mutate: submitForm, isPending: isSubmittingForm } = useSubmitJobForm({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) });
        setFormView("list");
        setSigPaths([]);
        setSigEmpty(true);
        setSignerName("");
      },
    },
  });
  const { mutate: deleteForm } = useDeleteJobForm({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) }) },
  });

  const activeFormRecord = (forms as any[]).find((f) => f.id === activeFormId);
  const activeFieldDefs = activeFormRecord?.formType === "quality_control" ? QC_FIELDS : JOB_COMPLETION_FIELDS;

  const s = makeStyles(colors);
  const cfg = job ? (STATUS_CONFIG[job.status] ?? STATUS_CONFIG.scheduled) : null;

  const handleSend = () => {
    if (!message.trim() || !crewId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = message.trim();
    setMessage("");
    sendMessage.mutate(
      { id: jobId, data: { crewId, message: text } as any },
      { onSuccess: () => refetchMessages() }
    );
  };

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Job not found</Text>
      </View>
    );
  }

  const completedTasks = (tasks ?? []).filter((t: any) => t.completed).length;
  const totalTasks = (tasks ?? []).length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{job.name}</Text>
          {cfg && (
            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[s.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chat tab gets its own keyboard-aware layout */}
      {activeTab === "Chat" ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={[...(messages ?? [])].reverse()}
            keyExtractor={(item: any) => String(item.id)}
            inverted
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 8 }}
            scrollEnabled={!!messages && messages.length > 0}
            ListEmptyComponent={<EmptyState icon="chatbubbles-outline" text="No messages yet — say something!" colors={colors} />}
            renderItem={({ item }: { item: any }) => {
              const isMe = item.crewId === crewId;
              const initials = item.crewName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") ?? "?";
              return (
                <View style={[s.msgRow, isMe && s.msgRowMe]}>
                  {!isMe && (
                    <View style={[s.msgAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[s.msgInitials, { color: colors.primary }]}>{initials}</Text>
                    </View>
                  )}
                  <View style={{ maxWidth: "75%" }}>
                    {!isMe && (
                      <Text style={[s.msgSender, { color: colors.mutedForeground }]}>{item.crewName}</Text>
                    )}
                    <View style={[
                      s.msgBubble,
                      isMe
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                    ]}>
                      <Text style={[s.msgText, { color: isMe ? "#fff" : colors.foreground }]}>{item.message}</Text>
                    </View>
                    <Text style={[s.msgTime, { color: colors.mutedForeground, alignSelf: isMe ? "flex-end" : "flex-start" }]}>
                      {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
          {/* Input bar */}
          <View style={[s.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
            {!crewId && (
              <Text style={[s.noIdText, { color: colors.mutedForeground }]}>Select your identity in the More tab to chat</Text>
            )}
            {crewId && (
              <>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Message..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[s.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!message.trim() || sendMessage.isPending}
                  style={[s.sendBtn, { backgroundColor: message.trim() ? colors.primary : colors.muted }]}
                >
                  <Ionicons name="send" size={18} color={message.trim() ? "#fff" : colors.mutedForeground} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 40 }}>

          {activeTab === "Overview" && (
            <View style={{ gap: 12 }}>
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <InfoRow icon="location-outline" label="Location" value={job.location ?? "Not set"} colors={colors} />
                {job.startDate && (
                  <InfoRow icon="calendar-outline" label="Start"
                    value={new Date(job.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    colors={colors} />
                )}
                {job.endDate && (
                  <InfoRow icon="flag-outline" label="End"
                    value={new Date(job.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    colors={colors} />
                )}
              </View>
              {totalTasks > 0 && (
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.cardTitle, { color: colors.foreground }]}>Task Progress</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={[s.progressLabel, { color: colors.mutedForeground }]}>{completedTasks} of {totalTasks} complete</Text>
                    <Text style={[s.progressPct, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <View style={[s.progressBar, { backgroundColor: colors.muted }]}>
                    <View style={[s.progressFill, { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` as any }]} />
                  </View>
                </View>
              )}
              {job.notes && (
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.cardTitle, { color: colors.foreground }]}>Notes</Text>
                  <Text style={[s.notes, { color: colors.mutedForeground }]}>{job.notes}</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "Tasks" && (
            <View style={{ gap: 8 }}>
              {(tasks ?? []).length === 0 ? (
                <EmptyState icon="checkbox-outline" text="No tasks for this job" colors={colors} />
              ) : (
                (tasks ?? []).map((task: any) => (
                  <View key={task.id} style={[s.taskRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons
                      name={task.completed ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={task.completed ? colors.primary : colors.mutedForeground}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.taskName, {
                        color: colors.foreground,
                        textDecorationLine: task.completed ? "line-through" : "none"
                      }]}>
                        {task.description}
                      </Text>
                      {task.assignedTo && (
                        <Text style={[s.taskAssigned, { color: colors.mutedForeground }]}>{task.assignedTo}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "Crew" && (
            <View style={{ gap: 8 }}>
              {(job.crew ?? []).length === 0 ? (
                <EmptyState icon="people-outline" text="No crew assigned" colors={colors} />
              ) : (
                (job.crew ?? []).map((member: any) => (
                  <View key={member.id} style={[s.crewRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.crewAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[s.crewInitials, { color: colors.primary }]}>
                        {member.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") ?? "?"}
                      </Text>
                    </View>
                    <View>
                      <Text style={[s.crewName, { color: colors.foreground }]}>{member.name}</Text>
                      <Text style={[s.crewRole, { color: colors.mutedForeground }]}>{member.role}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "Photos" && (
            <View style={{ gap: 8 }}>
              {(photos ?? []).length === 0 ? (
                <EmptyState icon="camera-outline" text="No photos uploaded" colors={colors} />
              ) : (
                <View style={s.photoGrid}>
                  {(photos ?? []).map((photo: any) => (
                    <View key={photo.id} style={[s.photoCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      {photo.url ? (
                        <Image source={{ uri: photo.url }} style={s.photoImg} resizeMode="cover" />
                      ) : (
                        <View style={[s.photoPlaceholder, { backgroundColor: colors.muted }]}>
                          <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
                        </View>
                      )}
                      {photo.caption && (
                        <Text style={[s.photoCaption, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {photo.caption}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "Contacts" && (
            <View style={{ gap: 8 }}>
              {(contacts ?? []).length === 0 ? (
                <EmptyState icon="call-outline" text="No contacts added" colors={colors} />
              ) : (
                (contacts ?? []).map((contact: any) => (
                  <View key={contact.id} style={[s.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.contactAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[s.contactInitials, { color: colors.primary }]}>
                        {contact.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.contactName, { color: colors.foreground }]}>{contact.name}</Text>
                      <Text style={[s.contactRole, { color: colors.primary }]}>{contact.role}</Text>
                      {contact.phone && (
                        <Text style={[s.contactInfo, { color: colors.mutedForeground }]}>{contact.phone}</Text>
                      )}
                      {contact.email && (
                        <Text style={[s.contactInfo, { color: colors.mutedForeground }]}>{contact.email}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "Forms" && formView === "list" && (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[s.formCreateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => createForm({ id: jobId, data: { formType: "job_completion" } })}
                  disabled={isCreatingForm}
                >
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                  <Text style={[s.formCreateBtnText, { color: colors.primary }]}>Job Completion</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.formCreateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => createForm({ id: jobId, data: { formType: "quality_control" } })}
                  disabled={isCreatingForm}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  <Text style={[s.formCreateBtnText, { color: colors.primary }]}>QC Checklist</Text>
                </TouchableOpacity>
              </View>
              {(forms as any[]).length === 0 ? (
                <EmptyState icon="document-outline" text="No forms yet — create one above" colors={colors} />
              ) : (
                (forms as any[]).map((form: any) => {
                  const isSigned = form.status === "signed";
                  return (
                    <View key={form.id} style={[s.formCard, { backgroundColor: colors.card, borderColor: isSigned ? "#16a34a40" : colors.border }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View style={[s.formIconWrap, { backgroundColor: isSigned ? "#dcfce7" : "#fef3c7" }]}>
                          <Ionicons
                            name={isSigned ? "checkmark-circle" : "ellipse-outline"}
                            size={18}
                            color={isSigned ? "#16a34a" : "#d97706"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.formTitle, { color: colors.foreground }]}>
                            {form.formType === "job_completion" ? "Job Completion Form" : "QC Checklist"}
                          </Text>
                          <Text style={[s.formSubtitle, { color: colors.mutedForeground }]}>
                            {isSigned ? `Signed by ${form.signatureName}` : `Draft · ${new Date(form.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                        {!isSigned && (
                          <TouchableOpacity
                            style={[s.formAction, { backgroundColor: colors.primary }]}
                            onPress={() => { setActiveFormId(form.id); const p = form.fields ? JSON.parse(form.fields) : {}; setFormValues(p); setFormView("fill"); }}
                          >
                            <Text style={[s.formActionText, { color: "#fff" }]}>Fill & Sign</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[s.formAction, { backgroundColor: colors.muted }]}
                          onPress={() => deleteForm({ id: jobId, formId: form.id })}
                        >
                          <Ionicons name="trash-outline" size={13} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === "Forms" && formView === "fill" && activeFormRecord && (
            <View style={{ gap: 14 }}>
              <TouchableOpacity onPress={() => setFormView("list")} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary }}>Back to forms</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground }}>
                {activeFormRecord.formType === "job_completion" ? "Job Completion Form" : "QC Checklist"}
              </Text>

              {activeFieldDefs.map((field) => (
                <View key={field.key} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground, marginBottom: 8 }}>{field.label}</Text>
                  {field.type === "yesno" ? (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {["yes", "no"].map((v) => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
                          style={{
                            flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1.5,
                            backgroundColor: formValues[field.key] === v ? (v === "yes" ? "#16a34a" : "#ef4444") : colors.background,
                            borderColor: formValues[field.key] === v ? (v === "yes" ? "#16a34a" : "#ef4444") : colors.border,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: formValues[field.key] === v ? "#fff" : colors.mutedForeground }}>
                            {v === "yes" ? "✓ Yes" : "✗ No"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : field.type === "textarea" ? (
                    <TextInput
                      style={[s.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, height: 80, textAlignVertical: "top" }]}
                      value={formValues[field.key] ?? ""}
                      onChangeText={(v) => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
                      placeholder="Enter details…"
                      placeholderTextColor={colors.mutedForeground}
                      multiline
                    />
                  ) : (
                    <TextInput
                      style={[s.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      value={formValues[field.key] ?? ""}
                      onChangeText={(v) => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
                      placeholder="Enter value…"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={[s.formCreateBtn, { backgroundColor: colors.primary, borderColor: colors.primary, flex: 0 }]}
                onPress={() => setFormView("sign")}
              >
                <Ionicons name="pencil-outline" size={16} color="#fff" />
                <Text style={[s.formCreateBtnText, { color: "#fff" }]}>Continue to Signature</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "Forms" && formView === "sign" && (
            <View style={{ gap: 16 }}>
              <TouchableOpacity onPress={() => setFormView("fill")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.primary }}>Back to form</Text>
              </TouchableOpacity>

              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 4 }}>Electronic Signature</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 16, lineHeight: 20 }}>
                  Draw your signature below, then enter your full name to legally sign this form.
                </Text>

                <SignaturePad
                  onSignatureChange={(paths, isEmpty) => { setSigPaths(paths); setSigEmpty(isEmpty); }}
                  strokeColor={colors.foreground}
                  borderColor={colors.border}
                  backgroundColor={colors.background}
                />

                <View style={{ marginTop: 16, gap: 6 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground }}>Full name (legal signature)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    value={signerName}
                    onChangeText={setSignerName}
                    placeholder="Type your full name…"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <TouchableOpacity
                  style={[s.formCreateBtn, {
                    backgroundColor: !sigEmpty && signerName.trim() ? colors.primary : colors.muted,
                    borderColor: "transparent", marginTop: 16, flex: 0,
                    opacity: isSubmittingForm ? 0.7 : 1,
                  }]}
                  onPress={() => {
                    if (!activeFormId || sigEmpty || !signerName.trim()) return;
                    const svgData = pathsToSvgString(sigPaths, 300, 160);
                    submitForm({ id: jobId, formId: activeFormId, data: { fields: formValues, signatureName: signerName.trim(), signatureData: svgData } });
                  }}
                  disabled={sigEmpty || !signerName.trim() || isSubmittingForm}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={!sigEmpty && signerName.trim() ? "#fff" : colors.mutedForeground} />
                  <Text style={[s.formCreateBtnText, { color: !sigEmpty && signerName.trim() ? "#fff" : colors.mutedForeground }]}>
                    {isSubmittingForm ? "Submitting…" : "Sign & Submit"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 8 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: "flex-start" },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    tabRow: { borderBottomWidth: 1, maxHeight: 46 },
    tab: { paddingHorizontal: 16, paddingVertical: 14 },
    tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    card: { borderRadius: 16, borderWidth: 1, padding: 16 },
    cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    progressLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
    progressPct: { fontSize: 13, fontFamily: "Inter_700Bold" },
    progressBar: { height: 8, borderRadius: 4, marginTop: 8, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    notes: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginTop: 8 },
    taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    taskName: { fontSize: 14, fontFamily: "Inter_500Medium" },
    taskAssigned: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    crewRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    crewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    crewInitials: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    crewName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    crewRole: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    contactCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    contactInitials: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    contactRole: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
    contactInfo: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
    // Chat
    msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
    msgRowMe: { flexDirection: "row-reverse" },
    msgAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
    msgInitials: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    msgSender: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 3, marginLeft: 2 },
    msgBubble: { padding: 10, borderRadius: 16, borderBottomLeftRadius: 4 },
    msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
    msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
    inputBar: {
      flexDirection: "row", alignItems: "flex-end", gap: 8,
      paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1,
    },
    noIdText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, textAlign: "center", paddingVertical: 12 },
    input: {
      flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8,
      fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100,
    },
    sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    // Photos
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    photoCard: { width: "47%", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    photoImg: { width: "100%", height: 140 },
    photoPlaceholder: { width: "100%", height: 140, alignItems: "center", justifyContent: "center" },
    photoCaption: { fontSize: 11, fontFamily: "Inter_400Regular", padding: 6 },
    // Forms
    formCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
    formIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    formTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    formSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    formCreateBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 12, borderWidth: 1 },
    formCreateBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    formAction: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
    formActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  });
