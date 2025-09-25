#!/usr/bin/env node

/**
 * Icon Generation Script for Slappy Nerds Mobile App
 * 
 * This script helps generate all required icon sizes for iOS and Android
 * from your main 1024x1024 icon file.
 * 
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Required icon sizes for iOS and Android
const iconSizes = {
  ios: [
    { size: 20, scale: 1, name: 'AppIcon-20x20@1x.png' },
    { size: 20, scale: 2, name: 'AppIcon-20x20@2x.png' },
    { size: 20, scale: 3, name: 'AppIcon-20x20@3x.png' },
    { size: 29, scale: 1, name: 'AppIcon-29x29@1x.png' },
    { size: 29, scale: 2, name: 'AppIcon-29x29@2x.png' },
    { size: 29, scale: 3, name: 'AppIcon-29x29@3x.png' },
    { size: 40, scale: 1, name: 'AppIcon-40x40@1x.png' },
    { size: 40, scale: 2, name: 'AppIcon-40x40@2x.png' },
    { size: 40, scale: 3, name: 'AppIcon-40x40@3x.png' },
    { size: 60, scale: 2, name: 'AppIcon-60x60@2x.png' },
    { size: 60, scale: 3, name: 'AppIcon-60x60@3x.png' },
    { size: 76, scale: 1, name: 'AppIcon-76x76@1x.png' },
    { size: 76, scale: 2, name: 'AppIcon-76x76@2x.png' },
    { size: 83.5, scale: 2, name: 'AppIcon-83.5x83.5@2x.png' },
    { size: 1024, scale: 1, name: 'AppIcon-1024x1024@1x.png' }
  ],
  android: [
    { size: 36, density: 'ldpi', name: 'ic_launcher.png' },
    { size: 48, density: 'mdpi', name: 'ic_launcher.png' },
    { size: 72, density: 'hdpi', name: 'ic_launcher.png' },
    { size: 96, density: 'xhdpi', name: 'ic_launcher.png' },
    { size: 144, density: 'xxhdpi', name: 'ic_launcher.png' },
    { size: 192, density: 'xxxhdpi', name: 'ic_launcher.png' }
  ]
};

console.log('🎨 Icon Generation Guide for Slappy Nerds');
console.log('==========================================');
console.log('');
console.log('To generate all required icons automatically, you can use:');
console.log('');
console.log('Option 1 - Capacitor Assets (Recommended):');
console.log('  npm install -g @capacitor/assets');
console.log('  npx capacitor-assets generate');
console.log('');
console.log('Option 2 - Manual generation tools:');
console.log('  - Use online tools like: https://easyappicon.com/');
console.log('  - Upload your public/icon-1024.png');
console.log('  - Download generated icons');
console.log('  - Place in appropriate directories');
console.log('');
console.log('Required icon directories:');
console.log('  iOS: ios/App/App/Assets.xcassets/AppIcon.appiconset/');
console.log('  Android: android/app/src/main/res/mipmap-*/');
console.log('');
console.log('Your main icon file is located at: public/icon-1024.png');
console.log('');
console.log('📱 Required iOS icon sizes:');
iconSizes.ios.forEach(icon => {
  const actualSize = icon.size * icon.scale;
  console.log(`  ${actualSize}x${actualSize} (${icon.name})`);
});
console.log('');
console.log('🤖 Required Android icon sizes:');
iconSizes.android.forEach(icon => {
  console.log(`  ${icon.size}x${icon.size} (${icon.density} density)`);
});
console.log('');
console.log('💡 Pro tip: The Capacitor Assets plugin will automatically generate');
console.log('   all these sizes from your 1024x1024 source icon!');