// Google Play Billing Service - Web stub (IAP not available on web)

export const SUBSCRIPTION_SKUS = ['masarai_monthly_sub'];
export const MONTHLY_SKU = 'masarai_monthly_sub';

export async function initIAPConnection(): Promise<boolean> { return false; }
export async function endIAPConnection(): Promise<void> {}
export async function getSubscriptionProducts() { return []; }
export async function requestPurchase(_sku: string): Promise<boolean> { return false; }
export async function acknowledgePurchase(_purchase: any): Promise<void> {}
export async function getAvailablePurchases() { return []; }
export function addPurchaseListeners(
  _onPurchaseUpdate: (purchase: any) => void,
  _onPurchaseError: (error: any) => void,
): { remove: () => void } { return { remove: () => {} }; }
export async function verifyPurchase(
  _userId: string, _productId: string, _purchaseToken: string,
  _transactionId: string, _originalJson?: string,
): Promise<{ success: boolean; error?: string }> { return { success: false, error: 'Not available on web' }; }
export function isIAPAvailable(): boolean { return false; }
