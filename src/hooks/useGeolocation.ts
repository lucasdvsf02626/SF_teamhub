 import { useState, useCallback } from "react";
 import { Geolocation, Position } from "@capacitor/geolocation";
 import { isNativePlatform } from "@/lib/platform";
 
 interface GeolocationState {
   latitude: number | null;
   longitude: number | null;
   accuracy: number | null;
   loading: boolean;
   error: string | null;
 }
 
 interface UseGeolocationReturn extends GeolocationState {
   requestLocation: () => Promise<GeolocationPosition | null>;
   clearError: () => void;
 }
 
 // Convert Capacitor Position to standard GeolocationPosition
 function capacitorToWebPosition(position: Position): GeolocationPosition {
   const coords: GeolocationCoordinates = {
     latitude: position.coords.latitude,
     longitude: position.coords.longitude,
     altitude: position.coords.altitude,
     accuracy: position.coords.accuracy,
     altitudeAccuracy: position.coords.altitudeAccuracy,
     heading: position.coords.heading,
     speed: position.coords.speed,
     toJSON() {
       return {
         latitude: this.latitude,
         longitude: this.longitude,
         altitude: this.altitude,
         accuracy: this.accuracy,
         altitudeAccuracy: this.altitudeAccuracy,
         heading: this.heading,
         speed: this.speed,
       };
     },
   };
 
   const geoPosition: GeolocationPosition = {
     coords,
     timestamp: position.timestamp,
     toJSON() {
       return {
         coords: coords.toJSON(),
         timestamp: position.timestamp,
       };
     },
   };
 
   return geoPosition;
 }
 
 export function useGeolocation(): UseGeolocationReturn {
   const [state, setState] = useState<GeolocationState>({
     latitude: null,
     longitude: null,
     accuracy: null,
     loading: false,
     error: null,
   });
 
   // Native geolocation using Capacitor plugin
   const requestNativeLocation = useCallback(async (): Promise<GeolocationPosition | null> => {
     try {
       // Check permissions first
       const permStatus = await Geolocation.checkPermissions();
       
       if (permStatus.location === 'denied') {
         // Request permission
         const requestResult = await Geolocation.requestPermissions();
         if (requestResult.location === 'denied') {
           setState(prev => ({
             ...prev,
             error: "Location permission denied",
             loading: false,
           }));
           return null;
         }
       }
 
       const position = await Geolocation.getCurrentPosition({
         enableHighAccuracy: true,
         timeout: 10000,
         maximumAge: 60000,
       });
 
       setState({
         latitude: position.coords.latitude,
         longitude: position.coords.longitude,
         accuracy: position.coords.accuracy,
         loading: false,
         error: null,
       });
 
       return capacitorToWebPosition(position);
     } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Unable to retrieve your location";
       setState(prev => ({
         ...prev,
         error: errorMessage,
         loading: false,
         latitude: null,
         longitude: null,
         accuracy: null,
       }));
       return null;
     }
   }, []);
 
   // Web geolocation using navigator.geolocation
   const requestWebLocation = useCallback(async (): Promise<GeolocationPosition | null> => {
     if (!navigator.geolocation) {
       setState(prev => ({
         ...prev,
         error: "Geolocation is not supported by your browser",
         loading: false,
       }));
       return null;
     }
 
     return new Promise((resolve) => {
       navigator.geolocation.getCurrentPosition(
         (position) => {
           setState({
             latitude: position.coords.latitude,
             longitude: position.coords.longitude,
             accuracy: position.coords.accuracy,
             loading: false,
             error: null,
           });
           resolve(position);
         },
         (error) => {
           let errorMessage = "Unable to retrieve your location";
           
           switch (error.code) {
             case error.PERMISSION_DENIED:
               errorMessage = "Location permission denied";
               break;
             case error.POSITION_UNAVAILABLE:
               errorMessage = "Location information unavailable";
               break;
             case error.TIMEOUT:
               errorMessage = "Location request timed out";
               break;
           }
           
           setState({
             latitude: null,
             longitude: null,
             accuracy: null,
             loading: false,
             error: errorMessage,
           });
           resolve(null);
         },
         {
           enableHighAccuracy: true,
           timeout: 10000,
           maximumAge: 60000,
         }
       );
     });
   }, []);
 
   const requestLocation = useCallback(async (): Promise<GeolocationPosition | null> => {
     setState(prev => ({ ...prev, loading: true, error: null }));
     
     // Use native geolocation on iOS/Android, web fallback otherwise
     if (isNativePlatform()) {
       return requestNativeLocation();
     } else {
       return requestWebLocation();
     }
   }, [requestNativeLocation, requestWebLocation]);
 
   const clearError = useCallback(() => {
     setState((prev) => ({ ...prev, error: null }));
   }, []);
 
   return {
     ...state,
     requestLocation,
     clearError,
   };
 }
