// Google Play Billing Service - Native (Android/iOS)
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

export const SUBSCRIPTION_SKUS = ['masarai_monthly_sub'];
export const MONTHLY_SKU = 'masarai_monthly_sub';

let IAP: any = null;
try {
  IAP = require('react-native-iap');
} catch {
  console.log('react-native-iap not available');
}

let iapInitialized = false;

export async function initIAPConnection(): Promise<boolean> {
  if (!IAP) return false;
  try {
    await IAP.initConnection();
    iapInitialized = true;
    if (Platform.OS === 'android') {
      try { await IAP.flushFailedPurchasesCachedAsPendingAndroid(); } catch {}
    }
    return true;
  } catch (err) {
    console.error('IAP init failed:', err);
    return false;
  }
}

export async function endIAPConnection(): Promise<void> {
  if (!IAP || !iapInitialized) return;
  try { await IAP.endConnection(); iapInitialized = false; } catch {}
}

export async function getSubscriptionProducts() {
  if (!IAP) return [];
  try {
    return await IAP.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
  } catch (err) {
    console.error('Get subscriptions failed:', err);
    return [];
  }
}

export async function requestPurchase(sku: string): Promise<boolean> {
  if (!IAP) return false;
  try {
    await IAP.requestSubscription({ sku, subscriptionOffers: [{ sku, offerToken: '' }] });
    return true;
  } catch (err: any) {
    if (err?.code === 'E_USER_CANCELLED') return false;
    console.error('Purchase request failed:', err);
    throw err;
  }
}

export async function acknowledgePurchase(purchase: any): Promise<void> {
  if (!IAP) return;
  try { await IAP.finishTransaction({ purchase, isConsumable: false }); } catch (err) {
    console.error('Acknowledge purchase failed:', err);
  }
}

export async function getAvailablePurchases() {
  if (!IAP) return [];
  try { return await IAP.getAvailablePurchases(); } catch (err) {
    console.error('Get available purchases failed:', err);
    return [];
  }
}

export function addPurchaseListeners(
  onPurchaseUpdate: (purchase: any) => void,
  onPurchaseError: (error: any) => void,
): { remove: () => void } {
  if (!IAP) return { remove: () => {} };
  const purchaseSub = IAP.purchaseUpdatedListener(onPurchaseUpdate);
  const errorSub = IAP.purchaseErrorListener(onPurchaseError);
  return { remove: () => { purchaseSub?.remove(); errorSub?.remove(); } };
}

export async function verifyPurchase(
  userId: string, productId: string, purchaseToken: string,
  transactionId: string, originalJson?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('verify-purchase', {
      body: {
        product_id: productId,
        purchase_token: purchaseToken,
        transaction_id: transactionId,
        platform: Platform.OS,
        original_json: originalJson,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: data?.verified === true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function isIAPAvailable(): boolean {
  return IAP !== null;
}
