import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import ChatScreen from './src/screens/ChatScreen';
import SearchUsersScreen from './src/screens/SearchUsersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SessionsScreen from './src/screens/SessionsScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Conversations: undefined;
  Chat: { conversationId: string; conversationName: string; partnerAvatarUrl?: string };
  SearchUsers: undefined;
  Profile: undefined;
  Settings: undefined;
  Sessions: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated());

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0e1621' }, animation: 'slide_from_right' }}>
            <RootStack.Screen name="Conversations" component={ConversationsScreen} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="SearchUsers" component={SearchUsersScreen} options={{ animation: 'slide_from_bottom' }} />
            <RootStack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_bottom' }} />
            <RootStack.Screen name="Settings" component={SettingsScreen} />
            <RootStack.Screen name="Sessions" component={SessionsScreen} />
          </RootStack.Navigator>
        ) : (
          <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
          </AuthStack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
