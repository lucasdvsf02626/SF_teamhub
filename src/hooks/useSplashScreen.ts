 import { SplashScreen } from '@capacitor/splash-screen';
 import { isNativePlatform } from '@/lib/platform';
 import { useEffect, useCallback, useRef } from 'react';
 
 /**
  * Hook to manage native splash screen hiding.
  * Only runs on native iOS/Android platforms.
  * Includes safety timeout to ensure splash is hidden even if app fails to initialize.
  */
 export function useSplashScreen() {
   const hasHiddenRef = useRef(false);
   const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
   const hideSplash = useCallback(async () => {
     // Prevent multiple hide calls
     if (hasHiddenRef.current) return;
     
     // Only run on native platforms
     if (!isNativePlatform()) return;
     
     try {
       hasHiddenRef.current = true;
       
       // Clear safety timeout if it exists
       if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
         timeoutRef.current = null;
       }
       
       // Hide with fade animation
       await SplashScreen.hide({
         fadeOutDuration: 300,
       });
       
       console.log('[SplashScreen] Hidden successfully');
     } catch (error) {
       console.error('[SplashScreen] Error hiding:', error);
     }
   }, []);
 
   // Set up safety timeout to auto-hide after max duration
   useEffect(() => {
     if (!isNativePlatform()) return;
     
     // Safety net: auto-hide after 5 seconds if not hidden manually
     timeoutRef.current = setTimeout(() => {
       if (!hasHiddenRef.current) {
         console.warn('[SplashScreen] Safety timeout triggered - hiding splash');
         hideSplash();
       }
     }, 5000);
 
     return () => {
       if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
       }
     };
   }, [hideSplash]);
 
   return { hideSplash };
 }