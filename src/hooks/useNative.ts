import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useNative = () => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (isNative) {
      // Hide splash screen after app loads
      SplashScreen.hide();

      // Configure status bar
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#000000' });

      // Hide status bar for fullscreen gaming
      StatusBar.hide();
    }
  }, [isNative]);

  const hapticFeedback = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (isNative) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log('Haptic feedback not available');
      }
    }
  };

  const hideKeyboard = async () => {
    if (isNative) {
      try {
        await Keyboard.hide();
      } catch (error) {
        console.log('Keyboard hide not available');
      }
    }
  };

  return {
    isNative,
    platform,
    hapticFeedback,
    hideKeyboard,
  };
};