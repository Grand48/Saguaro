import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSubscription } from "@/lib/revenuecat";

const BRAND_GREEN = "#1a9e4a";
const BRAND_GREEN_DARK = "#147a39";
const BRAND_GREEN_LIGHT = "#22c55e";

const FEATURES = [
  { icon: "briefcase-outline" as const, text: "Unlimited job scheduling & management" },
  { icon: "people-outline" as const, text: "Full crew coordination & time clock" },
  { icon: "flash-outline" as const, text: "Side quests, tasks & employee requests" },
  { icon: "car-outline" as const, text: "Fleet, lodging & equipment tracking" },
  { icon: "chatbubbles-outline" as const, text: "Job chat, photos & electronic forms" },
];

export default function PaywallScreen() {
  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring } = useSubscription();

  const [selectedIndex, setSelectedIndex] = useState<number>(1);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);

  const currentOffering = offerings?.current;
  const packages = currentOffering?.availablePackages ?? [];

  const sortedPackages = [...packages].sort((a, b) => {
    const order = ["$rc_monthly", "$rc_annual"];
    return order.indexOf(a.packageType) - order.indexOf(b.packageType);
  });

  const selectedPackage = sortedPackages[selectedIndex] ?? sortedPackages[0];

  const handleSubscribe = () => {
    if (!selectedPackage) return;
    setErrorMsg(null);
    setConfirmVisible(true);
  };

  const confirmPurchase = async () => {
    setConfirmVisible(false);
    try {
      await purchase(selectedPackage);
      setSuccessVisible(true);
    } catch (e: any) {
      if (e?.userCancelled) return;
      setErrorMsg(e?.message ?? "Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    try {
      await restore();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Restore failed. Please try again.");
    }
  };

  const handleSuccessContinue = () => {
    setSuccessVisible(false);
    router.replace("/(tabs)");
  };

  const getSavingsBadge = (pkg: typeof sortedPackages[number]) => {
    if (pkg.packageType === "$rc_annual") {
      const monthlyPkg = sortedPackages.find((p) => p.packageType === "$rc_monthly");
      if (monthlyPkg) {
        const monthlyAnnualized = monthlyPkg.product.price * 12;
        const yearlyPrice = pkg.product.price;
        const savings = Math.round(((monthlyAnnualized - yearlyPrice) / monthlyAnnualized) * 100);
        if (savings > 0) return `Save ${savings}%`;
      }
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_GREEN_DARK} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[BRAND_GREEN_DARK, BRAND_GREEN, "#2dd4bf"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={40} color="#fff" />
          </View>
          <Text style={styles.appName}>Saguaro Pro</Text>
          <Text style={styles.tagline}>The complete field operations platform</Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.featuresTitle}>Everything your crew needs</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={20} color={BRAND_GREEN} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}

          <Text style={styles.plansTitle}>Choose your plan</Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={BRAND_GREEN} />
              <Text style={styles.loadingText}>Loading plans…</Text>
            </View>
          ) : sortedPackages.length === 0 ? (
            <View style={styles.loadingWrap}>
              <Ionicons name="cloud-offline-outline" size={32} color="#aaa" />
              <Text style={styles.loadingText}>Plans unavailable right now</Text>
            </View>
          ) : (
            sortedPackages.map((pkg, i) => {
              const isSelected = i === selectedIndex;
              const savings = getSavingsBadge(pkg);
              const isYearly = pkg.packageType === "$rc_annual";
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setSelectedIndex(i)}
                  activeOpacity={0.85}
                >
                  <View style={styles.planCardInner}>
                    <View style={styles.planLeft}>
                      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View>
                        <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                          {isYearly ? "Annual" : "Monthly"}
                        </Text>
                        <Text style={styles.planSubtitle}>
                          {isYearly ? "Billed once per year" : "Billed every month"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.planRight}>
                      {savings && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>{savings}</Text>
                        </View>
                      )}
                      <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                        {pkg.product.priceString}
                      </Text>
                      <Text style={styles.planPeriod}>
                        {isYearly ? "/ year" : "/ month"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.ctaBtn, (isPurchasing || !selectedPackage) && styles.ctaBtnDisabled]}
            onPress={handleSubscribe}
            disabled={isPurchasing || !selectedPackage}
            activeOpacity={0.9}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaBtnText}>
                {selectedPackage
                  ? `Subscribe for ${selectedPackage.product.priceString}`
                  : "Subscribe"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={BRAND_GREEN} />
            ) : (
              <Text style={styles.restoreText}>Restore purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date.
            Manage in App Store / Google Play settings.
          </Text>
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={confirmVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="card-outline" size={36} color={BRAND_GREEN} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Confirm Purchase</Text>
            <Text style={styles.modalBody}>
              You're subscribing to{" "}
              <Text style={styles.modalBold}>
                {selectedPackage?.product.title ?? "Saguaro Pro"}
              </Text>{" "}
              for{" "}
              <Text style={styles.modalBold}>
                {selectedPackage?.product.priceString}
              </Text>
              {selectedPackage?.packageType === "$rc_annual" ? " per year" : " per month"}.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmPurchase}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={successVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>Welcome to Saguaro Pro!</Text>
            <Text style={styles.modalBody}>
              Your subscription is active. You now have full access to all features.
            </Text>
            <TouchableOpacity style={styles.modalConfirm} onPress={handleSuccessContinue}>
              <Text style={styles.modalConfirmText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 48 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  body: {
    padding: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#374151",
  },
  plansTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
    marginTop: 24,
    marginBottom: 12,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
  },
  planCard: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  planCardSelected: {
    borderColor: BRAND_GREEN,
    backgroundColor: "#f0fdf4",
  },
  planCardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: BRAND_GREEN,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_GREEN,
  },
  planName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  planNameSelected: {
    color: BRAND_GREEN_DARK,
  },
  planSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    marginTop: 2,
  },
  planRight: {
    alignItems: "flex-end",
  },
  savingsBadge: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  planPrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#374151",
  },
  planPriceSelected: {
    color: BRAND_GREEN_DARK,
  },
  planPeriod: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#dc2626",
  },
  ctaBtn: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
    shadowColor: BRAND_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnDisabled: {
    backgroundColor: "#a7f3d0",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: BRAND_GREEN,
  },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  modalIcon: {
    marginBottom: 12,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBold: {
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#6b7280",
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: BRAND_GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
