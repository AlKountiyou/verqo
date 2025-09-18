'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/services/api';
import { Github, ExternalLink, Unlink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface GitHubConnectionProps {
  githubUrl?: string;
  onRepositoryAccess?: (hasAccess: boolean) => void;
}

export default function GitHubConnection({ githubUrl, onRepositoryAccess }: GitHubConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [repositories, setRepositories] = useState<Array<{ fullName: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRepoAccess, setHasRepoAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  useEffect(() => {
    if (githubUrl && repositories.length > 0) {
      checkRepositoryAccess();
    }
  }, [githubUrl, repositories]);

  const checkGitHubConnection = async () => {
    try {
      setLoading(true);
      const response = await authApi.getUserRepositories();
      
      if (response.success && response.data.connected) {
        setIsConnected(true);
        setGithubUsername(response.data.githubUsername || '');
        const repos = ((response.data.repositories || []) as unknown[]).map((r) => {
          const obj = r as { fullName?: string; full_name?: string };
          return { fullName: obj.fullName ?? obj.full_name ?? '' };
        });
        setRepositories(repos);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la connexion GitHub:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const checkRepositoryAccess = () => {
    if (!githubUrl) {
      setHasRepoAccess(null);
      onRepositoryAccess?.(false);
      return;
    }

    // Extraire le nom du repo de l'URL GitHub
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      setHasRepoAccess(false);
      onRepositoryAccess?.(false);
      return;
    }

    const [, owner, repoName] = match;
    const fullRepoName = `${owner}/${repoName.replace('.git', '')}`;
    
    // Vérifier si le repo est dans la liste des repositories accessibles
    const hasAccess = repositories.some(repo => 
      (repo.fullName || '').toLowerCase() === fullRepoName.toLowerCase()
    );
    
    setHasRepoAccess(hasAccess);
    onRepositoryAccess?.(hasAccess);
  };

  const connectToGitHub = async () => {
    try {
      setLoading(true);
      await authApi.connectGitHub();
    } catch (error) {
      setError('Erreur lors de la connexion à GitHub');
      setLoading(false);
    }
  };

  const disconnectFromGitHub = async () => {
    try {
      setLoading(true);
      const response = await authApi.disconnectGitHub();
      
      if (response.success) {
        setIsConnected(false);
        setGithubUsername('');
        setRepositories([]);
        setHasRepoAccess(null);
        onRepositoryAccess?.(false);
      }
    } catch (error) {
      setError('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isConnected) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Vérification de la connexion GitHub...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-orange-900 text-sm flex items-center">
            <Github className="h-4 w-4 mr-2" />
            Connexion GitHub requise
          </CardTitle>
          <CardDescription className="text-orange-700">
            Connectez votre compte GitHub pour accéder aux repositories et lancer les tests automatisés.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm mb-3">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <Button 
            onClick={connectToGitHub} 
            disabled={loading}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Github className="h-4 w-4 mr-2" />
            )}
            Connecter GitHub
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-900 text-sm flex items-center justify-between">
          <div className="flex items-center">
            <Github className="h-4 w-4 mr-2" />
            GitHub connecté
          </div>
          <Badge variant="success" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        </CardTitle>
        <CardDescription className="text-green-700">
          Connecté en tant que <strong>@{githubUsername}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Statut d'accès au repository */}
        {githubUrl && (
          <div className="flex items-center justify-between text-sm">
            <span>Accès au repository :</span>
            {hasRepoAccess === null ? (
              <Badge variant="secondary">Non vérifié</Badge>
            ) : hasRepoAccess ? (
              <Badge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Autorisé
              </Badge>
            ) : (
              <Badge variant="error">
                <AlertCircle className="h-3 w-3 mr-1" />
                Non autorisé
              </Badge>
            )}
          </div>
        )}

        {/* Informations sur les repositories */}
        <div className="text-xs text-green-700">
          {repositories.length} repository(s) accessible(s)
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(`https://github.com/${githubUsername}`, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Voir GitHub
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={disconnectFromGitHub}
            disabled={loading}
            className="text-red-600 hover:text-red-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
