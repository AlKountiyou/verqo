'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { projectsApi, userApi } from '@/services/api';
import { Project, User } from '@/types';
import { AlertCircle, Loader2, Search, UserPlus, UserMinus, Users } from 'lucide-react';

interface ManageTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSuccess: () => void;
}

export default function ManageTeamModal({ isOpen, onClose, project, onSuccess }: ManageTeamModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableDevs, setAvailableDevs] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableDevs();
    }
  }, [isOpen]);

  const loadAvailableDevs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await userApi.getUsers();
      if (response.success) {
        // Filtrer pour ne garder que les développeurs non assignés
        const devs = response.data.users.filter(user => 
          user.role === 'DEV' && 
          !project.developers.some(dev => dev.user.id === user.id)
        );
        setAvailableDevs(devs);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Erreur lors du chargement des développeurs');
    } finally {
      setLoading(false);
    }
  };

  const assignDeveloper = async (developerId: string) => {
    setActionLoading(developerId);
    setError('');

    try {
      const response = await projectsApi.assignDeveloper(project.id, { userId: developerId });
      if (response.success) {
        onSuccess();
        await loadAvailableDevs(); // Recharger la liste
      } else {
        setError(response.message);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Erreur lors de l\'assignation');
    } finally {
      setActionLoading(null);
    }
  };

  const removeDeveloper = async (developerId: string) => {
    setActionLoading(developerId);
    setError('');

    try {
      const response = await projectsApi.removeDeveloper(project.id, developerId);
      if (response.success) {
        onSuccess();
        await loadAvailableDevs(); // Recharger la liste
      } else {
        setError(response.message);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredDevs = availableDevs.filter(dev =>
    dev.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Gérer l'équipe - ${project.name}`} size="lg">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Team */}
        <div>
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Équipe actuelle ({project.developers.length})
          </h3>
          
          {project.developers.length > 0 ? (
            <div className="space-y-2">
              {project.developers.map((dev) => (
                <div key={dev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">
                        {dev.user.firstName} {dev.user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{dev.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">Assigné</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDeveloper(dev.user.id)}
                      disabled={actionLoading === dev.user.id}
                    >
                      {actionLoading === dev.user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Retirer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Aucun développeur assigné à ce projet
            </p>
          )}
        </div>

        {/* Add Developers */}
        <div>
          <h3 className="text-lg font-medium mb-4">
            Ajouter des développeurs
          </h3>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Chargement des développeurs...</span>
            </div>
          ) : filteredDevs.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredDevs.map((dev) => (
                <div key={dev.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">
                        {dev.firstName} {dev.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{dev.email}</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => assignDeveloper(dev.id)}
                    disabled={actionLoading === dev.id}
                  >
                    {actionLoading === dev.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assigner
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {searchTerm ? 'Aucun développeur trouvé' : 'Aucun développeur disponible'}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
