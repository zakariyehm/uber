import { apiRequest } from '@/lib/api';

export type CatalogMethod = {
  id: string;
  name: string;
  icon: string;
  time: string;
  displayPrice: string;
  price: string;
  vehicleType?: 'MOTORCYCLE' | 'BICYCLE';
};

const FALLBACK_MOTO: CatalogMethod[] = [
  { id: 'moto-fekon', name: 'Moto Fekon', icon: 'motorbike', time: '10-15 minutes', displayPrice: '$1.00', price: '1.00', vehicleType: 'MOTORCYCLE' },
  { id: 'moto-bajaj', name: 'Moto Bajaj', icon: 'motorbike', time: '15-20 minutes', displayPrice: '$2.50', price: '2.50', vehicleType: 'MOTORCYCLE' },
  { id: 'moto-bicycle', name: 'Moto Bicycle', icon: 'bicycle', time: '15-25 minutes', displayPrice: '$0.80', price: '0.80', vehicleType: 'BICYCLE' },
];

export async function fetchMotoMethods(): Promise<CatalogMethod[]> {
  try {
    const result = await apiRequest<{ methods: CatalogMethod[] }>('/catalog/methods?category=MOTO');
    return result.methods?.length ? result.methods : FALLBACK_MOTO;
  } catch {
    return FALLBACK_MOTO;
  }
}
