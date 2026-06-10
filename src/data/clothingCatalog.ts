import type { ClothingAudience } from '@/types';

export const CLOTHING_AUDIENCES: ClothingAudience[] = ['Clásicas', 'Niños', 'Bebés'];

export const CLOTHING_CATEGORIES = [
  'Blusas',
  'Tops',
  'Chompas',
  'Conjuntos',
  'Pantalones',
  'Vestidos',
  'Faldas',
  'Shorts',
  'Jeans',
  'Ropa deportiva',
  'Accesorios',
  'Ropa interior',
] as const;

export const CLOTHING_SIZES_BY_AUDIENCE: Record<ClothingAudience, string[]> = {
  Clásicas: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  Niños: ['2', '4', '6', '8', '10', '12', '14', '16'],
  Bebés: ['RN', '0-3M', '3-6M', '6-9M', '9-12M', '12-18M', '18-24M'],
};

export const CLOTHING_COLORS = [
  'Negro',
  'Blanco',
  'Gris',
  'Beige',
  'Rojo',
  'Rosa',
  'Azul',
  'Azul marino',
  'Verde',
  'Amarillo',
  'Naranja',
  'Morado',
  'Café',
  'Multicolor',
  'Estampado',
] as const;
