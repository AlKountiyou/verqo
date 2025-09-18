"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { TestFlow } from "@/types";

type FlowEditorData = { id?: string; name: string; description?: string };

interface FlowEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flow: FlowEditorData) => Promise<void> | void;
  initial?: TestFlow | null;
}

export default function FlowEditorModal({ isOpen, onClose, onSave, initial }: FlowEditorModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm({ name: initial.name, description: initial.description ?? "" });
    } else {
      setForm({ name: "", description: "" });
    }
    setError("");
  }, [initial, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSave({ id: initial?.id, name: form.name, description: form.description });
      onClose();
    } catch (e) {
      setError("Impossible d'enregistrer le flow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${initial ? "Modifier" : "Créer"} un flow`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nom du flow *</label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
            placeholder="Ex: Vérification login"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
            rows={3}
            placeholder="Objectif et périmètre du test"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button type="submit" disabled={loading}>
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</>) : (initial ? "Enregistrer" : "Créer")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


