"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmTargetLabel: string; // the string user must type to enable confirm (e.g., resource name/email)
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Supprimer",
  confirmTargetLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTyped("");
      setLoading(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };

  const disabled = typed !== confirmTargetLabel || loading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}
      <p className="text-sm">
        Tapez <span className="font-mono font-semibold">{confirmTargetLabel}</span> pour confirmer.
      </p>
      <div className="mt-2">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmTargetLabel}
        />
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
        <Button variant="destructive" onClick={handleConfirm} disabled={disabled}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}


