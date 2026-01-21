'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TestResultDetail } from '@/types';
import { testFlowsApi } from '@/services/api';
import { CheckCircle, XCircle, Clock, Loader2, Image, FileText, Calendar, Timer } from 'lucide-react';

interface TestResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  flowId: string;
  resultId: string;
}

export default function TestResultModal({ isOpen, onClose, projectId, flowId, resultId }: TestResultModalProps) {
  const [result, setResult] = useState<TestResultDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && resultId) {
      loadResultDetail();
    }
  }, [isOpen, resultId, loadResultDetail]);

  const loadResultDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await testFlowsApi.getTestResultDetail(projectId, flowId, resultId);
      if (response.success) {
        setResult(response.data.result);
      }
    } catch (error) {
      console.error('Failed to load result detail:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, flowId, resultId]);

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'RUNNING':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="success">Succès</Badge>;
      case 'FAILED':
        return <Badge variant="error">Échec</Badge>;
      case 'RUNNING':
        return <Badge variant="running">En cours</Badge>;
      default:
        return <Badge variant="idle">En attente</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails du résultat de test" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Chargement des détails...</span>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* En-tête avec statut */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon(result.status)}
              <div>
                <h3 className="text-lg font-semibold">Résultat de test</h3>
                <p className="text-sm text-gray-600">ID: {result.id}</p>
              </div>
            </div>
            {getStatusBadge(result.status)}
          </div>

          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Début</p>
                <p className="text-xs text-gray-600">{formatDateTime(result.startedAt)}</p>
              </div>
            </div>
            {result.endedAt && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Fin</p>
                  <p className="text-xs text-gray-600">{formatDateTime(result.endedAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Durée</p>
                <p className="text-xs text-gray-600">{formatDuration(result.duration)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Image className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Screenshots</p>
                <p className="text-xs text-gray-600">{result.screenshotUrls?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          {result.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Message d'erreur</h4>
              <p className="text-sm text-red-700">{result.errorMessage}</p>
            </div>
          )}

          {/* Logs */}
          {result.logs && result.logs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Logs d'exécution
              </h4>
              <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {result.logs.join('\n')}
                </pre>
              </div>
            </div>
          )}

          {/* Screenshots */}
          {result.screenshotUrls && result.screenshotUrls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Image className="h-4 w-4 mr-2" />
                Screenshots ({result.screenshotUrls.length})
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {result.screenshotUrls.map((url, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <img
                      src={testFlowsApi.getScreenshot(url)}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun détail disponible</p>
        </div>
      )}
    </Modal>
  );
}
