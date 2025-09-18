'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Project } from '@/types';
import { Folder, CheckCircle, Github, Users } from 'lucide-react';

interface StatsCardsProps {
  projects: Project[];
}

export default function StatsCards({ projects }: StatsCardsProps) {
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVE').length,
    withGithub: projects.filter(p => p.githubUrl).length,
    totalDevelopers: projects.reduce((acc, p) => acc + p.developers.length, 0),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Folder className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Projets totaux</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Projets actifs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Github className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avec GitHub</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withGithub}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Développeurs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDevelopers}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
