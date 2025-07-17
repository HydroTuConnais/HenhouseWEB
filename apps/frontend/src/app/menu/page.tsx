"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingCart, Plus, Minus, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/hooks/use-cart";
import { useMenus, useProduits, type Product, type Menu } from "@/components/hooks/api-hooks";
import { useIsAuthenticated, useEntrepriseId } from "@/components/stores/auth-store";
import { IMAGE_BASE_URL } from "@/lib/config";

// Fonction utilitaire pour formater le prix de manière sécurisée
const formatPrice = (prix: string | number): string => {
  const priceNumber = typeof prix === 'string' ? parseFloat(prix) : Number(prix);
  return isNaN(priceNumber) ? '0.00' : priceNumber.toFixed(2);
};

// Composant ProductCard
const ProductCard = ({ 
  item, 
  type, 
  onAddToCart 
}: { 
  item: Product | Menu; 
  type: "produit" | "menu";
  onAddToCart: (item: {
    id: number;
    nom: string;
    prix: number;
    imageUrl: string;
    type: "menu" | "produit";
  }) => void;
}) => {
  // Construire l'URL de l'image de manière sécurisée
  const getImageUrl = () => {
    if (item.fullImageUrl) {
      return item.fullImageUrl;
    }
    if (item.imageUrl) {
      // Si l'URL commence déjà par http, l'utiliser telle quelle
      if (item.imageUrl.startsWith('http')) {
        return item.imageUrl;
      }
      // Déterminer le dossier selon le type
      const folder = type === 'menu' ? 'menus' : 'produits';
      // Construire l'URL complète
      return `${IMAGE_BASE_URL}/uploads/${folder}/${item.imageUrl}`;
    }
    return "/placeholder-food.jpg";
  };
  
  const imageUrl = getImageUrl();
  
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <div className="relative h-48 w-full">
        <Image
          src={imageUrl}
          alt={item.nom}
          width={400}
          height={300}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{item.nom}</h3>
        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-lg text-orange-600">{formatPrice(item.prix)}$</span>
          <Button 
            size="sm" 
            onClick={() => onAddToCart({
              id: item.id,
              nom: item.nom,
              prix: item.prix,
              imageUrl: imageUrl,
              type: type as "menu" | "produit"
            })}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
};

// Modal du panier
const CartModal = () => {
  const cart = useCart();
  const router = useRouter();
  
  const handleCheckout = () => {
    router.push('/commander');
    cart.setCartOpen(false);
  };

  // Fonction pour construire l'URL de l'image dans le panier
  const getCartImageUrl = (imageUrl: string, itemType: string) => {
    if (!imageUrl || imageUrl === "/placeholder-food.jpg") {
      return "/placeholder-food.jpg";
    }
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    // Déterminer le dossier selon le type
    const folder = itemType === 'menu' ? 'menus' : 'produits';
    // Si c'est juste un nom de fichier, construire l'URL complète
    return `${IMAGE_BASE_URL}/uploads/${folder}/${imageUrl}`;
  };
  
  return (
    <Dialog open={cart.isOpen} onOpenChange={cart.setCartOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Votre panier ({cart.itemCount} articles)</DialogTitle>
        </DialogHeader>
        
        {cart.items.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Votre panier est vide</p>
          </div>
        ) : (
          <div className="py-4 max-h-[60vh] overflow-auto">
            {cart.items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex justify-between items-center mb-4 border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={getCartImageUrl(item.imageUrl || "", item.type)}
                      alt={item.nom}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{item.nom}</p>
                    <p className="text-sm text-gray-500">{formatPrice(item.prix)}$</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => cart.updateQuantity(item.id, item.type, item.quantite - 1)}
                    disabled={item.quantite <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    value={item.quantite}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value);
                      if (!isNaN(newQuantity) && newQuantity > 0) {
                        cart.updateQuantity(item.id, item.type, newQuantity);
                      }
                    }}
                    className="w-16 h-8 text-center px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => cart.updateQuantity(item.id, item.type, item.quantite + 1)}
                    disabled={item.quantite >= 99}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => cart.removeItem(item.id, item.type)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-orange-600">{formatPrice(cart.total)}$</span>
              </div>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => cart.setCartOpen(false)}
            className="sm:flex-1"
          >
            Continuer les achats
          </Button>
          <Button 
            onClick={handleCheckout}
            disabled={cart.items.length === 0}
            className="sm:flex-1 bg-orange-500 hover:bg-orange-600"
          >
            Commander ({formatPrice(cart.total)}$)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function MenuPage() {
  const cart = useCart();
  const { isAuthenticated, user } = useIsAuthenticated();
  const entrepriseId = useEntrepriseId();
  
  const { data: menus = [], isLoading: menusLoading } = useMenus();
  const { data: produits = [], isLoading: produitsLoading } = useProduits();

  const activeMenus = menus.filter((m: Menu) => m.active);
  const isLoading = menusLoading || produitsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Bouton du panier (flottant) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          className="rounded-full h-16 w-16 shadow-xl bg-orange-500 hover:bg-orange-600"
          onClick={() => cart.toggleCart()}
        >
          <ShoppingCart className="h-6 w-6" />
          {cart.itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs">
              {cart.itemCount}
            </span>
          )}
        </Button>
      </div>

      {/* Modal du panier */}
      <CartModal />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Notre carte</h1>
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  Connecté en tant que <strong>{user.username}</strong> ({user.role})
                  {entrepriseId && ` - Entreprise ID: ${entrepriseId}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Découvrez nos menus et produits disponibles publiquement</p>
        )}
      </div>

      <Tabs defaultValue="menus" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="menus" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Nos Menus
          </TabsTrigger>
          <TabsTrigger value="produits" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            Nos Produits
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="menus" className="space-y-8">
          {activeMenus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeMenus.map((menu: Menu) => (
                <ProductCard 
                  key={menu.id} 
                  item={menu} 
                  type="menu" 
                  onAddToCart={cart.addItem} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun menu public disponible</h3>
              <p className="text-gray-500">
                Tous les menus sont actuellement liés à des entreprises spécifiques.<br />
                Connectez-vous pour accéder aux menus d&apos;entreprises.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="produits">
          {produits.filter((p: Product) => p.active).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {produits.filter((p: Product) => p.active).map((produit: Product) => (
                <ProductCard 
                  key={produit.id} 
                  item={produit} 
                  type="produit" 
                  onAddToCart={cart.addItem}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucun produit public disponible</h3>
              <p className="text-gray-500">
                Tous les produits sont actuellement liés à des entreprises spécifiques.<br />
                Connectez-vous pour accéder aux produits d&apos;entreprises.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}