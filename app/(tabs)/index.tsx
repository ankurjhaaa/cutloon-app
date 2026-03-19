import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STORAGE_PERMISSION_MESSAGE = 'CUTLOON_REQUEST_STORAGE_PERMISSION';
const LOCATION_PERMISSION_MESSAGE = 'CUTLOON_REQUEST_LOCATION_PERMISSION';
const CAMERA_PERMISSION_MESSAGE = 'CUTLOON_REQUEST_CAMERA_PERMISSION';

const SWIPE_TAB_URLS = [
  'https://www.cutloon.com/',
  'https://www.cutloon.com/explore',
  'https://www.cutloon.com/bookings',
  'https://www.cutloon.com/profile',
] as const;

const getSwipeTabIndexFromUrl = (url: string): number => {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    if (path === '/') {
      return 0;
    }

    if (path === '/explore') {
      return 1;
    }

    if (path === '/bookings') {
      return 2;
    }

    if (path === '/profile') {
      return 3;
    }

    return -1;
  } catch {
    return -1;
  }
};

const WEBVIEW_PERMISSION_BRIDGE = `
(function () {
  if (window.__cutloonPermissionBridgeInstalled) {
    return;
  }
  window.__cutloonPermissionBridgeInstalled = true;

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) {
      return;
    }

    var fileInput = target.closest('input[type="file"]');
    if (fileInput && window.ReactNativeWebView) {
      var accept = fileInput.getAttribute('accept') || '';
      if (accept.includes('image') || accept.includes('video')) {
        window.ReactNativeWebView.postMessage('${CAMERA_PERMISSION_MESSAGE}');
      } else {
        window.ReactNativeWebView.postMessage('${STORAGE_PERMISSION_MESSAGE}');
      }
    }
  }, true);

  navigator.geolocation.getCurrentPosition = function (successCallback, errorCallback, options) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('${LOCATION_PERMISSION_MESSAGE}');
      var mockPosition = {
        coords: {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };
      setTimeout(function () {
        successCallback(mockPosition);
      }, 100);
    } else {
      errorCallback({ code: 1, message: 'Permission denied' });
    }
  };

  var originalGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('${CAMERA_PERMISSION_MESSAGE}');
      }

      if (!originalGetUserMedia) {
        return Promise.reject(new Error('Camera not available'));
      }

      return originalGetUserMedia.call(navigator.mediaDevices, constraints);
    };
  }
})();
true;
`;

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentSwipeTabIndex, setCurrentSwipeTabIndex] = useState(-1);
  const webViewRef = useRef<WebView | null>(null);
  const lastBackPressTime = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lastSwipeAt = useRef(0);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.56)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.72)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0.1)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(30)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const dotWave = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const orbitAnimation = Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const dotsAnimation = Animated.loop(
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotWave, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(dotWave, {
            toValue: 0,
            duration: 650,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );

    orbitAnimation.start();
    dotsAnimation.start();

    const splashAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.2,
          duration: 1600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoSpin, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(320),
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(1200),
          Animated.parallel([
            Animated.timing(brandOpacity, {
              toValue: 1,
              duration: 700,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(brandTranslateY, {
              toValue: 0,
              duration: 700,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]);

    splashAnimation.start(() => {
      setShowSplash(false);
    });

    return () => {
      splashAnimation.stop();
      orbitAnimation.stop();
      dotsAnimation.stop();
    };
  }, [
    brandOpacity,
    brandTranslateY,
    dotWave,
    logoScale,
    logoSpin,
    orbitRotation,
    ringOpacity,
    ringScale,
    splashOpacity,
    titleOpacity,
  ]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showSplash) {
        return true;
      }

      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      const currentTime = Date.now();

      if (currentTime - lastBackPressTime.current < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressTime.current = currentTime;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });

    return () => {
      backSubscription.remove();
    };
  }, [canGoBack, showSplash]);

  const logoRotate = logoSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-14deg', '0deg'],
  });

  const orbitRotate = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const leftDotScale = dotWave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  const centerDotScale = dotWave.interpolate({
    inputRange: [0, 1],
    outputRange: [1.15, 0.9],
  });

  const rightDotScale = dotWave.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.2],
  });

  const requestStoragePermissionForUpload = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (currentPermission.granted) {
      return;
    }

    const requestedPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requestedPermission.granted) {
      ToastAndroid.show('Permission granted. Pull to refresh to continue.', ToastAndroid.SHORT);
      return;
    }

    if (!requestedPermission.canAskAgain) {
      Alert.alert(
        'Storage Permission Disabled',
        'Storage permissions are required to upload images. Please enable them in app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    ToastAndroid.show('Storage permission required. Pull to refresh if needed.', ToastAndroid.SHORT);
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    const currentPermission = await Location.getForegroundPermissionsAsync();
    if (currentPermission.granted) {
      return;
    }

    const requestedPermission = await Location.requestForegroundPermissionsAsync();
    if (requestedPermission.granted) {
      ToastAndroid.show('Permission granted. Pull to refresh to continue.', ToastAndroid.SHORT);
      return;
    }

    if (!requestedPermission.canAskAgain) {
      Alert.alert(
        'Location Permission Disabled',
        'Location permissions are required to access your location. Please enable them in app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    ToastAndroid.show('Location permission required. Pull to refresh if needed.', ToastAndroid.SHORT);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    const currentPermission = await ImagePicker.getCameraPermissionsAsync();
    if (currentPermission.granted) {
      return;
    }

    const requestedPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (requestedPermission.granted) {
      ToastAndroid.show('Permission granted. Pull to refresh to continue.', ToastAndroid.SHORT);
      return;
    }

    if (!requestedPermission.canAskAgain) {
      Alert.alert(
        'Camera Permission Disabled',
        'Camera permissions are required to access your camera. Please enable them in app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    ToastAndroid.show('Camera permission required. Pull to refresh if needed.', ToastAndroid.SHORT);
  };

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === STORAGE_PERMISSION_MESSAGE) {
      await requestStoragePermissionForUpload();
    } else if (event.nativeEvent.data === LOCATION_PERMISSION_MESSAGE) {
      await requestLocationPermission();
    } else if (event.nativeEvent.data === CAMERA_PERMISSION_MESSAGE) {
      await requestCameraPermission();
    }
  };

  const navigateBySwipe = (direction: 'next' | 'prev') => {
    if (showSplash) {
      return;
    }

    if (currentSwipeTabIndex < 0) {
      return;
    }

    const now = Date.now();
    if (now - lastSwipeAt.current < 500) {
      return;
    }

    const targetIndex = direction === 'next' ? currentSwipeTabIndex + 1 : currentSwipeTabIndex - 1;
    if (targetIndex < 0 || targetIndex >= SWIPE_TAB_URLS.length) {
      return;
    }

    lastSwipeAt.current = now;
    webViewRef.current?.injectJavaScript(`window.location.href='${SWIPE_TAB_URLS[targetIndex]}'; true;`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background },
      ]}
      edges={['top']}>
      <StatusBar style={showSplash ? 'dark' : isDarkMode ? 'light' : 'dark'} />

      <View
        style={styles.webViewContainer}
        onTouchStart={(event) => {
          touchStartX.current = event.nativeEvent.pageX;
          touchStartY.current = event.nativeEvent.pageY;
        }}
        onTouchEnd={(event) => {
          const deltaX = event.nativeEvent.pageX - touchStartX.current;
          const deltaY = event.nativeEvent.pageY - touchStartY.current;

          const isHorizontalSwipe = Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
          if (!isHorizontalSwipe) {
            return;
          }

          if (deltaX > 0) {
            navigateBySwipe('prev');
          } else {
            navigateBySwipe('next');
          }
        }}>
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} enabled={isAtTop} />
          }
          scrollEnabled={isAtTop}
          style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://www.cutloon.com/login' }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            allowFileAccess
            onMessage={handleWebViewMessage}
            injectedJavaScriptBeforeContentLoaded={WEBVIEW_PERMISSION_BRIDGE}
            onNavigationStateChange={(navigationState) => {
              setCanGoBack(navigationState.canGoBack);
              setCurrentSwipeTabIndex(getSwipeTabIndexFromUrl(navigationState.url));
            }}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              setIsAtTop(y <= 0);
            }}
            onLoadEnd={() => {
              setRefreshing(false);
            }}
           
            nestedScrollEnabled={true}
            style={{ flex: 1 }}
          />
        </ScrollView>
      </View>

      {showSplash && (
        <Animated.View
          style={[
            styles.splashOverlay,
            {
              backgroundColor: '#FFFFFF',
              opacity: splashOpacity,
            },
          ]}>
          <View style={styles.contentWrap}>
            <Animated.View style={[styles.orbitLayer, { transform: [{ rotate: orbitRotate }] }]}>
              <View style={[styles.orbitDot, styles.orbitDotTop]} />
              <View style={[styles.orbitDot, styles.orbitDotRight]} />
              <View style={[styles.orbitDot, styles.orbitDotBottom]} />
            </Animated.View>

            <Animated.View
              style={[
                styles.logoRing,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />

            <Animated.View style={{ transform: [{ scale: logoScale }, { rotate: logoRotate }] }}>
              <Image source={require('@/assets/images/app-logo-dummy.png')} style={styles.logo} />
            </Animated.View>
          </View>

          <Animated.View
            style={[
              styles.brandBlock,
              {
                opacity: brandOpacity,
                transform: [{ translateY: brandTranslateY }],
              },
            ]}>
            <Animated.Text style={[styles.appTitle, { opacity: titleOpacity }]}>Cutloon</Animated.Text>
            <Text style={styles.slogan}>salons.discovery.booking</Text>
            <View style={styles.dotRow}>
              <Animated.View style={[styles.dot, { transform: [{ scale: leftDotScale }] }]} />
              <Animated.View style={[styles.dot, { transform: [{ scale: centerDotScale }] }]} />
              <Animated.View style={[styles.dot, { transform: [{ scale: rightDotScale }] }]} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  contentWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 240,
    marginBottom: 90,
  },
  orbitLayer: {
    position: 'absolute',
    width: 228,
    height: 228,
    borderRadius: 114,
  },
  orbitDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D71920',
  },
  orbitDotTop: {
    top: 3,
    left: 110,
  },
  orbitDotRight: {
    top: 110,
    right: 3,
  },
  orbitDotBottom: {
    bottom: 3,
    left: 110,
  },
  logoRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: '#D71920',
    backgroundColor: '#FFF5F6',
  },
  logo: {
    width: 116,
    height: 116,
  },
  brandBlock: {
    position: 'absolute',
    bottom: 88,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#D71920',
  },
  slogan: {
    marginTop: 4,
    fontSize: 13,
    letterSpacing: 1.7,
    color: '#AA1118',
    fontWeight: '600',
  },
  dotRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#D71920',
  },
});
