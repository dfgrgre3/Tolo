/**
 * 🔑 Passkeys Module - تصدير مكونات Passkeys
 */

// Core services
export { PasskeyManager, getPasskeyManager } from './PasskeyManager';
export type {
    PasskeyCredential,
    PasskeyRegistrationOptions,
    PasskeyAuthenticationOptions
} from './PasskeyManager';

// Synced/Discoverable Passkeys
export {
    SyncedPasskeyService,
    getSyncedPasskeyService
} from './SyncedPasskeyService';
export type {
    SyncedPasskeyInfo,
    DiscoverableCredentialOptions
} from './SyncedPasskeyService';

// UI Components
export { default as PasskeyManagement } from './PasskeyManagement';
export { PasskeyLoginButton } from './PasskeyLoginButton';
