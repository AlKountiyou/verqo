'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TestFlow, FlowFormData } from '@/types';
import { Loader2, AlertCircle, Plus, X } from 'lucide-react';

interface FlowEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flow: FlowFormData & { id?: string }) => Promise<void>;
  initial?: TestFlow | null;
  projectId: string;
}

const CATEGORIES = [
  { value: 'BACKEND', label: 'Backend' },
  { value: 'FRONTEND', label: 'Frontend' },
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'UNIT', label: 'Test unitaire' },
] as const;

export default function FlowEditorModal({
  isOpen,
  onClose,
  onSave,
  initial,
  projectId,
}: FlowEditorModalProps) {
  const [formData, setFormData] = useState<Partial<TestFlow>>({
    name: '',
    description: '',
    category: 'BACKEND',
    objective: '',
    methods: [''],
    projectId: projectId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(initial || { 
        name: '', 
        description: '', 
        category: 'BACKEND',
        objective: '',
        methods: [''],
        projectId: projectId 
      });
      setError('');
    }
  }, [isOpen, initial, projectId]);

  const handleInputChange = (field: keyof TestFlow, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addMethod = () => {
    setFormData((prev) => ({
      ...prev,
      methods: [...(prev.methods || []), '']
    }));
  };

  const removeMethod = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      methods: (prev.methods || []).filter((_, i) => i !== index)
    }));
  };

  const updateMethod = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      methods: (prev.methods || []).map((method, i) => i === index ? value : method)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name) {
      setError('Le nom du flow est requis.');
      setLoading(false);
      return;
    }

    if (!formData.category) {
      setError('La catégorie est requise.');
      setLoading(false);
      return;
    }

    const validMethods = (formData.methods || []).filter(method => method.trim() !== '');
    if (validMethods.length === 0) {
      setError('Au moins une méthode de test est requise.');
      setLoading(false);
      return;
    }

    try {
      await onSave({
        name: formData.name || '',
        description: formData.description,
        category: formData.category || 'BACKEND',
        objective: formData.objective,
        methods: validMethods,
        id: initial?.id
      });
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du flow.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Modifier le flow de test' : 'Créer un flow de test'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Nom du flow *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ex: Test de connexion utilisateur"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Catégorie *</Label>
          <select
            id="category"
            value={formData.category || 'BACKEND'}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Input
            id="description"
            type="text"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Décrivez l'objectif de ce flow de test"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="objective">Objectif du test (optionnel)</Label>
          <textarea
            id="objective"
            value={formData.objective || ''}
            onChange={(e) => handleInputChange('objective', e.target.value)}
            placeholder="Décrivez ce que vous voulez tester spécifiquement"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label>Méthodes de test *</Label>
          <div className="space-y-2">
            {(formData.methods || []).map((method, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={method}
                  onChange={(e) => updateMethod(index, e.target.value)}
                  placeholder={`Méthode ${index + 1} (ex: Test API, Test UI, Test de charge...)`}
                  disabled={loading}
                  className="flex-1"
                />
                {(formData.methods || []).length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMethod(index)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMethod}
              disabled={loading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une méthode
            </Button>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}