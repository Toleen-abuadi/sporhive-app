import { useEffect } from 'react';

export function useFrameworkReady() {
  useEffect(() => {
    window.frameworkReady?.();
  });
}
