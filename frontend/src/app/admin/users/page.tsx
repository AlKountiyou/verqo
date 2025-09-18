"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { userApi } from "@/services/api";
import { User } from "@/types";
import { AlertCircle, Loader2, Trash2, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingIds, setWorkingIds] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<{ open: boolean; user?: User }>({ open: false });

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await userApi.getUsers();
      if (res.success) setUsers(res.data.users);
      else setError(res.message);
    } catch (e) {
      setError("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    loadUsers();
  }, [user]);

  const toggleStatus = async (id: string) => {
    setWorkingIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await userApi.toggleUserStatus(id);
      if (res.success) {
        setUsers(prev => prev.map(u => (u.id === id ? res.data.user : u)));
      }
    } finally {
      setWorkingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const deleteUser = async (id: string) => {
    setWorkingIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await userApi.deleteUser(id);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== id));
      }
    } finally {
      setWorkingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Administration · Utilisateurs</h1>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-gray-600">Chargement des utilisateurs...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {u.firstName ?? ""} {u.lastName ?? ""}
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-gray-100">{u.role}</span>
                    </div>
                    <div className="text-sm text-gray-600">{u.email}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(u.id)}
                      disabled={workingIds[u.id]}
                    >
                      {u.isActive ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-1" />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-1" />
                          Activer
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirm({ open: true, user: u })}
                      disabled={workingIds[u.id]}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <ConfirmDialog
        isOpen={confirm.open}
        title="Confirmer la suppression"
        description="Cette action est définitive et supprimera l'utilisateur."
        confirmLabel="Supprimer"
        confirmTargetLabel={(confirm.user?.email) || `${confirm.user?.firstName ?? ""} ${confirm.user?.lastName ?? ""}`.trim()}
        onConfirm={async () => {
          if (confirm.user) {
            await deleteUser(confirm.user.id);
          }
        }}
        onClose={() => setConfirm({ open: false })}
      />
    </div>
  );
}
