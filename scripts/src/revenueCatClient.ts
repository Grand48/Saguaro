import { createClient } from "@replit/revenuecat-sdk/client";

export function getUncachableRevenueCatClient() {
  const apiKey = process.env.REVENUECAT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "REVENUECAT_API_KEY is not set. Provide your RevenueCat V2 secret key as this environment variable."
    );
  }

  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
