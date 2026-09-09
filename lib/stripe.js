import Stripe from "stripe";

let _stripe = null;

// Lazily construct so the app still boots (Tiers 1-2) if Stripe keys aren't set yet.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}
