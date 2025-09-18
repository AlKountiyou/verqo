'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/services/api';
import { Github, ExternalLink, Unlink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { projectsApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

interface GitHubConnectionProps {
  githubUrl?: string;
  onRepositoryAccess?: (hasAccess: boolean) => void;
  projectId?: string;
}

export default function GitHubConnection({ githubUrl, onRepositoryAccess, projectId }: GitHubConnectionProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(!!user?.githubUsername);
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [repositories, setRepositories] = useState<Array<{ fullName: string }>>([]);
  const [selecting, setSelecting] = useState(false);
  const [savingRepo, setSavingRepo] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRepoAccess, setHasRepoAccess] = useState<boolean | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmUnlinkRepo, setConfirmUnlinkRepo] = useState(false);

  useEffect(() => {
    checkGitHubConnection();
    console.log(githubUsername)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.log(response)
      
      if (response.success && response.data.connected) {
        setIsConnected(true);
        setGithubUsername(response.data.githubUsername || '');
        const repos = ((response.data.repositories || []) as unknown[]).map((r) => {
          const obj = r as { fullName?: string; full_name?: string };
          return { fullName: obj.fullName ?? obj.full_name ?? '' };
        });
        setRepositories(repos);
      } else {
        // Si le profil indique déjà un lien GitHub, considérer comme connecté
        setIsConnected(!!user?.githubUsername);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la connexion GitHub:', error);
      setIsConnected(!!user?.githubUsername);
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

  const saveRepository = async () => {
    if (!projectId || !selectedRepo) return;
    setSavingRepo(true);
    try {
      await projectsApi.updateProject(projectId, { githubUrl: `https://github.com/${selectedRepo}` });
      setSelecting(false);
      onRepositoryAccess?.(true);
    } catch {
      setError('Impossible d\'enregistrer le repository sur le projet');
    } finally {
      setSavingRepo(false);
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

  // ADMIN: ne voit pas la section GitHub
  if (user?.role === 'ADMIN') {
    return null;
  }

  // Non connecté à GitHub
  if (!isConnected) {
    // CLIENT: lecture seule
    if (user?.role === 'CLIENT') {
      // Si un repo est déjà lié, l'afficher (pas de message d'invitation)
      if (githubUrl) {
        return (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-900 text-sm flex items-center">
                <Github className="h-4 w-4 mr-2" />
                Repository lié
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm p-2 rounded border bg-white">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {githubUrl.replace('https://github.com/', '')}
                </a>
                <Badge variant={hasRepoAccess ? 'success' : 'secondary'}>
                  {hasRepoAccess ? 'Accès confirmé' : 'Accès à vérifier'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      }

      // Aucun repo lié: inviter le client à demander à un dev
      return (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-900 text-sm flex items-center">
              <Github className="h-4 w-4 mr-2" />
              Intégration GitHub
            </CardTitle>
            <CardDescription className="text-orange-700">
              Un développeur doit connecter GitHub et lier un repository pour ce projet.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    // DEV: peut connecter GitHub
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

  // Connecté à GitHub
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
        {/* Repo actuellement lié */}
        {githubUrl && (
          <div className="flex items-center justify-between text-sm p-2 rounded border bg-white">
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">Repository lié :</span>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {githubUrl.replace('https://github.com/', '')}
              </a>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={hasRepoAccess ? 'success' : 'error'}>
                {hasRepoAccess ? 'Accès confirmé' : 'Accès non confirmé'}
              </Badge>
              {user?.role === 'DEV' && projectId && (
                <Button size="sm" variant="outline" onClick={() => setConfirmUnlinkRepo(true)}>
                  Désassigner le repo
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Choisir et lier un repo au projet (DEV uniquement) */}
        {projectId && user?.role === 'DEV' && !githubUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lier un repository GitHub</span>
              <Button variant="outline" size="sm" onClick={() => setSelecting(s => !s)}>
                {selecting ? 'Annuler' : 'Choisir'}
              </Button>
            </div>
            {selecting && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Rechercher (owner/repo)"
                  className="w-full border rounded px-3 py-2 text-sm"
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  list="github-repos"
                />
                <datalist id="github-repos">
                  {repositories.map((r) => (
                    <option key={r.fullName} value={r.fullName} />
                  ))}
                </datalist>
                <Button size="sm" onClick={saveRepository} disabled={!selectedRepo || savingRepo}>
                  {savingRepo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lier ce repo'}
                </Button>
              </div>
            )}
          </div>
        )}

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
          {user?.role === 'DEV' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConfirmDisconnect(true)}
              disabled={loading}
              className="text-red-600 hover:text-red-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <ConfirmDialog
          isOpen={confirmDisconnect}
          onClose={() => setConfirmDisconnect(false)}
          onConfirm={async () => {
            await disconnectFromGitHub();
            setConfirmDisconnect(false);
          }}
          title="Déconnecter GitHub"
          description="Cette action supprimera le lien GitHub de votre compte pour Verqo. Vous pourrez le reconnecter plus tard."
          confirmLabel="Déconnecter"
          confirmTargetLabel={`@${githubUsername}`}
        />

        <ConfirmDialog
          isOpen={confirmUnlinkRepo}
          onClose={() => setConfirmUnlinkRepo(false)}
          onConfirm={async () => {
            if (!projectId || !githubUrl) return;
            try {
              await projectsApi.updateProject(projectId, { githubUrl: null as any });
              setConfirmUnlinkRepo(false);
              setHasRepoAccess(null);
              onRepositoryAccess?.(false);
            } catch (e) {
              // noop, ConfirmDialog already acks errors via console
            }
          }}
          title="Désassigner le repository"
          description="Le repository ne sera plus lié à ce projet. Cette action est réversible."
          confirmLabel="Désassigner"
          confirmTargetLabel={githubUrl ? githubUrl.replace('https://github.com/', '') : ''}
        />
      </CardContent>
    </Card>
  );
}
