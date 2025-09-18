'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-2xl">V</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verqo</h1>
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    </div>
  );
}