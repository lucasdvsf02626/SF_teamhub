// Which stack a user sees is derived from session state rather than pushed
// imperatively, so a token expiring mid-use drops them back to sign-in on its
// own — no screen has to remember to check.

import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { SignInScreen } from '../screens/SignInScreen';

const Stack = createNativeStackNavigator();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f1419',
    card: '#131a21',
    primary: '#f59e0b',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.1)',
  },
};

export function RootNavigator() {
  const { session, loading } = useAuth();

  // Without this gate the sign-in screen flashes for anyone already signed in.
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ground">
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
