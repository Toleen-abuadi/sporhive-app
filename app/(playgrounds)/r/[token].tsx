import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function RatingResolverScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();

  useEffect(() => {
    const resolvedToken = Array.isArray(token) ? token[0] : token;
    if (resolvedToken) {
      router.replace(`/(playgrounds)/rate?token=${resolvedToken}`);
    }
  }, [router, token]);

  return null;
}
