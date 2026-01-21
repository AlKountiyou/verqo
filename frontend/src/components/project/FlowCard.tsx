'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TestFlow, TestResult } from '@/types';
import { Play, Clock, CheckCircle, XCircle, Loader2, Eye, History } from 'lucide-react';
import { testFlowsApi } from '@/services/api';
import TestResultModal from './TestResultModal';
import { getTestFlowSocket } from '@/services/test-flow-socket';

interface FlowCardProps {
  flow: TestFlow;
  projectId: string;
}

export default function FlowCard({ flow, projectId }: FlowCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [localStatus, setLocalStatus] = useState(flow.status);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  // Charger les résultats de tests
  const loadTestResults = useCallback(async () => {
    try {
      const resultsResponse = await testFlowsApi.getTestResults(projectId, flow.id, 1, 5);
      if (resultsResponse.success) {
        setTestResults(resultsResponse.data.results);
      }
    } catch (error) {
      console.error('Failed to load test results:', error);
    }
  }, [projectId, flow.id]);

  const runTest = async () => {
    setIsRunning(true);
    setLocalStatus('RUNNING');
    setErrorMessage('');
    
    try {
      const result = await testFlowsApi.runTest(projectId, flow.id);
      
      if (result.success) {
        // Status updates will arrive via websocket events
      } else {
        setIsRunning(false);
        setLocalStatus('FAILED');
        setErrorMessage(result.message || 'Erreur lors de l’exécution');
      }
    } catch (error) {
      console.error('Failed to run test:', error);
      setLocalStatus('FAILED');
      setIsRunning(false);
      setErrorMessage('Erreur lors de l’exécution');
    }
  };

  // Charger les résultats au montage
  useEffect(() => {
    loadTestResults();
  }, [loadTestResults]);

  useEffect(() => {
    const socket = getTestFlowSocket();
    const handler = (payload: { flowId: string; status: TestFlow['status'] }) => {
      if (payload.flowId !== flow.id) return;
      setLocalStatus(payload.status);
      if (payload.status === 'RUNNING') {
        setIsRunning(true);
        return;
      }
      setIsRunning(false);
      if (payload.status === 'SUCCESS' || payload.status === 'FAILED') {
        loadTestResults();
      }
    };

    socket.emit('joinFlow', { flowId: flow.id });
    socket.on('flowStatus', handler);

    return () => {
      socket.emit('leaveFlow', { flowId: flow.id });
      socket.off('flowStatus', handler);
    };
  }, [flow.id, loadTestResults]);

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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>Durée: {formatDuration(flow.duration)}</span>
                <span>Dernière exécution: {formatLastRun(flow.lastRun)}</span>
              </div>
              {flow.category && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {flow.category}
                  </Badge>
                  {flow.methods.length > 0 && (
                    <span className="text-xs">{flow.methods.length} méthode(s)</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {testResults.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowResults(!showResults)}
                >
                  <History className="h-4 w-4 mr-2" />
                  {testResults.length} résultat(s)
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={runTest}
                disabled={isRunning || localStatus === 'RUNNING'}
              >
                {isRunning || localStatus === 'RUNNING' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isRunning || localStatus === 'RUNNING' ? 'Exécution...' : 'Lancer'}
              </Button>
            </div>
          </div>

          {/* Affichage des résultats */}
          {showResults && testResults.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Derniers résultats</h4>
              <div className="space-y-2">
                {testResults.slice(0, 3).map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={result.status === 'SUCCESS' ? 'success' : 'error'}
                      >
                        {result.status}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {formatLastRun(result.startedAt)}
                      </span>
                      {result.duration && (
                        <span className="text-xs text-gray-500">
                          ({formatDuration(result.duration)})
                        </span>
                      )}
                    </div>
                    <Button 
                      size="xs" 
                      variant="ghost"
                      onClick={() => {
                        setSelectedResultId(result.id);
                        setShowResultModal(true);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {errorMessage}
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal des détails de résultat */}
      {selectedResultId && (
        <TestResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedResultId(null);
          }}
          projectId={projectId}
          flowId={flow.id}
          resultId={selectedResultId}
        />
      )}
    </Card>
  );
}
