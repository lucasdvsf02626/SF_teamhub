 import { useCallback } from "react";
 import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
 import { isNativePlatform } from "@/lib/platform";

type HapticPattern = 'success' | 'action' | 'error';

 // Web fallback patterns using navigator.vibrate
 const webHapticPatterns: Record<HapticPattern, number | number[]> = {
  success: [100, 50, 100],  // double pulse - for sign-in, positive actions
  action: 50,               // short tap - for buttons, breaks
  error: [200, 100, 200],   // long-short-long - for errors, warnings
};

export const useHaptic = () => {
  // Haptics are always on — the old notification-preferences table did not
  // survive the Hive migration (notifications return later on Hive rails).

   // Native haptic feedback using Capacitor Haptics plugin
   const triggerNativeHaptic = useCallback(async (pattern: HapticPattern) => {
     try {
       switch (pattern) {
         case 'success':
           // Heavy impact followed by success notification
           await Haptics.impact({ style: ImpactStyle.Heavy });
           await new Promise(resolve => setTimeout(resolve, 50));
           await Haptics.notification({ type: NotificationType.Success });
           break;
         case 'action':
           // Medium impact for general actions
           await Haptics.impact({ style: ImpactStyle.Medium });
           break;
         case 'error':
           // Error notification pattern
           await Haptics.notification({ type: NotificationType.Error });
           break;
       }
     } catch (error) {
       console.warn('Native haptic failed, trying web fallback:', error);
       triggerWebHaptic(pattern);
     }
   }, []);
 
   // Web fallback using navigator.vibrate (only works on Android browsers)
   const triggerWebHaptic = useCallback((pattern: HapticPattern) => {
     if (!navigator.vibrate) return;
     navigator.vibrate(webHapticPatterns[pattern]);
   }, []);
 
   const triggerHaptic = useCallback((pattern: HapticPattern = 'action') => {
     // Use native haptics on iOS/Android, web fallback otherwise
     if (isNativePlatform()) {
       triggerNativeHaptic(pattern);
     } else {
       triggerWebHaptic(pattern);
     }
   }, [triggerNativeHaptic, triggerWebHaptic]);

   // Native always supports haptics; web only on Android
   const isHapticSupported = isNativePlatform() || (typeof navigator !== 'undefined' && 'vibrate' in navigator);

  return {
    triggerHaptic,
    isHapticSupported,
    hapticEnabled: true
  };
};
