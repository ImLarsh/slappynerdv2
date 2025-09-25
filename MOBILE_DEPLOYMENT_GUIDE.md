# 📱 Slappy Nerds Mobile App Deployment Guide

## 🚀 Quick Start

Your web app has been converted to a native mobile app using Capacitor! Follow these steps to build and publish to app stores.

## 📋 Prerequisites

### For iOS Development:
- **macOS computer** (required for iOS development)
- **Xcode 14+** (free from Mac App Store)
- **Apple Developer Account** ($99/year for app store publishing)

### For Android Development:
- **Android Studio** (free download)
- **Java Development Kit (JDK) 11+**
- **Google Play Console Account** ($25 one-time fee)

## 🛠️ Initial Setup

### 1. Export to GitHub
1. Click "Export to GitHub" in Lovable
2. Clone your repository locally:
```bash
git clone [your-repo-url]
cd slappy-nerds
```

### 2. Install Dependencies
```bash
npm install
npx cap sync
```

### 3. Add Native Platforms
```bash
# Add iOS platform (requires macOS)
npx cap add ios

# Add Android platform
npx cap add android
```

## 🏗️ Building the App

### 1. Build Web Assets
```bash
npm run build
npx cap sync
```

### 2. Generate Icons and Splash Screens
Use the provided icons in the `public/` folder or replace with your own:
- `icon-1024.png` - App icon (1024x1024)
- `splash-2732x2732.png` - Splash screen

Generate all required sizes:
```bash
# Install capacitor assets plugin
npm install -g @capacitor/assets

# Generate all icons and splash screens
npx capacitor-assets generate
```

## 📱 Android Deployment

### 1. Open in Android Studio
```bash
npx cap open android
```

### 2. Configure App Signing
1. In Android Studio: Build → Generate Signed Bundle/APK
2. Create new keystore or use existing
3. Fill in keystore details (SAVE THESE CREDENTIALS!)

### 3. Build Release APK/AAB
1. Build → Generate Signed Bundle/APK
2. Choose "Android App Bundle" (required for Play Store)
3. Select your keystore and build

### 4. Upload to Google Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Upload your `.aab` file
4. Fill in app details:
   - **App Name**: Slappy Nerds
   - **Package ID**: com.slappynerds.game
   - **Category**: Games
   - **Content Rating**: Fill questionnaire
5. Set up store listing with screenshots
6. Submit for review

## 🍎 iOS Deployment

### 1. Open in Xcode
```bash
npx cap open ios
```

### 2. Configure Signing & Capabilities
1. In Xcode, select your project
2. Go to "Signing & Capabilities"
3. Select your Apple Developer Team
4. Xcode will automatically manage provisioning

### 3. Archive and Upload
1. Product → Archive
2. In Organizer, click "Distribute App"
3. Choose "App Store Connect"
4. Upload to App Store Connect

### 4. Submit to App Store
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Fill in app metadata:
   - **App Name**: Slappy Nerds
   - **Bundle ID**: com.slappynerds.game
   - **Category**: Games
   - **Age Rating**: Fill questionnaire
3. Upload screenshots (required sizes)
4. Submit for review

## 🎨 Required Assets

### App Icons (all sizes auto-generated from your 1024x1024 icon):
- iOS: 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87, 120x120, 152x152, 167x167, 180x180, 1024x1024
- Android: 48x48, 72x72, 96x96, 144x144, 192x192, 512x512

### Screenshots Required:
- **iPhone**: 1290x2796 (iPhone 14 Pro Max)
- **Android**: 1080x1920 (min), up to 3840x2160

## ⚙️ App Configuration

Your app is configured with:
- **Package ID**: `com.slappynerds.game`
- **App Name**: "Slappy Nerds"
- **Version**: 1.0.0
- **Build Number**: 1
- **Orientation**: Portrait only
- **Full Screen**: Yes (for immersive gaming)

## 🔄 Future Updates

### To update your app:

1. **Update version numbers**:
   ```bash
   # Edit package.json version
   # Update android/app/build.gradle versionCode & versionName
   # Update ios/App/App.xcodeproj project settings
   ```

2. **Build and sync**:
   ```bash
   npm run build
   npx cap sync
   ```

3. **Rebuild and redistribute** following the same steps above

## 🛡️ App Store Guidelines

### Google Play Requirements:
- ✅ Target API level 33+ (Android 13)
- ✅ App bundle format (.aab)
- ✅ Privacy policy (if collecting data)
- ✅ Content rating
- ✅ Proper app description and metadata

### Apple App Store Requirements:
- ✅ iOS 13+ support
- ✅ 64-bit architecture
- ✅ App Store Review Guidelines compliance
- ✅ Privacy policy (if collecting data)
- ✅ Proper app metadata and screenshots

## 🎯 Performance Optimizations

Your app includes:
- ✅ Haptic feedback for native feel
- ✅ Optimized canvas rendering
- ✅ Native splash screen
- ✅ Status bar configuration
- ✅ Fullscreen gaming mode
- ✅ Portrait lock
- ✅ Audio optimization

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Ensure you have the latest Xcode/Android Studio
   - Run `npx cap sync` after any changes
   - Clean build folders if needed

2. **Signing Issues**:
   - Check Apple Developer account status
   - Verify bundle IDs match across all configs
   - Regenerate provisioning profiles if needed

3. **Performance Issues**:
   - Test on actual devices, not just simulators
   - Use Xcode Instruments for iOS performance profiling
   - Check Android memory usage in Android Studio

## 📞 Support

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Apple Developer**: https://developer.apple.com/support
- **Google Play Console**: https://support.google.com/googleplay/android-developer

## 🎉 You're Ready!

Your Slappy Nerds mobile app is now ready for the app stores! The native optimizations will provide smooth 60fps gameplay on mobile devices.

---

**Next Steps**: 
1. Test thoroughly on real devices
2. Set up app store accounts
3. Generate production builds
4. Submit for review

Good luck with your app store launch! 🚀