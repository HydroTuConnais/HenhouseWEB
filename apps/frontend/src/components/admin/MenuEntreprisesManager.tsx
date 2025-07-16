'use client';

import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Building2, Users, Save, X, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useAdminMenus, 
  useAdminEntreprises, 
  useUpdateMenuEntreprises,
  type AdminMenu, 
  type AdminEntreprise 
} from '@/components/hooks/api-hooks';
import { getImageUrl } from '@/lib/config';
import Image from 'next/image';

interface MenuEntreprisesManagerProps {
  onClose?: () => void;
}

interface MenuWithSelection extends AdminMenu {
  selectedEntreprises: number[];
  hasChanges: boolean;
}

export default function MenuEntreprisesManager({ onClose }: MenuEntreprisesManagerProps) {
  const { data: allMenus = [], isLoading: menusLoading, refetch: refetchMenus } = useAdminMenus();
  const { data: allEntreprises = [], isLoading: entreprisesLoading } = useAdminEntreprises();
  const updateMenuEntreprisesMutation = useUpdateMenuEntreprises();
  
  const [menus, setMenus] = useState<MenuWithSelection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<Set<number>>(new Set());

  // Initialiser les menus avec leurs entreprises sélectionnées
  useEffect(() => {
    if (allMenus.length > 0) {
      const menusWithSelection = allMenus.map((menu: AdminMenu) => ({
        ...menu,
        selectedEntreprises: menu.entreprises?.map((e: any) => e.id) || [],
        hasChanges: false,
      }));
      setMenus(menusWithSelection);
    }
  }, [allMenus]);

  const filteredMenus = menus.filter(menu =>
    menu.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    menu.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEntrepriseToggle = (menuId: number, entrepriseId: number) => {
    setMenus(prevMenus =>
      prevMenus.map(menu => {
        if (menu.id === menuId) {
          const isCurrentlySelected = menu.selectedEntreprises.includes(entrepriseId);
          const newSelectedEntreprises = isCurrentlySelected
            ? menu.selectedEntreprises.filter(id => id !== entrepriseId)
            : [...menu.selectedEntreprises, entrepriseId];
          
          const originalEntreprises = menu.entreprises?.map((e: any) => e.id) || [];
          const hasChanges = JSON.stringify(newSelectedEntreprises.sort()) !== JSON.stringify(originalEntreprises.sort());
          
          return {
            ...menu,
            selectedEntreprises: newSelectedEntreprises,
            hasChanges,
          };
        }
        return menu;
      })
    );
  };

  const handleSelectAllEntreprises = (menuId: number) => {
    setMenus(prevMenus =>
      prevMenus.map(menu => {
        if (menu.id === menuId) {
          const allEntrepriseIds = allEntreprises.map((e: any) => e.id);
          const originalEntreprises = menu.entreprises?.map((e: any) => e.id) || [];
          const hasChanges = JSON.stringify(allEntrepriseIds.sort()) !== JSON.stringify(originalEntreprises.sort());
          
          return {
            ...menu,
            selectedEntreprises: allEntrepriseIds,
            hasChanges,
          };
        }
        return menu;
      })
    );
  };

  const handleDeselectAllEntreprises = (menuId: number) => {
    setMenus(prevMenus =>
      prevMenus.map(menu => {
        if (menu.id === menuId) {
          const originalEntreprises = menu.entreprises?.map((e: any) => e.id) || [];
          const hasChanges = originalEntreprises.length > 0;
          
          return {
            ...menu,
            selectedEntreprises: [],
            hasChanges,
          };
        }
        return menu;
      })
    );
  };

  const handleSaveMenu = async (menuId: number) => {
    const menu = menus.find(m => m.id === menuId);
    if (!menu || !menu.hasChanges) return;

    try {
      await updateMenuEntreprisesMutation.mutateAsync({
        menuId,
        entrepriseIds: menu.selectedEntreprises,
      });

      // Réinitialiser le state local pour ce menu
      setMenus(prevMenus =>
        prevMenus.map(m => {
          if (m.id === menuId) {
            return {
              ...m,
              hasChanges: false,
            };
          }
          return m;
        })
      );

      toast.success('Associations mises à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des associations');
      console.error('Erreur:', error);
    }
  };

  const handleResetMenu = (menuId: number) => {
    setMenus(prevMenus =>
      prevMenus.map(menu => {
        if (menu.id === menuId) {
          return {
            ...menu,
            selectedEntreprises: menu.entreprises?.map((e: any) => e.id) || [],
            hasChanges: false,
          };
        }
        return menu;
      })
    );
  };

  const handleBulkUpdate = async () => {
    const menusWithChanges = menus.filter(m => m.hasChanges && selectedMenus.has(m.id));
    
    if (menusWithChanges.length === 0) {
      toast.warning('Aucune modification à sauvegarder');
      return;
    }

    try {
      await Promise.all(
        menusWithChanges.map(async (menu) => {
          await updateMenuEntreprisesMutation.mutateAsync({
            menuId: menu.id,
            entrepriseIds: menu.selectedEntreprises,
          });
        })
      );

      // Réinitialiser le state local pour tous les menus modifiés
      setMenus(prevMenus =>
        prevMenus.map(menu => {
          if (menusWithChanges.find(m => m.id === menu.id)) {
            return {
              ...menu,
              hasChanges: false,
            };
          }
          return menu;
        })
      );

      setSelectedMenus(new Set());
      toast.success(`${menusWithChanges.length} menu(s) mis à jour avec succès`);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour en lot');
      console.error('Erreur:', error);
    }
  };

  const toggleMenuSelection = (menuId: number) => {
    setSelectedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const hasAnyChanges = menus.some(m => m.hasChanges);
  const hasSelectedChanges = menus.some(m => m.hasChanges && selectedMenus.has(m.id));

  if (menusLoading || entreprisesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Gestion des Associations Menu-Entreprises
        </CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Input
            placeholder="Rechercher un menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          
          <div className="flex gap-2">
            {hasSelectedChanges && (
              <Button
                onClick={handleBulkUpdate}
                disabled={updateMenuEntreprisesMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder la sélection ({selectedMenus.size})
              </Button>
            )}
            
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Fermer
              </Button>
            )}
          </div>
        </div>

        {hasAnyChanges && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              Des modifications sont en attente. N'oubliez pas de sauvegarder.
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {filteredMenus.map((menu) => (
            <Card key={menu.id} className={`transition-all ${menu.hasChanges ? 'border-orange-300 bg-white' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Checkbox de sélection */}
                  <Checkbox
                    checked={selectedMenus.has(menu.id)}
                    onCheckedChange={() => toggleMenuSelection(menu.id)}
                    className="mt-1"
                  />

                  {/* Image du menu */}
                  <div className="flex-shrink-0">
                    <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={getImageUrl(menu.imageUrl) || '/placeholder-food.jpg'}
                        alt={menu.nom}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* Informations du menu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg truncate">{menu.nom}</h3>
                      {menu.hasChanges && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800">
                          Modifié
                        </Badge>
                      )}
                      {!menu.active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    
                    {menu.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{menu.description}</p>
                    )}
                    
                    <p className="text-sm font-medium text-green-600 mb-3">{menu.prix}$</p>

                    {/* Entreprises actuelles */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Entreprises actuelles ({menu.entreprises?.length || 0}) :
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(menu.entreprises?.length ?? 0) > 0 ? (
                          menu.entreprises?.map((entreprise: any) => (
                            <Badge key={entreprise.id} variant="secondary" className="text-xs">
                              {entreprise.nom}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">Aucune entreprise associée</span>
                        )}
                      </div>
                    </div>

                    {/* Sélection des entreprises */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          Modifier les associations ({menu.selectedEntreprises.length}/{allEntreprises.length}) :
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllEntreprises(menu.id)}
                            className="text-xs"
                          >
                            Tout sélectionner
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeselectAllEntreprises(menu.id)}
                            className="text-xs"
                          >
                            Tout désélectionner
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {allEntreprises.map((entreprise: AdminEntreprise) => (
                          <label
                            key={entreprise.id}
                            className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <Checkbox
                              checked={menu.selectedEntreprises.includes(entreprise.id)}
                              onCheckedChange={() => handleEntrepriseToggle(menu.id, entreprise.id)}
                            />
                            <span className="text-sm truncate">{entreprise.nom}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Actions individuelles */}
                    {menu.hasChanges && (
                      <div className="flex gap-2 mt-4 pt-3 border-t">
                        <Button
                          onClick={() => handleSaveMenu(menu.id)}
                          disabled={updateMenuEntreprisesMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Sauvegarder
                        </Button>
                        <Button
                          onClick={() => handleResetMenu(menu.id)}
                          disabled={updateMenuEntreprisesMutation.isPending}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Annuler
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredMenus.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'Aucun menu trouvé pour cette recherche' : 'Aucun menu disponible'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
