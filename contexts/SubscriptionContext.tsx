import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

function getClient() {
  try { return getSupabaseClient(); } catch { return null; }
}
import { FunctionsHttpError } from '@supabase/supabase-js';
import {
  initIAPConnection,
  endIAPConnection,
  addPurchaseListeners,
  acknowledgePurchase,
  verifyPurchase,
  isIAPAvailable,
  requestPurchase as iapRequestPurchase,
  getAvailablePurchases as iapGetAvailablePurchases,
  MONTHLY_SKU,
} from '../services/iap';

interface SubscriptionState {
  subscribed: boolean;
  isTrial: boolean;
  trialEndDate: string | null;
  trialDaysLeft: number;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  iapReady: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  purchaseSubscription: () => Promise<{ error?: string }>;
  restorePurchases: () => Promise<{ error?: string }>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    isTrial: false,
    trialEndDate: null,
    trialDaysLeft: 0,
    productId: null,
    subscriptionEnd: null,
    loading: false,
    iapReady: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  // Initialize IAP connection
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (isIAPAvailable()) {
        const ready = await initIAPConnection();
        if (mounted) {
          setState(prev => ({ ...prev, iapReady: ready }));
        }
      }
    };
    init();
    return () => {
      mounted = false;
      endIAPConnection();
    };
  }, []);

  // Set up purchase listeners
  useEffect(() => {
    if (!state.iapReady || !user?.id) return;

    const handlePurchaseUpdate = async (purchase: any) => {
      console.log('[IAP] Purchase updated:', purchase?.productId);
      if (!purchase?.transactionReceipt) return;

      try {
        // Verify and store on server
        const result = await verifyPurchase(
          user.id,
          purchase.productId,
          purchase.purchaseToken || purchase.transactionReceipt,
          purchase.transactionId || '',
          purchase.transactionReceipt,
        );

        if (result.success) {
          // Acknowledge the purchase
          await acknowledgePurchase(purchase);
          // Refresh subscription status
          await checkSubscription();
        }
      } catch (err) {
        console.error('[IAP] Purchase processing error:', err);
      }
    };

    const handlePurchaseError = (error: any) => {
      console.log('[IAP] Purchase error:', error?.code, error?.message);
    };

    listenerRef.current = addPurchaseListeners(handlePurchaseUpdate, handlePurchaseError);

    return () => {
      listenerRef.current?.remove();
      listenerRef.current = null;
    };
  }, [state.iapReady, user?.id]);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState(prev => ({
        ...prev,
        subscribed: false,
        isTrial: false,
        trialEndDate: null,
        trialDaysLeft: 0,
        productId: null,
        subscriptionEnd: null,
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    try {
      const supabase = getClient();
      if (!supabase) { setState(prev => ({ ...prev, loading: false })); return; }
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const textContent = await error.context?.text();
            errorMessage = textContent || error.message;
          } catch {}
        }
        console.error('Check subscription error:', errorMessage);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        subscribed: data?.subscribed ?? false,
        isTrial: data?.is_trial === true,
        trialEndDate: data?.trial_end_date ?? null,
        trialDaysLeft: data?.trial_days_left ?? 0,
        productId: data?.product_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        loading: false,
      }));
    } catch (err) {
      console.error('Check subscription exception:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  const purchaseSubscription = useCallback(async (): Promise<{ error?: string }> => {
    if (!isIAPAvailable()) {
      return { error: 'الشراء داخل التطبيق غير متوفر على هذا الجهاز' };
    }

    try {
      await iapRequestPurchase(MONTHLY_SKU);
      // Purchase result will come through the listener
      return {};
    } catch (err: any) {
      if (err?.code === 'E_USER_CANCELLED') return {};
      return { error: err.message || 'فشل في عملية الشراء' };
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<{ error?: string }> => {
    if (!isIAPAvailable() || !user?.id) {
      return { error: 'استعادة المشتريات غير متوفرة' };
    }

    try {
      const purchases = await iapGetAvailablePurchases();

      if (purchases.length === 0) {
        return { error: 'لم يتم العثور على مشتريات سابقة' };
      }

      // Verify the most recent purchase
      const latestPurchase = purchases[purchases.length - 1];
      const result = await verifyPurchase(
        user.id,
        latestPurchase.productId,
        latestPurchase.purchaseToken || latestPurchase.transactionReceipt,
        latestPurchase.transactionId || '',
        latestPurchase.transactionReceipt,
      );

      if (result.success) {
        await checkSubscription();
        return {};
      }

      return { error: 'فشل في التحقق من المشتريات السابقة' };
    } catch (err: any) {
      return { error: err.message || 'خطأ في استعادة المشتريات' };
    }
  }, [user?.id, checkSubscription]);

  // Check on auth change
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState(prev => ({
        ...prev,
        subscribed: false,
        isTrial: false,
        trialEndDate: null,
        trialDaysLeft: 0,
        productId: null,
        subscriptionEnd: null,
        loading: false,
      }));
    }
  }, [user?.id]);

  // Periodic check every 60 seconds
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (user) {
      intervalRef.current = setInterval(checkSubscription, 60000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{
      ...state,
      checkSubscription,
      purchaseSubscription,
      restorePurchases,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
