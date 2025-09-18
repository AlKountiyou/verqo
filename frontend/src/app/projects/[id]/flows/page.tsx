"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { testFlowsApi, projectsApi } from "@/services/api";
import { Project, TestFlow } from "@/types";
import FlowEditorModal from "@/components/project/FlowEditorModal";
import { Loader2, Plus, Play, Pencil, Trash2, ArrowLeft } from "lucide-react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

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

  const load = async () => {
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
  };

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const handleSaveFlow = async (data: Omit<TestFlow, "id"> & { id?: string }) => {
    if (data.id) {
      setFlows(prev => prev.map(fl => (fl.id === data.id ? { ...fl, ...data } as TestFlow : fl)));
    } else {
      setFlows(prev => [
        ...prev,
        {
          id: `${projectId}-${Date.now()}`,
          name: data.name,
          description: data.description,
          projectId,
          status: "IDLE",
        },
      ]);
    }
  };

  const runFlow = async (id: string) => {
    setWorking(id);
    try {
      await testFlowsApi.runTest(id);
      setFlows(prev => prev.map(f => (f.id === id ? { ...f, status: "RUNNING" } : f)));
      // simulate completion feedback in UI; real-time updates to be wired later
      setTimeout(() => {
        setFlows(prev => prev.map(f => (f.id === id ? { ...f, status: Math.random() > 0.3 ? "SUCCESS" : "FAILED" } : f)));
        setWorking(null);
      }, 2500);
    } catch {
      setWorking(null);
    }
  };

  const removeFlow = (id: string) => {
    setFlows(prev => prev.filter(f => f.id !== id));
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
        onSave={async (data) => {
          if (editing) {
            setFlows(prev => prev.map(f => (f.id === editing.id ? { ...f, ...data } as TestFlow : f)));
          } else {
            setFlows(prev => ([
              ...prev,
              { id: `${projectId}-${Date.now()}`, name: data.name, description: data.description, projectId, status: "IDLE" },
            ]));
          }
        }}
      />

      <ConfirmDialog
        isOpen={confirm.open}
        title="Confirmer la suppression"
        description="Cette action supprimera le flow de test."
        confirmLabel="Supprimer"
        confirmTargetLabel={confirm.flow?.name || ''}
        onConfirm={async () => {
          if (confirm.flow) removeFlow(confirm.flow.id);
        }}
        onClose={() => setConfirm({ open: false })}
      />
    </div>
  );
}


