"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { testFlowsApi, projectsApi } from "@/services/api";
import { Project, TestFlow, FlowFormData } from "@/types";
import FlowEditorModal from "@/components/project/FlowEditorModal";
import { Loader2, Plus, Play, Pencil, Trash2, ArrowLeft } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { getTestFlowSocket } from "@/services/test-flow-socket";

export default function ProjectFlowsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [flows, setFlows] = useState<TestFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<TestFlow | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; flow?: TestFlow }>({ open: false });
  const [flowErrors, setFlowErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([
        projectsApi.getProject(projectId),
        testFlowsApi.getFlowsByProject(projectId),
      ]);
      if (p.success) setProject(p.data.project);
      setFlows(f);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) load();
  }, [projectId, load]);

  useEffect(() => {
    const socket = getTestFlowSocket();
    const handler = (payload: { flowId: string; status: TestFlow["status"] }) => {
      setFlows((prev) =>
        prev.map((flow) =>
          flow.id === payload.flowId ? { ...flow, status: payload.status } : flow,
        ),
      );
    };

    socket.on("flowStatus", handler);

    return () => {
      socket.off("flowStatus", handler);
    };
  }, []);

  useEffect(() => {
    const socket = getTestFlowSocket();
    flows.forEach((flow) => socket.emit("joinFlow", { flowId: flow.id }));
    return () => {
      flows.forEach((flow) => socket.emit("leaveFlow", { flowId: flow.id }));
    };
  }, [flows]);

  const handleSaveFlow = async (data: FlowFormData & { id?: string }) => {
    try {
      if (data.id) {
        // Update existing flow
        const response = await testFlowsApi.updateFlow(projectId, data.id, {
          name: data.name,
          description: data.description,
          category: data.category,
          objective: data.objective,
          methods: data.methods,
        });
        if (response.success) {
          await load();
          setShowEditor(false);
          setEditing(null);
        }
      } else {
        // Create new flow
        const response = await testFlowsApi.createFlow(projectId, {
          name: data.name,
          description: data.description,
          category: data.category,
          objective: data.objective,
          methods: data.methods,
        });
        if (response.success) {
          await load();
          setShowEditor(false);
          setEditing(null);
        }
      }
    } catch (e) {
      console.error('Erreur lors de la sauvegarde du flow:', e);
      // TODO: afficher un toast d'erreur
    }
  };

  const runFlow = async (id: string) => {
    setWorking(id);
    setFlowErrors(prev => ({ ...prev, [id]: '' }));
    try {
      const response = await testFlowsApi.runTest(projectId, id);
      if (!response.success) {
        setFlowErrors(prev => ({ ...prev, [id]: response.message || 'Erreur lors de l’exécution' }));
      } else {
        setFlows(prev => prev.map(f => (f.id === id ? { ...f, status: "RUNNING" } : f)));
      }
      setWorking(null);
    } catch {
      setFlowErrors(prev => ({ ...prev, [id]: 'Erreur lors de l’exécution' }));
      setWorking(null);
    }
  };

  const removeFlow = async (id: string) => {
    try {
      const response = await testFlowsApi.deleteFlow(projectId, id);
      if (response.success) {
        await load(); // Recharger la liste depuis l'API
      }
    } catch (e) {
      console.error('Erreur lors de la suppression du flow:', e);
      // TODO: afficher un toast d'erreur
    }
  };

  const title = useMemo(() => project ? `Flows de tests · ${project.name}` : "Flows de tests", [project]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Button>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          <Button onClick={() => { setEditing(null); setShowEditor(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau flow
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-gray-600">Chargement des flows...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {flows.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Aucun flow pour le moment</CardTitle>
                </CardHeader>
                <CardContent>
                  Créez votre premier flow de test pour ce projet.
                </CardContent>
              </Card>
            ) : (
              flows.map(flow => (
                <Card key={flow.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{flow.name}</div>
                      {flow.description && (
                        <div className="text-sm text-gray-600">{flow.description}</div>
                      )}
                      <div className="text-xs mt-1">
                        Statut: <span className="font-medium">{flow.status}</span>
                      </div>
                      {flow.category && (
                        <div className="text-xs mt-1 text-gray-600">Catégorie: <span className="font-medium">{flow.category}</span></div>
                      )}
                      {flow.objective && (
                        <div className="text-xs mt-1 text-gray-600">Objectif: <span className="font-medium">{flow.objective}</span></div>
                      )}
                      {flowErrors[flow.id] && (
                        <div className="text-xs mt-2 text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                          {flowErrors[flow.id]}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => runFlow(flow.id)} disabled={working === flow.id}>
                        {working === flow.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Play className="h-4 w-4 mr-1" /> Lancer</>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditing(flow); setShowEditor(true); }}>
                        <Pencil className="h-4 w-4 mr-1" /> Éditer
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirm({ open: true, flow })}>
                        <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      <FlowEditorModal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        initial={editing}
        onSave={handleSaveFlow}
        projectId={projectId}
      />

      <ConfirmDialog
        isOpen={confirm.open}
        title="Confirmer la suppression"
        description="Cette action supprimera le flow de test."
        confirmLabel="Supprimer"
        confirmTargetLabel={confirm.flow?.name || ''}
        onConfirm={async () => {
          if (confirm.flow) await removeFlow(confirm.flow.id);
        }}
        onClose={() => setConfirm({ open: false })}
      />
    </div>
  );
}


