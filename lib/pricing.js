// Subscription pricing shared across every payment method (Paystack,
// manual bank transfer, or anything added later) - not specific to any one
// provider, unlike lib/paystack.js.

// Returns the subscription price in the currency's smallest unit (e.g. kobo
// for NGN), and the currency code, from environment variables.
export function getSubscriptionPricing() {
  return {
    amountMinor: Number(process.env.SUBSCRIPTION_PRICE_MINOR || 500000), // default NGN 5,000
    currency: process.env.SUBSCRIPTION_CURRENCY || process.env.PAYSTACK_CURRENCY || "NGN",
  };
}

// How long a successful payment grants access for, when there's no recurring
// billing attached (true for every manual bank-transfer payment, and for
// Paystack payments with no Plan code). 30 days by default.
export function accessWindowDays() {
  return Number(process.env.SUBSCRIPTION_ACCESS_DAYS || 30);
}
