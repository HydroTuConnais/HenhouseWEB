"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Edit, Trash2, Package, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { 
  useAdminProduits, 
  useAdminEntreprises,
  useCreateProduit, 
  useUpdateProduit, 
  useDeleteProduit,
  type AdminProduit,
  type AdminEntreprise
} from "@/components/hooks/api-hooks";
import { getImageUrl } from "@/lib/config";
import Image from 'next/image';


// Formulaire de création/modification
const ProduitForm = ({ 
  produit, 
  onSave, 
  onCancel 
}: { 
  produit?: AdminProduit;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    nom: produit?.nom || '',
    description: produit?.description || '',
    prix: produit?.prix || '',
    categorie: produit?.categorie || '',
    active: produit?.active ?? true,
    entrepriseIds: produit?.entreprises?.map(e => e.id.toString()) || []
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getImageUrl(produit?.imageUrl)
  );

  const { data: entreprises } = useAdminEntreprises();
  const createMutation = useCreateProduit();
  const updateMutation = useUpdateProduit();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleEntrepriseToggle = (entrepriseId: string) => {
    setFormData(prev => ({
      ...prev,
      entrepriseIds: prev.entrepriseIds.includes(entrepriseId)
        ? prev.entrepriseIds.filter(id => id !== entrepriseId)
        : [...prev.entrepriseIds, entrepriseId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const produitData = {
        nom: formData.nom,
        description: formData.description,
        prix: typeof formData.prix === 'string' ? parseFloat(formData.prix) : formData.prix,
        categorie: formData.categorie,
        active: formData.active,
        entrepriseIds: formData.entrepriseIds,
      };

      if (produit) {
        await updateMutation.mutateAsync({ 
          id: produit.id, 
          data: { produitData, image: selectedFile || undefined }
        });
        toast.success('Produit modifié avec succès');
      } else {
        await createMutation.mutateAsync({ 
          produitData, 
          image: selectedFile || undefined 
        });
        toast.success('Produit créé avec succès');
      }
      onSave();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nom</label>
        <Input
          value={formData.nom}
          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prix ($)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.prix}
            onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Catégorie</label>
          <Select 
            value={formData.categorie} 
            onValueChange={(value) => setFormData({ ...formData, categorie: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plat">Plat</SelectItem>
              <SelectItem value="boisson">Boisson</SelectItem>
              <SelectItem value="dessert">Dessert</SelectItem>
              <SelectItem value="accompagnement">Accompagnement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Entreprises associées</label>
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
          {entreprises?.map((entreprise: AdminEntreprise) => (
            <div key={entreprise.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`entreprise-${entreprise.id}`}
                checked={formData.entrepriseIds.includes(entreprise.id.toString())}
                onChange={() => handleEntrepriseToggle(entreprise.id.toString())}
                className="rounded"
              />
              <label htmlFor={`entreprise-${entreprise.id}`} className="text-sm">
                {entreprise.nom}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="active" className="text-sm font-medium">Produit actif</label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Image</label>
        <div className="space-y-2">
          {previewUrl && (
            <div className="relative inline-block">
              <Image 
                src={previewUrl} 
                alt="Aperçu" 
                width={128}
                height={128}
                className="w-32 h-32 object-cover rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {produit ? 'Modifier' : 'Créer'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function ProduitsManager() {
  const { data: produits, isLoading } = useAdminProduits();
  const [selectedProduit, setSelectedProduit] = useState<AdminProduit | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const deleteMutation = useDeleteProduit();

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Produit supprimé avec succès');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const refreshData = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setSelectedProduit(null);
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
              <Package className="h-6 w-6" />
              <CardTitle>Gestion des Produits</CardTitle>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau produit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau produit</DialogTitle>
                </DialogHeader>
                <ProduitForm onSave={refreshData} onCancel={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Entreprises</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produits?.map((produit: AdminProduit) => (
                <TableRow key={produit.id}>
                  <TableCell>
                    {produit.imageUrl ? (
                      <Image 
                        src={getImageUrl(produit.imageUrl) || ''} 
                        alt={produit.nom}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{produit.nom}</TableCell>
                  <TableCell>{produit.prix}$</TableCell>
                  <TableCell>{produit.categorie || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {produit.entreprises?.map((entreprise) => (
                        <Badge key={entreprise.id} variant="outline" className="text-xs">
                          {entreprise.nom}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={produit.active ? "default" : "secondary"}>
                      {produit.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduit(produit);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(produit.id)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          {selectedProduit && (
            <ProduitForm 
              produit={selectedProduit}
              onSave={refreshData} 
              onCancel={() => setIsEditOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
