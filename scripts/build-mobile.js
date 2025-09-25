#!/usr/bin/env node

/**
 * Mobile Build Script for Slappy Nerds
 * 
 * This script automates the mobile app build process for both iOS and Android.
 * 
 * Usage: 
 *   node scripts/build-mobile.js --platform ios
 *   node scripts/build-mobile.js --platform android  
 *   node scripts/build-mobile.js --platform all
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const platformIndex = args.indexOf('--platform');
const platform = platformIndex !== -1 ? args[platformIndex + 1] : 'all';

console.log('🚀 Slappy Nerds Mobile Build Script');
console.log('====================================');
console.log(`Target platform: ${platform}`);
console.log('');

// Utility function to run commands
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
  console.log('');
}

// Check if required directories exist
function checkDirectories() {
  const requiredDirs = [];
  
  if (platform === 'ios' || platform === 'all') {
    requiredDirs.push('ios');
  }
  
  if (platform === 'android' || platform === 'all') {
    requiredDirs.push('android');
  }
  
  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  if (missingDirs.length > 0) {
    console.log('⚠️  Missing platform directories. Adding them now...');
    missingDirs.forEach(dir => {
      if (dir === 'ios') {
        runCommand('npx cap add ios', 'Adding iOS platform');
      } else if (dir === 'android') {
        runCommand('npx cap add android', 'Adding Android platform');
      }
    });
  }
}

// Main build process
function buildMobile() {
  console.log('🔧 Starting mobile build process...');
  console.log('');
  
  // Step 1: Install dependencies
  runCommand('npm install', 'Installing dependencies');
  
  // Step 2: Build web assets
  runCommand('npm run build', 'Building web assets');
  
  // Step 3: Check platform directories
  checkDirectories();
  
  // Step 4: Sync Capacitor
  runCommand('npx cap sync', 'Syncing Capacitor');
  
  // Step 5: Platform-specific builds
  if (platform === 'ios' || platform === 'all') {
    console.log('🍎 iOS Build Instructions:');
    console.log('1. Run: npx cap open ios');
    console.log('2. In Xcode: Product → Archive');
    console.log('3. Distribute to App Store Connect');
    console.log('');
  }
  
  if (platform === 'android' || platform === 'all') {
    console.log('🤖 Android Build Instructions:');
    console.log('1. Run: npx cap open android');
    console.log('2. In Android Studio: Build → Generate Signed Bundle/APK');
    console.log('3. Choose Android App Bundle (.aab)');
    console.log('4. Upload to Google Play Console');
    console.log('');
  }
  
  console.log('✨ Build preparation complete!');
  console.log('');
  console.log('📚 Next steps:');
  console.log('1. Open your platform in the respective IDE');
  console.log('2. Configure signing/certificates');
  console.log('3. Build for release');
  console.log('4. Upload to app store');
  console.log('');
  console.log('📖 For detailed instructions, see: MOBILE_DEPLOYMENT_GUIDE.md');
}

// Validate platform argument
if (!['ios', 'android', 'all'].includes(platform)) {
  console.error('❌ Invalid platform. Use: ios, android, or all');
  process.exit(1);
}

// Run the build process
buildMobile();