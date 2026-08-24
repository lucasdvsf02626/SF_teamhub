 import type { CapacitorConfig } from '@capacitor/cli';
 
 const config: CapacitorConfig = {
   appId: 'com.supplementfactory.teamhub',
   appName: 'SF:Team Hub',
   webDir: 'dist',
   // server block removed for local native demo — shell serves webDir (dist)
   plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: "#0f1419",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
     PushNotifications: {
       presentationOptions: ["badge", "sound", "alert"]
     },
     BackgroundGeolocation: {
       backgroundMessage: "SF:Team Hub is tracking your location for auto sign-in/out",
       backgroundTitle: "Location Active"
     }
   }
 };
 
 export default config;