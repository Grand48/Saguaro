import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  Duration,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Saguaro";

const MONTHLY_PRODUCT_IDENTIFIER = "saguaro_pro_monthly";
const MONTHLY_PLAY_STORE_IDENTIFIER = "saguaro_pro_monthly:monthly";
const MONTHLY_DISPLAY_NAME = "Saguaro Pro Monthly";
const MONTHLY_TITLE = "Saguaro Pro Monthly";
const MONTHLY_DURATION: Duration = Duration.P1M;
const MONTHLY_PRICE_MICROS = 19990000;

const YEARLY_PRODUCT_IDENTIFIER = "saguaro_pro_yearly";
const YEARLY_PLAY_STORE_IDENTIFIER = "saguaro_pro_yearly:yearly";
const YEARLY_DISPLAY_NAME = "Saguaro Pro Yearly";
const YEARLY_TITLE = "Saguaro Pro Yearly";
const YEARLY_DURATION: Duration = Duration.P1Y;
const YEARLY_PRICE_MICROS = 149990000;

const APP_STORE_APP_NAME = "Saguaro iOS";
const APP_STORE_BUNDLE_ID = "com.saguaro.app";
const PLAY_STORE_APP_NAME = "Saguaro Android";
const PLAY_STORE_PACKAGE_NAME = "com.saguaro.app";

const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "Pro Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

const MONTHLY_PACKAGE_IDENTIFIER = "$rc_monthly";
const MONTHLY_PACKAGE_DISPLAY_NAME = "Monthly Subscription";
const YEARLY_PACKAGE_IDENTIFIER = "$rc_annual";
const YEARLY_PACKAGE_DISPLAY_NAME = "Annual Subscription";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });

  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);

  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error: createProjectError } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (createProjectError) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listAppsError || !apps || apps.items.length === 0) {
    throw new Error("No apps found");
  }

  let app: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!app) {
    throw new Error("No app with test store found");
  } else {
    console.log("App with test store found:", app.id);
  }

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: APP_STORE_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: "play_store",
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });

  if (listProductsError) throw new Error("Failed to list products");

  const ensureProductForApp = async (
    targetApp: App,
    label: string,
    productIdentifier: string,
    isTestStore: boolean,
    duration: Duration,
    displayName: string,
    title: string
  ): Promise<Product> => {
    const existingProduct = existingProducts.items?.find(
      (p) => p.store_identifier === productIdentifier && p.app_id === targetApp.id
    );

    if (existingProduct) {
      console.log(label + " product already exists:", existingProduct.id);
      return existingProduct;
    }

    const body: CreateProductData["body"] = {
      store_identifier: productIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };

    if (isTestStore) {
      body.subscription = { duration };
      body.title = title;
    }

    const { data: createdProduct, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });

    if (error) throw new Error("Failed to create " + label + " product");
    console.log("Created " + label + " product:", createdProduct.id);
    return createdProduct;
  };

  const [testMonthly, appMonthly, playMonthly] = await Promise.all([
    ensureProductForApp(app, "Test Store Monthly", MONTHLY_PRODUCT_IDENTIFIER, true, MONTHLY_DURATION, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE),
    ensureProductForApp(appStoreApp, "App Store Monthly", MONTHLY_PRODUCT_IDENTIFIER, false, MONTHLY_DURATION, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE),
    ensureProductForApp(playStoreApp, "Play Store Monthly", MONTHLY_PLAY_STORE_IDENTIFIER, false, MONTHLY_DURATION, MONTHLY_DISPLAY_NAME, MONTHLY_TITLE),
  ]);

  const [testYearly, appYearly, playYearly] = await Promise.all([
    ensureProductForApp(app, "Test Store Yearly", YEARLY_PRODUCT_IDENTIFIER, true, YEARLY_DURATION, YEARLY_DISPLAY_NAME, YEARLY_TITLE),
    ensureProductForApp(appStoreApp, "App Store Yearly", YEARLY_PRODUCT_IDENTIFIER, false, YEARLY_DURATION, YEARLY_DISPLAY_NAME, YEARLY_TITLE),
    ensureProductForApp(playStoreApp, "Play Store Yearly", YEARLY_PLAY_STORE_IDENTIFIER, false, YEARLY_DURATION, YEARLY_DISPLAY_NAME, YEARLY_TITLE),
  ]);

  const addTestStorePrices = async (productId: string, amountMicros: number, label: string) => {
    const { data: priceData, error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: productId },
      body: { prices: [{ amount_micros: amountMicros, currency: "USD" }] },
    });

    if (priceError) {
      if (
        priceError &&
        typeof priceError === "object" &&
        "type" in priceError &&
        priceError["type"] === "resource_already_exists"
      ) {
        console.log(label + " test store prices already exist");
      } else {
        throw new Error("Failed to add test store prices for " + label);
      }
    } else {
      console.log("Added test store prices for " + label);
    }
  };

  await addTestStorePrices(testMonthly.id, MONTHLY_PRICE_MICROS, "monthly");
  await addTestStorePrices(testYearly.id, YEARLY_PRICE_MICROS, "yearly");

  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find(
    (e) => e.lookup_key === ENTITLEMENT_IDENTIFIER
  );

  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: ENTITLEMENT_IDENTIFIER,
        display_name: ENTITLEMENT_DISPLAY_NAME,
      },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEntitlement.id);
    entitlement = newEntitlement;
  }

  const allProductIds = [
    testMonthly.id, appMonthly.id, playMonthly.id,
    testYearly.id, appYearly.id, playYearly.id,
  ];

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });

  if (attachEntitlementError) {
    if (attachEntitlementError.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached products to entitlement");
  }

  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });

  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find(
    (o) => o.lookup_key === OFFERING_IDENTIFIER
  );

  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: {
        lookup_key: OFFERING_IDENTIFIER,
        display_name: OFFERING_DISPLAY_NAME,
      },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOffering.id);
    offering = newOffering;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });

  if (listPackagesError) throw new Error("Failed to list packages");

  const ensurePackage = async (
    pkgIdentifier: string,
    pkgDisplayName: string,
    products: { product_id: string; eligibility_criteria: "all" }[]
  ): Promise<Package> => {
    const existing = existingPackages.items?.find((p) => p.lookup_key === pkgIdentifier);
    if (existing) {
      console.log("Package already exists:", existing.id);
      return existing;
    }

    const { data: newPackage, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering!.id },
      body: { lookup_key: pkgIdentifier, display_name: pkgDisplayName },
    });
    if (error) throw new Error("Failed to create package: " + pkgIdentifier);
    console.log("Created package:", newPackage.id);

    const { error: attachError } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: newPackage.id },
      body: { products },
    });

    if (attachError) {
      if (
        attachError.type === "unprocessable_entity_error" &&
        attachError.message?.includes("Cannot attach product")
      ) {
        console.log("Skipping package attach: incompatible product already attached");
      } else {
        throw new Error("Failed to attach products to package: " + pkgIdentifier);
      }
    } else {
      console.log("Attached products to package: " + pkgIdentifier);
    }

    return newPackage;
  };

  await ensurePackage(MONTHLY_PACKAGE_IDENTIFIER, MONTHLY_PACKAGE_DISPLAY_NAME, [
    { product_id: testMonthly.id, eligibility_criteria: "all" },
    { product_id: appMonthly.id, eligibility_criteria: "all" },
    { product_id: playMonthly.id, eligibility_criteria: "all" },
  ]);

  await ensurePackage(YEARLY_PACKAGE_IDENTIFIER, YEARLY_PACKAGE_DISPLAY_NAME, [
    { product_id: testYearly.id, eligibility_criteria: "all" },
    { product_id: appYearly.id, eligibility_criteria: "all" },
    { product_id: playYearly.id, eligibility_criteria: "all" },
  ]);

  const { data: testStoreApiKeys, error: testStoreApiKeysError } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: app.id },
  });
  if (testStoreApiKeysError) throw new Error("Failed to list public API keys for Test Store app");

  const { data: appStoreApiKeys, error: appStoreApiKeysError } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  if (appStoreApiKeysError) throw new Error("Failed to list public API keys for App Store app");

  const { data: playStoreApiKeys, error: playStoreApiKeysError } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });
  if (playStoreApiKeysError) throw new Error("Failed to list public API keys for Play Store app");

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", app.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement Identifier:", ENTITLEMENT_IDENTIFIER);
  console.log("Public API Keys - Test Store:", testStoreApiKeys?.items.map((item) => item.key).join(", ") ?? "N/A");
  console.log("Public API Keys - App Store:", appStoreApiKeys?.items.map((item) => item.key).join(", ") ?? "N/A");
  console.log("Public API Keys - Play Store:", playStoreApiKeys?.items.map((item) => item.key).join(", ") ?? "N/A");
  console.log("====================");
  console.log("\nNext steps:");
  console.log("1. Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY to the Test Store public key above");
  console.log("2. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY to the App Store public key above");
  console.log("3. Set EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY to the Play Store public key above");
  console.log("4. Set REVENUECAT_PROJECT_ID to:", project.id);
}

seedRevenueCat().catch(console.error);
