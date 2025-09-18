'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Cookies from 'js-cookie';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function GitHubCallbackInner() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const action = searchParams.get('action');
      
      if (action === 'login_success') {
        // Connexion réussie via GitHub
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Stocker les tokens
          Cookies.set('accessToken', accessToken, { expires: 1 });
          Cookies.set('refreshToken', refreshToken, { expires: 7 });
          
          setStatus('success');
          setMessage('Connexion GitHub réussie !');
          
          // Rediriger vers le dashboard après 2 secondes
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Tokens manquants dans la réponse');
        }
      } else if (action === 'link_account') {
        // L'utilisateur doit lier son compte GitHub existant
        const githubData = {
          id: searchParams.get('github_id'),
          username: searchParams.get('github_username'),
          email: searchParams.get('github_email'),
          avatar: searchParams.get('github_avatar'),
          name: searchParams.get('github_name'),
        };
        
        // Stocker temporairement les données GitHub
        sessionStorage.setItem('github_linking_data', JSON.stringify(githubData));
        
        setStatus('success');
        setMessage('Redirection vers la connexion...');
        
        // Rediriger vers la page de login avec un message
        setTimeout(() => {
          router.push('/login?github_link=true');
        }, 2000);
      } else {
        setStatus('error');
        setMessage('Action non reconnue dans le callback GitHub');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-blue-600" />
          )}
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
          )}
          {status === 'error' && (
            <XCircle className="h-16 w-16 mx-auto text-red-600" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold mb-4">
          {status === 'loading' && 'Traitement de la connexion GitHub...'}
          {status === 'success' && 'Connexion réussie !'}
          {status === 'error' && 'Erreur de connexion'}
        </h1>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        {status === 'loading' && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-500">Vérification des permissions GitHub...</p>
          </div>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Retour à la connexion
          </button>
        )}
      </div>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <GitHubCallbackInner />
    </Suspense>
  );
}
