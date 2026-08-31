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
     }
     // No BackgroundGeolocation block. There was one here, configured with a
     // "tracking your location for auto sign-in/out" notification, but no
     // background geolocation plugin is installed — Capacitor silently ignored
     // it and nothing tracked anything. Shipping a config that announces
     // background tracking the app does not do is the kind of thing App Review
     // asks about, so it is gone.
     //
     // Geofencing today is foreground only: useGeolocation.ts reads a position
     // when you clock in, and ClockContext watches it while the app is open.
     // Real background geofencing needs a plugin, UIBackgroundModes, and
     // NSLocationAlwaysAndWhenInUseUsageDescription — all three, or it does not
     // work. See APP-STORE.md.
   }
 };
 
 export default config;