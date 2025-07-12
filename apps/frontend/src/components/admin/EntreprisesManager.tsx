"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  useAdminEntreprises, 
  useCreateEntreprise, 
  useUpdateEntreprise, 
  useDeleteEntreprise,
  type AdminEntreprise 
} from "@/components/hooks/api-hooks";

// Formulaire de création/modification
const EntrepriseForm = ({ 
  entreprise, 
  onSave, 
  onCancel 
}: { 
  entreprise?: AdminEntreprise;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    nom: entreprise?.nom || ''
  });

  const createMutation = useCreateEntreprise();
  const updateMutation = useUpdateEntreprise();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (entreprise) {
        await updateMutation.mutateAsync({ id: entreprise.id, data: formData });
        toast.success('Entreprise modifiée avec succès');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Entreprise créée avec succès');
      }
      onSave();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nom de l'entreprise</label>
        <Input
          value={formData.nom}
          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          required
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {entreprise ? 'Modifier' : 'Créer'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function EntreprisesManager() {
  const { data: entreprises, isLoading } = useAdminEntreprises();
  const [selectedEntreprise, setSelectedEntreprise] = useState<AdminEntreprise | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const deleteMutation = useDeleteEntreprise();

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Entreprise supprimée avec succès');
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const refreshData = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setSelectedEntreprise(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6" />
              <CardTitle>Gestion des Entreprises</CardTitle>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle entreprise
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
                </DialogHeader>
                <EntrepriseForm onSave={refreshData} onCancel={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entreprises?.map((entreprise: AdminEntreprise) => (
                <TableRow key={entreprise.id}>
                  <TableCell>{entreprise.id}</TableCell>
                  <TableCell className="font-medium">{entreprise.nom}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEntreprise(entreprise);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entreprise.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'entreprise</DialogTitle>
          </DialogHeader>
          {selectedEntreprise && (
            <EntrepriseForm 
              entreprise={selectedEntreprise}
              onSave={refreshData} 
              onCancel={() => setIsEditOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
