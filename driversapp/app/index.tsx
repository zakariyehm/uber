import { useAuth } from '@/contexts/auth';
import { Redirect } from 'expo-router';

/** Entry redirect after native splash + auth bootstrap. */
export default function Index() {
  const { isLoggedIn } = useAuth();
  return <Redirect href={isLoggedIn ? '/(tabs)' : '/login'} />;
}
