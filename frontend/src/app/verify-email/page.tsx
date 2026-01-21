'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/services/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setMessage('Token manquant');
        setLoading(false);
        return;
      }
      try {
        const response = await authApi.verifyEmail(token);
        if (response.success) {
          setSuccess(true);
          setMessage('Email vérifié avec succès');
        } else {
          setMessage(response.message || 'Vérification échouée');
        }
      } catch {
        setMessage('Vérification échouée');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-verqo-gray-light to-verqo-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérification email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Vérification en cours...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={success ? 'text-green-700' : 'text-red-600'}>{message}</span>
            </div>
          )}

          <Button onClick={() => router.push('/login')} className="w-full">
            Retour à la connexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
