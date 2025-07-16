'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShoppingBag, 
  Search, 
  Phone, 
  UtensilsCrossed,
  Users
} from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                Bienvenue chez{' '}
                <span className="text-orange-600">Hen House</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Commandez simplement, gérez facilement. Découvrez nos menus savoureux et suivez vos commandes en temps réel.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  asChild 
                  size="lg"
                  className="bg-orange-600 hover:bg-orange-700 text-lg px-8 py-3"
                >
                  <Link href="/menu">
                    <UtensilsCrossed className="h-5 w-5 mr-2" />
                    Voir le menu
                  </Link>
                </Button>
                <Button 
                  asChild 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-3 border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  <Link href="/suivi-commande">
                    <Search className="h-5 w-5 mr-2" />
                    Rechercher ma commande
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Image
                src="/landing-image.png"
                alt="Hen House - Délicieux plats"
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir Hen House ?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Une expérience de commande simple et transparente, avec un suivi en temps réel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <ShoppingBag className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Commande facile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Parcourez nos menus et commandez en quelques clics, même sans créer de compte
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Search className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Recherche en temps réel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Recherchez votre commande en temps réel avec votre numéro de commande et téléphone
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Phone className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Confirmation rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Notre équipe vous contacte rapidement pour confirmer les détails de livraison
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Commander chez Hen House n&apos;a jamais été aussi simple
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Choisissez</h3>
              <p className="text-gray-600">Parcourez notre menu et ajoutez vos plats favoris au panier</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Commandez</h3>
              <p className="text-gray-600">Renseignez vos informations de livraison et validez votre commande</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Recherchez</h3>
              <p className="text-gray-600">Utilisez votre numéro de commande pour rechercher la préparation</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Dégustez</h3>
              <p className="text-gray-600">Recevez votre commande et savourez nos délicieux plats</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-orange-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à commander ?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Découvrez nos menus savoureux et passez votre première commande
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg"
              className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              <Link href="/menu">
                <UtensilsCrossed className="h-5 w-5 mr-2" />
                Commander maintenant
              </Link>
            </Button>
            <Button 
              asChild 
              size="lg" 
              className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-orange-600 text-lg px-8 py-3 transition-all duration-200"
            >
              <Link href="/login">
                <Users className="h-5 w-5 mr-2" />
                Espace professionnel
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 bg-blue-50">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-blue-700">
                <Search className="h-6 w-6" />
                Recherche de commande sans compte
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-700 mb-4">
                <strong>Vous n&apos;avez pas besoin de créer un compte pour commander !</strong>
              </p>
              <p className="text-gray-600 mb-6">
                Après avoir passé votre commande, vous recevrez un <strong>numéro de commande unique</strong> 
                (ex: CMD-1752359735513). Utilisez ce numéro avec votre téléphone (format XXX-XXXX) pour rechercher 
                l&apos;état de votre commande en temps réel sur notre page de recherche.
              </p>
              <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                <Link href="/suivi-commande">
                  Accéder à la recherche de commande
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
