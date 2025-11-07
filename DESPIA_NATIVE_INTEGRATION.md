# Despia Native Integration Guide

## Overview

HomeBase has been enhanced with **Despia Native**, an SDK that provides 25+ native device features for seamless mobile app development. This integration brings true native capabilities to the web-based HomeBase application.

## What is Despia Native?

Despia Native bridges the gap between web and native mobile development, allowing HomeBase to access native device features without writing native code. It provides:

- **Automated Publishing Pipeline**: Direct submission to App Store and Google Play
- **25+ Native Device Features**: Hardware acceleration, offline support, and deep OS integration
- **Over-the-air Updates**: Update your app without app store review

## Installed Features

### 1. Haptic Feedback ✅
**Status**: Active on all buttons

All buttons in HomeBase now provide tactile feedback when pressed. The app supports 5 different haptic types:
- Light: Subtle feedback for minor actions
- Heavy: Strong feedback for important actions
- Success: Positive reinforcement
- Warning: Alert feedback
- Error: Negative feedback

**Implementation**: The Button component (`src/components/ui/button.tsx`) automatically triggers light haptic feedback on every click.

**Test**: Visit Settings → App Settings → Native Features to test all haptic types.

### 2. Biometric Authentication ✅
**Status**: Available on login page

Users can now authenticate using Face ID, Touch ID, or fingerprint authentication.

**Location**: Login page (`src/pages/Login.tsx`)

**Usage**: 
1. Enter your credentials
2. Click "Use Biometric Authentication"
3. Complete biometric scan
4. Automatic login

**Component**: `BiometricAuthButton` (`src/components/native/BiometricAuthButton.tsx`)

### 3. Native Sharing ✅
**Status**: Integrated in referral system

Share content using the device's native share sheet, which includes all available sharing options (Messages, Email, Social Media, etc.)

**Locations**:
- Referral pages
- Share buttons throughout the app

**Component**: `ShareButton` (`src/components/native/ShareButton.tsx`)

### 4. Contact Import ✅
**Status**: Available for providers

Providers can import contacts directly from their device to quickly add clients.

**Location**: Provider → Clients → Import Clients

**Features**:
- Requests contact permissions
- Reads device contacts
- Displays preview before import
- Maps contacts to client records

**Component**: `ContactImporter` (`src/components/native/ContactImporter.tsx`)

### 5. Safe Area Support ✅
**Status**: Automatic across all pages

The app automatically adjusts padding to avoid device notches, status bars, and home indicators.

**Implementation**: 
- CSS variables in `src/index.css`
- Applied in `src/App.css`

**Variables**:
```css
--safe-area-top
--safe-area-bottom
--safe-area-left
--safe-area-right
```

### 6. Background Location 🔄
**Status**: Available for providers

Enables location tracking while the app is in the background, useful for:
- Job tracking
- Route optimization
- Time tracking accuracy

**Control**: Settings → App Settings → Native Features

### 7. Device Information ✅
**Status**: Available in settings

View app version, bundle number, and device ID.

**Location**: Settings → App Settings → Native Features

## Developer Resources

### Core Hook: `useDespia`

Location: `src/hooks/useDespia.ts`

This custom hook provides access to all Despia Native features:

```typescript
import { useDespia } from '@/hooks/useDespia';

function MyComponent() {
  const {
    triggerHaptic,
    authenticateBiometric,
    shareContent,
    getDeviceId,
    // ... and more
  } = useDespia();

  const handleAction = () => {
    triggerHaptic('success');
    shareContent('Check out HomeBase!', 'https://homebase.app');
  };
}
```

### Available Methods

```typescript
triggerHaptic(type: 'light' | 'heavy' | 'success' | 'warning' | 'error')
showSpinner()
hideSpinner()
authenticateBiometric(): Promise<boolean>
shareContent(message: string, url?: string)
getDeviceId(): Promise<string | null>
getAppVersion(): Promise<{versionNumber: string, bundleNumber: string}>
takeScreenshot()
saveImage(url: string)
requestContactsPermission(): Promise<boolean>
readContacts(): Promise<Contact[]>
enableBackgroundLocation()
setStatusBarColor(r: number, g: number, b: number)
enableFullScreen(enable: boolean)
```

## Components

### BiometricAuthButton
Location: `src/components/native/BiometricAuthButton.tsx`

Renders a button that triggers biometric authentication.

```tsx
<BiometricAuthButton
  onSuccess={() => console.log('Authenticated!')}
  onError={() => console.log('Failed')}
/>
```

### ShareButton
Location: `src/components/native/ShareButton.tsx`

Native share button component.

```tsx
<ShareButton
  message="Check out HomeBase!"
  url="https://homebase.app"
  variant="outline"
  size="sm"
/>
```

### ContactImporter
Location: `src/components/native/ContactImporter.tsx`

Import contacts from device.

```tsx
<ContactImporter
  onContactsSelected={(contacts) => {
    console.log('Imported:', contacts);
  }}
/>
```

## Configuration Pages

### Main Settings
- **Path**: `/provider/settings/app`
- **File**: `src/pages/provider/settings/AppSettings.tsx`
- Features: PWA settings and link to native features

### Native Features Settings
- **Path**: `/provider/settings/native`
- **File**: `src/pages/provider/settings/NativeSettings.tsx`
- Features: Test all native capabilities, view device info, manage permissions

## Future Enhancements

Despia Native supports many more features that could be integrated:

### Potential Additions
1. **In-App Purchases**: RevenueCat integration for subscriptions
2. **Push Notifications**: OneSignal integration (native)
3. **Native Widgets**: Home screen widgets for quick actions
4. **App Clips**: Quick access to key features
5. **Camera Access**: Photo capture and document scanning
6. **File Operations**: Native file picker and management
7. **Calendar Integration**: Add appointments to device calendar
8. **Payment Request**: Native payment UI

## Testing Native Features

### Development
Native features work in development mode when:
1. The app is running through Capacitor iOS/Android
2. Testing on a physical device or emulator

### Production
All features are available when the app is:
1. Deployed to App Store / Google Play
2. Installed as a native app

### Web Fallbacks
All native features include graceful fallbacks for web browsers:
- Haptics: Silent (no action)
- Biometric: Falls back to regular password
- Share: Uses Web Share API if available
- Contacts: Not available (button disabled)

## Performance Considerations

- **Haptic feedback**: Minimal performance impact, triggered synchronously
- **Biometric auth**: Async, shows native UI, ~1-2 second latency
- **Contact import**: Can be slow for large contact lists (>1000 contacts)
- **Background location**: Battery impact, use judiciously

## Security Notes

1. **Biometric Authentication**: Device-level security, credentials never exposed
2. **Contacts**: Requires explicit user permission, data stays local
3. **Location**: User must grant background location permission
4. **Device ID**: Used for analytics only, not personally identifiable

## Documentation Links

- [Despia Native Official Docs](https://lovable.despia.com)
- [How It Works](https://lovable.despia.com/default-guide/how-it-works)
- [API Reference](https://lovable.despia.com/default-guide/api-reference)

## Support

For issues or questions about Despia Native integration:
1. Check the official documentation
2. Review the `useDespia` hook implementation
3. Test in the Native Features settings page
4. Contact Despia support for native-specific issues

---

**Integration Date**: November 2024
**Despia Native Version**: Latest
**HomeBase Compatibility**: Full
