'use client';

import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { ChefHat, Plus, Edit, Trash2, Upload, X, Package, RefreshCw, GripVertical, Loader2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { 
  useAdminMenus, 
  useCreateMenu, 
  useUpdateMenu, 
  useDeleteMenu,
  useAdminProduits,
  useMenuProduits,
  useAddProduitToMenu,
  useUpdateProduitInMenu,
  useRemoveProduitFromMenu,
  type AdminMenu,
  type AdminProduit
} from '@/components/hooks/api-hooks';
import { getImageUrl } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';


interface MenuFormProps {
  menu?: AdminMenu;
  onSave: () => void;
  onCancel: () => void;
}

function MenuForm({ menu, onSave, onCancel }: MenuFormProps) {
  const [formData, setFormData] = useState({
    nom: menu?.nom || '',
    description: menu?.description || '',
    prix: menu?.prix || 0,
    active: menu?.active ?? true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getImageUrl(menu?.imageUrl)
  );

  const createMutation = useCreateMenu();
  const updateMutation = useUpdateMenu();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const menuData = {
        nom: formData.nom,
        description: formData.description,
        prix: formData.prix,
        active: formData.active,
      };

      if (menu) {
        await updateMutation.mutateAsync({ 
          id: menu.id, 
          data: { menuData, image: selectedFile || undefined }
        });
        toast.success('Menu modifié avec succès');
      } else {
        await createMutation.mutateAsync({ 
          menuData, 
          image: selectedFile || undefined 
        });
        toast.success('Menu créé avec succès');
      }
      onSave();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nom du menu</label>
        <Input
          value={formData.nom}
          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          placeholder="Nom du menu"
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
      
      <div>
        <label className="block text-sm font-medium mb-1">Prix ($)</label>
        <Input
          type="number"
          step="0.01"
          value={formData.prix}
          onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) || 0 })}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="active" className="text-sm font-medium">Menu actif</label>
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
                className="w-32 h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Choisir une image
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  );
}

export default function MenusManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProduitsOpen, setIsProduitsOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<AdminMenu | null>(null);

  const { data: menus, isLoading } = useAdminMenus();
  const deleteMutation = useDeleteMenu();

  const refreshData = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setSelectedMenu(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce menu ?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Menu supprimé avec succès');
      } catch {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  // Composant pour les lignes de table draggables
  interface SortableTableRowProps {
    produit: AdminProduit & { pivot?: { ordre?: number; quantite?: number; disponible?: boolean } };
    menu: AdminMenu;
    index: number;
    totalCount: number;
    onUpdate: () => void;
    onRemove: (id: number) => void;
    isDisabled?: boolean;
  }

  function SortableTableRow({ produit, menu, onUpdate, onRemove, isDisabled = false }: SortableTableRowProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id: produit.id,
      disabled: isDisabled
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : isDisabled ? 0.6 : 1,
    };

    return (
      <TableRow 
        ref={setNodeRef}
        style={style}
        className={`${!produit.active ? "bg-red-50 opacity-75" : ""} ${isDragging ? 'relative z-50 bg-white shadow-lg' : ''}`}
      >
        <TableCell className="w-16">
          <div 
            {...attributes} 
            {...listeners}
            className={`p-2 rounded transition-colors flex items-center justify-center ${
              isDisabled 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-grab active:cursor-grabbing hover:bg-gray-100'
            }`}
            title={isDisabled ? "Réorganisation en cours..." : "Glisser pour réorganiser"}
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
        </TableCell>
        <TableCell className="w-24">
          {produit.imageUrl ? (
            <Image 
              src={getImageUrl(produit.imageUrl) || ''} 
              alt={produit.nom}
              width={80}
              height={80}
              className="w-20 h-20 object-cover rounded"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
          )}
        </TableCell>
        <TableCell className="font-medium text-base w-80">{produit.nom}</TableCell>
        <TableCell className="text-base w-24">{produit.prix}$</TableCell>
        <TableCell className="text-base w-28">{produit.pivot?.quantite || 1}</TableCell>
        <TableCell className="text-base w-28">
          <span className="font-medium text-lg bg-gray-100 px-2 py-1 rounded">{produit.pivot?.ordre || '-'}</span>
        </TableCell>
        <TableCell className="w-48">
          <div className="flex flex-col gap-1">
            <Badge variant={produit.active ? "default" : "destructive"} className="text-xs w-fit">
              {produit.active ? "Produit actif" : "Produit inactif"}
            </Badge>
            <Badge variant={produit.pivot?.disponible ? "default" : "secondary"} className="text-xs w-fit">
              {produit.pivot?.disponible ? "Disponible" : "Indisponible"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="w-52">
          <div className="flex space-x-2">
            <EditProduitInMenuDialog 
              menu={menu}
              produit={produit}
              onUpdate={onUpdate}
              disabled={isDisabled}
            />
            {!produit.active && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemove(produit.id)}
                className="text-orange-600 hover:text-orange-700"
                title="Retirer ce produit inactif"
                disabled={isDisabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(produit.id)}
              className="text-red-600 hover:text-red-700"
              title="Retirer du menu"
              disabled={isDisabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // Composant pour éditer les propriétés d'un produit dans un menu
  interface EditProduitInMenuProps {
    menu: AdminMenu;
    produit: AdminProduit & { pivot?: { ordre?: number; quantite?: number; disponible?: boolean } };
    onUpdate: () => void;
    disabled?: boolean;
  }

  function EditProduitInMenuDialog({ menu, produit, onUpdate, disabled = false }: EditProduitInMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
      quantite: produit.pivot?.quantite || 1,
      disponible: produit.pivot?.disponible ?? true,
    });

    const updateMutation = useUpdateProduitInMenu();

    // Réinitialiser le formulaire quand le dialog s'ouvre
    useEffect(() => {
      if (isOpen) {
        setFormData({
          quantite: produit.pivot?.quantite || 1,
          disponible: produit.pivot?.disponible ?? true,
        });
      }
    }, [isOpen, produit]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        await updateMutation.mutateAsync({
          menuId: menu.id,
          produitId: produit.id,
          quantite: formData.quantite,
          ordre: produit.pivot?.ordre || null, // Garder l'ordre existant
          disponible: formData.disponible,
        });
        
        toast.success('Propriétés du produit mises à jour');
        setIsOpen(false);
        onUpdate();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour';
        toast.error(errorMessage);
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title="Modifier les propriétés"
            disabled={disabled}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les propriétés</DialogTitle>
            <p className="text-sm text-gray-600">
              {produit.nom} dans {menu.nom}
            </p>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="quantite">Quantité</Label>
              <Input
                id="quantite"
                type="number"
                min="1"
                value={formData.quantite}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  quantite: parseInt(e.target.value) || 1
                }))}
                required
                disabled={updateMutation.isPending}
                className="h-10 text-base"
              />
              <p className="text-xs text-gray-500 mt-1">
                Quantité de ce produit dans le menu
              </p>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Switch
                id="disponible"
                checked={formData.disponible}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  disponible: checked
                }))}
                disabled={updateMutation.isPending}
              />
              <div>
                <Label htmlFor="disponible" className="text-base font-medium">
                  Disponible dans ce menu
                </Label>
                <p className="text-xs text-gray-500">
                  Contrôle si ce produit est disponible spécifiquement dans ce menu
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 h-10 text-base"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  'Mettre à jour'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={updateMutation.isPending}
                className="h-10 px-6 text-base"
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Composant pour gérer les produits d'un menu
  interface MenuProduitsManagerProps {
    menu: AdminMenu;
    isOpen: boolean;
    onClose: () => void;
  }

  function MenuProduitsManager({ menu, isOpen, onClose }: MenuProduitsManagerProps) {
    const [selectedProduitId, setSelectedProduitId] = useState<string>('');
    const [quantite, setQuantite] = useState(1);
    const [ordre, setOrdre] = useState<number | null>(null);
    const [disponible, setDisponible] = useState(true);
    const [isReordering, setIsReordering] = useState(false);

    const { data: menuProduits, isLoading: loadingMenuProduits, refetch: refetchMenuProduits } = useMenuProduits(menu.id, isOpen);
    const { data: allProduits, refetch: refetchAllProduits } = useAdminProduits();
    
    const addMutation = useAddProduitToMenu();
    const updateMutation = useUpdateProduitInMenu();
    const removeMutation = useRemoveProduitFromMenu();

    // Configuration des capteurs pour le drag & drop
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // Rafraîchir les données quand le dialog s'ouvre
    useEffect(() => {
      if (isOpen) {
        refetchMenuProduits();
        refetchAllProduits();
      }
    }, [isOpen, refetchMenuProduits, refetchAllProduits]);

    // Tri des produits par ordre
    const sortedProduits = menuProduits?.slice().sort((a: AdminProduit & { pivot?: { ordre?: number } }, b: AdminProduit & { pivot?: { ordre?: number } }) => {
      const orderA = a.pivot?.ordre || 999;
      const orderB = b.pivot?.ordre || 999;
      return orderA - orderB;
    }) || [];

    const availableProduits = allProduits?.filter((produit: AdminProduit) => 
      produit.active && !menuProduits?.some((mp: AdminProduit) => mp.id === produit.id)
    ) || [];

    // Gestion du drag & drop
    const handleDragStart = () => {
      // Plus besoin de bloquer pendant le drag, seulement pendant la réorganisation
    };

    const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = sortedProduits.findIndex((item: AdminProduit) => item.id === active.id);
      const newIndex = sortedProduits.findIndex((item: AdminProduit) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Commencer la réorganisation après avoir validé le changement
      setIsReordering(true);

      try {
        // Réorganiser le tableau localement pour l'UI
        const newOrder = arrayMove(
          sortedProduits,
          oldIndex,
          newIndex
        ) as (AdminProduit & { pivot?: { quantite?: number; disponible?: boolean; ordre?: number } })[];
        
        // Mettre à jour tous les ordres sur le serveur
        const updatePromises = newOrder.map((produit, index) => 
          updateMutation.mutateAsync({
            menuId: menu.id,
            produitId: produit.id,
            quantite: produit.pivot?.quantite || 1,
            ordre: index + 1,
            disponible: produit.pivot?.disponible ?? true,
          })
        );

        await Promise.all(updatePromises);
        toast.success('Ordre mis à jour');
        refetchMenuProduits();
      } catch {
        toast.error('Erreur lors de la réorganisation');
      } finally {
        setIsReordering(false);
      }
    };

    const handleAddProduit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedProduitId) return;

      try {
        // Calculer l'ordre par défaut : maximum actuel + 1
        const maxOrder = sortedProduits?.reduce((max: number, p: AdminProduit & { pivot?: { ordre?: number } }) => {
          const currentOrder = p.pivot?.ordre || 0;
          return Math.max(max, currentOrder);
        }, 0) || 0;
        
        const defaultOrder = ordre || (maxOrder + 1);

        await addMutation.mutateAsync({
          menuId: menu.id,
          produitId: parseInt(selectedProduitId),
          quantite,
          ordre: defaultOrder,
          disponible,
        });
        toast.success('Produit ajouté au menu');
        setSelectedProduitId('');
        setQuantite(1);
        setOrdre(null);
        setDisponible(true);
      } catch {
        toast.error('Erreur lors de l’ajout du produit');
      }
    };

    const handleRemoveProduit = async (produitId: number) => {
      if (window.confirm('Êtes-vous sûr de vouloir retirer ce produit du menu ?')) {
        try {
          await removeMutation.mutateAsync({ menuId: menu.id, produitId });
          toast.success('Produit retiré du menu');
        } catch {
          toast.error('Erreur lors de la suppression');
        }
      }
    };

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!w-[85vw] !max-w-[85vw] !h-[60vh] !max-h-[60vh] overflow-y-auto !m-0 !p-0">
          <DialogHeader className="px-4 py-3 border-b bg-white sticky top-0 z-10 flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Produits du menu : {menu.nom}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetchMenuProduits();
                  refetchAllProduits();
                  toast.success('Données actualisées');
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Actualiser les données"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="px-4 pb-4 space-y-4 min-h-0 flex-1">
            {/* Formulaire d'ajout de produit */}
            <Card className="w-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ajouter un produit</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <form onSubmit={handleAddProduit} className="space-y-3">
                  <div className="grid grid-cols-6 gap-2">
                    <div key="produit-select" className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Produit</label>
                      <select
                        value={selectedProduitId}
                        onChange={(e) => setSelectedProduitId(e.target.value)}
                        className="w-full p-2 border rounded-md text-sm h-9"
                        required
                      >
                        <option value="">Sélectionner un produit</option>
                        {availableProduits.map((produit: AdminProduit) => (
                          <option key={produit.id} value={produit.id}>
                            {produit.nom} - {produit.prix}$
                          </option>
                        ))}
                      </select>
                    </div>
                    <div key="quantite-input">
                      <label className="block text-sm font-medium mb-1">Quantité</label>
                      <Input
                        type="number"
                        min="1"
                        value={quantite}
                        onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
                        required
                        className="text-sm h-9"
                      />
                    </div>
                    <div key="ordre-input">
                      <label className="block text-sm font-medium mb-1">Ordre</label>
                      <Input
                        type="number"
                        value={ordre || ''}
                        onChange={(e) => setOrdre(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder={`Auto (${((sortedProduits?.reduce((max: number, p: AdminProduit & { pivot?: { ordre?: number } }) => Math.max(max, p.pivot?.ordre || 0), 0) || 0) + 1)})`}
                        className="text-sm h-9"
                      />
                    </div>
                    <div key="disponible-checkbox" className="flex items-end">
                      <div className="flex items-center space-x-2 pb-1">
                        <input
                          type="checkbox"
                          id="disponible"
                          checked={disponible}
                          onChange={(e) => setDisponible(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="disponible" className="text-sm font-medium">Disponible</label>
                      </div>
                    </div>
                    <div key="submit-button" className="flex items-end">
                      <Button 
                        type="submit" 
                        disabled={addMutation.isPending || !selectedProduitId}
                        className="w-full h-9"
                      >
                        {addMutation.isPending ? 'Ajout...' : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Liste des produits du menu */}
            <Card className="w-full flex-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Produits dans ce menu ({sortedProduits?.length || 0})</CardTitle>
                  <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                    💡 Glissez-déposez pour réorganiser
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-2">
                {loadingMenuProduits ? (
                  <div className="text-center py-8">Chargement des produits...</div>
                ) : sortedProduits && sortedProduits.length > 0 ? (
                  <div className="overflow-x-auto w-full relative">
                    {/* Overlay de loading uniquement pendant la réorganisation */}
                    {isReordering && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center rounded-lg">
                        <div className="flex justify-center items-center">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      </div>
                    )}
                    
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <Table className="w-full min-w-[1400px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">⋮⋮</TableHead>
                            <TableHead className="w-24">Image</TableHead>
                            <TableHead className="w-80">Nom</TableHead>
                            <TableHead className="w-24">Prix</TableHead>
                            <TableHead className="w-28">Quantité</TableHead>
                            <TableHead className="w-28">Position</TableHead>
                            <TableHead className="w-48">Statut</TableHead>
                            <TableHead className="w-52">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <SortableContext 
                          items={sortedProduits.map((p: AdminProduit) => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <TableBody>
                            {sortedProduits.map((produit: AdminProduit & { pivot?: { ordre?: number; quantite?: number; disponible?: boolean } }, index: number) => (
                              <SortableTableRow
                                key={produit.id}
                                produit={produit}
                                menu={menu}
                                index={index}
                                totalCount={sortedProduits.length}
                                onUpdate={refetchMenuProduits}
                                onRemove={handleRemoveProduit}
                                isDisabled={isReordering}
                              />
                            ))}
                          </TableBody>
                        </SortableContext>
                      </Table>
                    </DndContext>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucun produit dans ce menu
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestion des Menus</CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Menu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau menu</DialogTitle>
              </DialogHeader>
              <MenuForm onSave={refreshData} onCancel={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Produits</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menus?.map((menu: AdminMenu) => (
                <TableRow key={menu.id}>
                  <TableCell>
                    {menu.imageUrl ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="cursor-pointer">
                            <Image 
                              src={getImageUrl(menu.imageUrl) || ''} 
                              alt={menu.nom}
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                            />
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{menu.nom}</DialogTitle>
                          </DialogHeader>
                          <div className="flex justify-center">
                            <Image 
                              src={getImageUrl(menu.imageUrl) || ''} 
                              alt={menu.nom}
                              width={500}
                              height={384}
                              className="max-w-full max-h-96 object-contain rounded-lg"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ChefHat className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{menu.nom}</TableCell>
                  <TableCell>{menu.description || '-'}</TableCell>
                  <TableCell>{menu.prix}$</TableCell>
                  <TableCell>
                    {menu.produits && menu.produits.length > 0 ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-2">
                          {menu.produits.slice(0, 3).map((produit, index) => (
                            <div 
                              key={`${menu.id}-produit-${produit.id}-${index}`}
                              className="relative"
                              title={`${produit.nom} - ${produit.prix}$${produit.pivot?.quantite ? ` (x${produit.pivot.quantite})` : ''}`}
                            >
                              {produit.imageUrl ? (
                                <Image 
                                  src={getImageUrl(produit.imageUrl) || ''} 
                                  alt={produit.nom}
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 object-cover rounded-full border-2 border-white"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                                  <Package className="h-4 w-4 text-gray-600" />
                                </div>
                              )}
                            </div>
                          ))}
                          {menu.produits.length > 3 && (
                            <div 
                              key={`more-${menu.id}`}
                              className="w-8 h-8 bg-gray-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                              title={`+${menu.produits.length - 3} autres produits`}
                            >
                              +{menu.produits.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {menu.produits.length} produit{menu.produits.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Aucun produit</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={menu.active ? "default" : "secondary"}>
                      {menu.active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        key={`manage-${menu.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMenu(menu);
                          setIsProduitsOpen(true);
                        }}
                        title="Gérer les produits"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        key={`edit-${menu.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMenu(menu);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        key={`delete-${menu.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(menu.id)}
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le menu</DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <MenuForm 
              menu={selectedMenu}
              onSave={refreshData} 
              onCancel={() => setIsEditOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {selectedMenu && (
        <MenuProduitsManager 
          menu={selectedMenu} 
          isOpen={isProduitsOpen} 
          onClose={() => setIsProduitsOpen(false)} 
        />
      )}
    </div>
  );
}