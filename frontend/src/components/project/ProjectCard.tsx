'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Project, TestFlow } from '@/types';
import { Github, Globe, Users, Play, Calendar, Clock, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FlowCard from './FlowCard';
import GitHubConnection from './GitHubConnection';
import ManageTeamModal from './ManageTeamModal';
import { testFlowsApi, projectsApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface ProjectCardProps {
  project: Project;
  onProjectUpdate?: () => void;
}

export default function ProjectCard({ project, onProjectUpdate }: ProjectCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [showFlows, setShowFlows] = useState(false);
  const [hasRepoAccess, setHasRepoAccess] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean } >({ open: false });

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PAUSED':
        return 'warning';
      case 'COMPLETED':
        return 'default';
      case 'ARCHIVED':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'Actif';
      case 'PAUSED':
        return 'En pause';
      case 'COMPLETED':
        return 'Terminé';
      case 'ARCHIVED':
        return 'Archivé';
      default:
        return status;
    }
  };

  const loadFlows = async () => {
    if (flows.length > 0) {
      setShowFlows(!showFlows);
      return;
    }

    setLoadingFlows(true);
    try {
      const projectFlows = await testFlowsApi.getFlowsByProject(project.id);
      setFlows(projectFlows);
      setShowFlows(true);
    } catch (error) {
      console.error('Failed to load flows:', error);
    } finally {
      setLoadingFlows(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{project.name}</CardTitle>
            {project.description && (
              <CardDescription>{project.description}</CardDescription>
            )}
          </div>
          <Badge variant={getStatusColor(project.status)}>
            {getStatusText(project.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span suppressHydrationWarning>Créé le {formatDate(project.createdAt)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{project.developers.length} développeur(s) assigné(s)</span>
          </div>
        </div>

        {/* Informations sur le propriétaire */}
        <div className="text-sm">
          <span className="text-muted-foreground">Propriétaire: </span>
          <span className="font-medium">
            {project.owner.firstName} {project.owner.lastName} ({project.owner.email})
          </span>
        </div>

        {/* Liste des développeurs et gestion d'équipe */}
        <div className="space-y-3">
          {project.developers.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Développeurs: </span>
              <div className="mt-1 flex flex-wrap gap-2">
                {project.developers.map((dev) => (
                  <span 
                    key={dev.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    {dev.user.firstName} {dev.user.lastName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bouton gérer l'équipe – visible uniquement pour le propriétaire (pas ADMIN) */}
          {user?.id === project.ownerId && user?.role !== 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTeamModal(true)}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Gérer l&apos;équipe
            </Button>
          )}
          {user?.role !== 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${project.id}/flows`)}
              disabled={
                user?.role === 'DEV'
                  ? !hasRepoAccess
                  : user?.role === 'CLIENT'
                  ? !project.githubUrl
                  : false
              }
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Gérer les tests
            </Button>
          )}
          {(user?.role === 'ADMIN' || user?.id === project.ownerId) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete({ open: true })}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le projet
            </Button>
          )}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-2">
          {project.githubUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </a>
            </Button>
          )}
          
          {project.stagingUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={project.stagingUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-2" />
                Staging
              </a>
            </Button>
          )}
        </div>

        {/* GitHub Connection */}
        {user?.role !== 'ADMIN' && (
          <GitHubConnection 
            githubUrl={project.githubUrl}
            onRepositoryAccess={setHasRepoAccess}
            projectId={project.id}
            onProjectUpdate={onProjectUpdate}
          />
        )}

        {/* Test Flows Section */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={loadFlows}
            disabled={loadingFlows}
            className="w-full"
          >
            <Play className="h-4 w-4 mr-2" />
            {loadingFlows ? 'Chargement...' : showFlows ? 'Masquer les tests' : 'Voir les tests'}
          </Button>
          
          {!hasRepoAccess && project.githubUrl && (
            <p className="text-xs text-muted-foreground text-center">
              Connexion GitHub requise pour lancer les tests (visualisation possible)
            </p>
          )}

          {showFlows && (
            <div className="space-y-3 mt-4">
              {flows.length > 0 ? (
                flows.map((flow) => (
                  <FlowCard key={flow.id} flow={flow} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun test configuré pour ce projet</p>
                  <p className="text-sm">Les tests seront bientôt disponibles</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Manage Team Modal */}
      <ManageTeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        project={project}
        onSuccess={() => {
          setShowTeamModal(false);
          onProjectUpdate?.();
        }}
      />
      <ConfirmDialog
        isOpen={confirmDelete.open}
        title="Confirmer la suppression"
        description="Cette action est définitive et supprimera le projet."
        confirmLabel="Supprimer"
        confirmTargetLabel={project.name}
        onConfirm={async () => {
          await projectsApi.deleteProject(project.id);
          onProjectUpdate?.();
        }}
        onClose={() => setConfirmDelete({ open: false })}
      />
    </Card>
  );
}
