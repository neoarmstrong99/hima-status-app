import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';

export default function RootLayout() {
  useFrameworkReady();

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // URLから招待コードを検出してリダイレクト
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const joinMatch = path.match(/\/join\/([A-Z0-9]{8})/);
      if (joinMatch && segments[0] !== 'join') {
        const inviteCode = joinMatch[1];
        router.replace(`/join/${inviteCode}`);
      }
    }
  }, [segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="join/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
