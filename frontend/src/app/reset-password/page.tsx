'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '@/services/api';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (!token) {
      setError('Token manquant');
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.resetPassword(token, password);
      if (response.success) {
        setMessage('Mot de passe réinitialisé avec succès');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setError(response.message || 'Erreur lors de la réinitialisation');
      }
    } catch {
      setError('Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-verqo-gray-light to-verqo-white px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Réinitialiser le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className="flex items-center space-x-2 text-green-700 text-sm bg-green-50 p-3 rounded-md">
                <CheckCircle className="h-4 w-4" />
                <span>{message}</span>
              </div>
            )}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Nouveau mot de passe
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                'Réinitialiser'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
