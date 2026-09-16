import { apiRequest } from '@/lib/api';

export type CatalogMethod = {
  id: string;
  name: string;
  icon: string;
  time: string;
  displayPrice: string;
  price: string;
};

const FALLBACK_MOTO: CatalogMethod[] = [
  { id: 'moto-fekon', name: 'Moto Fekon', icon: 'motorbike', time: '10-15 minutes', displayPrice: '$1.00', price: '1.00' },
  { id: 'moto-bajaj', name: 'Moto Bajaj', icon: 'motorbike', time: '15-20 minutes', displayPrice: '$2.50', price: '2.50' },
];

export async function fetchMotoMethods(): Promise<CatalogMethod[]> {
  try {
    const result = await apiRequest<{ methods: CatalogMethod[] }>('/catalog/methods?category=MOTO');
    return result.methods?.length ? result.methods : FALLBACK_MOTO;
  } catch {
    return FALLBACK_MOTO;
  }
}
