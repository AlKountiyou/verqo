'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { projectsApi } from '@/services/api';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProjects = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setLoading(true);
    }
    setError('');

    try {
      const response = await projectsApi.getProjects();
      
      if (response.success) {
        setProjects(response.data.projects);
      } else {
        setError(response.message);
      }
    } catch (err: unknown) {
      console.error('Failed to load projects:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Impossible de charger les projets');
    } finally {
      setLoading(false);
    }
  };

  const refreshProjects = () => loadProjects(true);

  const getProjectById = (id: string): Project | undefined => {
    return projects.find(p => p.id === id);
  };

  const getProjectsByOwner = (ownerId: string): Project[] => {
    return projects.filter(p => p.ownerId === ownerId);
  };

  const getProjectsByDeveloper = (developerId: string): Project[] => {
    return projects.filter(p => 
      p.developers.some(dev => dev.user.id === developerId)
    );
  };

  const getProjectStats = () => {
    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'ACTIVE').length,
      paused: projects.filter(p => p.status === 'PAUSED').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
      archived: projects.filter(p => p.status === 'ARCHIVED').length,
      withGithub: projects.filter(p => p.githubUrl).length,
      withStaging: projects.filter(p => p.stagingUrl).length,
      totalDevelopers: projects.reduce((acc, p) => acc + p.developers.length, 0),
    };
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    refreshProjects,
    getProjectById,
    getProjectsByOwner,
    getProjectsByDeveloper,
    getProjectStats,
    // Pour les futures fonctionnalités
    createProject: async (data: Partial<Project>) => {
      // À implémenter quand on aura l'endpoint
      console.log('Create project:', data);
    },
    updateProject: async (id: string, data: Partial<Project>) => {
      // À implémenter quand on aura l'endpoint
      console.log('Update project:', id, data);
    },
    deleteProject: async (id: string) => {
      // À implémenter quand on aura l'endpoint
      console.log('Delete project:', id);
    },
  };
};
