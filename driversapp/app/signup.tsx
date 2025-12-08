import { router } from 'expo-router';
import React, { useEffect } from 'react';

export default function SignupScreen() {
  useEffect(() => {
    // Redirect to step 1
    router.replace('/signup-step1');
  }, []);

  return null;
}
