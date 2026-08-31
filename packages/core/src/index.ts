// Shared business logic — the calculations staff are actually paid on.
//
// Everything exported here is pure TypeScript with no platform dependency:
// no DOM, no localStorage, no React, no Supabase client. That is the rule
// that lets the web app and the React Native app share one implementation
// rather than drifting apart the way Team Hub and hive-vault-guard did.
//
// If a module in here ever needs `window`, `document`, AsyncStorage or a
// network client, it does not belong in this package — put the platform bit
// in the app and keep the calculation here.

export * from './leaveDays';
export * from './geo-helpers';
export * from './service-tier-helpers';
export * from './leave-year-helpers';
export * from './sickness-pattern-helpers';
export * from './serviceColors';
export * from './staff-constants';
export * from './documentGuidance';
export * from './uk-bank-holidays';
