import { useAuth } from '@/contexts/auth';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isLoggedIn } = useAuth();
  return <Redirect href={isLoggedIn ? '/(tabs)' : '/get-started'} />;
}
