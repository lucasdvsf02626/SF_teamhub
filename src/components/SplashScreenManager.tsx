 import { useEffect } from 'react';
 import { useSplashScreen } from '@/hooks/useSplashScreen';
 
 /**
  * Component that manages hiding the native splash screen.
  * Should be placed inside AuthProvider to access auth state.
  * Hides splash after a brief delay to ensure smooth transition.
  */
 export function SplashScreenManager() {
   const { hideSplash } = useSplashScreen();
 
   useEffect(() => {
     // Small delay to ensure React has fully rendered
     const timer = setTimeout(() => {
       hideSplash();
     }, 100);
 
     return () => clearTimeout(timer);
   }, [hideSplash]);
 
   return null;
 }