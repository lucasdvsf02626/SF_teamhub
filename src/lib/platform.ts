 import { Capacitor } from '@capacitor/core';
 
 /**
  * Platform detection utilities for progressive enhancement.
  * Uses native Capacitor APIs when running as a native app,
  * falls back to web APIs when running in a browser.
  */
 
 export type Platform = 'ios' | 'android' | 'web';
 
 /**
  * Check if the app is running as a native mobile app (iOS/Android via Capacitor)
  */
 export function isNativePlatform(): boolean {
   return Capacitor.isNativePlatform();
 }
 
 /**
  * Get the current platform: 'ios', 'android', or 'web'
  */
 export function getPlatform(): Platform {
   const platform = Capacitor.getPlatform();
   if (platform === 'ios') return 'ios';
   if (platform === 'android') return 'android';
   return 'web';
 }
 
 /**
  * Check if a specific Capacitor plugin is available
  */
 export function isPluginAvailable(pluginName: string): boolean {
   return Capacitor.isPluginAvailable(pluginName);
 }