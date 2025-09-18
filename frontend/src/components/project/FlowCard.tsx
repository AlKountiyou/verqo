'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TestFlow } from '@/types';
import { Play, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { testFlowsApi } from '@/services/api';

interface FlowCardProps {
  flow: TestFlow;
}

export default function FlowCard({ flow }: FlowCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [localStatus, setLocalStatus] = useState(flow.status);

  const getStatusIcon = (status: TestFlow['status']) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'IDLE':
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: TestFlow['status']) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'RUNNING':
        return 'warning';
      case 'IDLE':
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: TestFlow['status']) => {
    switch (status) {
      case 'SUCCESS':
        return 'Succès';
      case 'FAILED':
        return 'Échec';
      case 'RUNNING':
        return 'En cours';
      case 'IDLE':
      default:
        return 'En attente';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatLastRun = (dateString?: string) => {
    if (!dateString) return 'Jamais exécuté';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR');
  };

  const runTest = async () => {
    setIsRunning(true);
    setLocalStatus('RUNNING');
    
    try {
      const result = await testFlowsApi.runTest(flow.id);
      
      if (result.success) {
        // Simulate test completion after some time
        setTimeout(() => {
          setLocalStatus(Math.random() > 0.3 ? 'SUCCESS' : 'FAILED');
          setIsRunning(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to run test:', error);
      setLocalStatus('FAILED');
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{flow.name}</CardTitle>
          <Badge variant={getStatusColor(localStatus)} className="flex items-center space-x-1">
            {getStatusIcon(localStatus)}
            <span>{getStatusText(localStatus)}</span>
          </Badge>
        </div>
        {flow.description && (
          <CardDescription className="text-sm">{flow.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Durée: {formatDuration(flow.duration)}</span>
              <span>Dernière exécution: {formatLastRun(flow.lastRun)}</span>
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={runTest}
            disabled={isRunning || localStatus === 'RUNNING'}
            className="ml-4"
          >
            {isRunning || localStatus === 'RUNNING' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning || localStatus === 'RUNNING' ? 'Exécution...' : 'Lancer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
