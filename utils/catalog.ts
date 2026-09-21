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

export type CatalogStore = {
  id: string;
  name: string;
  category: string;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
};

const FALLBACK_MOTO: CatalogMethod[] = [
  { id: 'moto-fekon', name: 'Moto Fekon', icon: 'motorbike', time: '10-15 minutes', displayPrice: '$1.00', price: '1.00', vehicleType: 'MOTORCYCLE' },
  { id: 'moto-bajaj', name: 'Moto Bajaj', icon: 'motorbike', time: '15-20 minutes', displayPrice: '$2.50', price: '2.50', vehicleType: 'MOTORCYCLE' },
  { id: 'moto-bicycle', name: 'Moto Bicycle', icon: 'bicycle', time: '15-25 minutes', displayPrice: '$0.80', price: '0.80', vehicleType: 'BICYCLE' },
];

const FALLBACK_STATES: CatalogMethod[] = [
  { id: 'state-banadir', name: 'Banadir', icon: 'airplane', time: 'Same day', displayPrice: '$3.00', price: '3.00', vehicleType: 'MOTORCYCLE' },
  { id: 'state-bari', name: 'Bari', icon: 'airplane', time: '2 days', displayPrice: '$3.00', price: '3.00', vehicleType: 'MOTORCYCLE' },
];

export async function fetchMotoMethods(): Promise<CatalogMethod[]> {
  try {
    const result = await apiRequest<{ methods: CatalogMethod[] }>('/catalog/methods?category=MOTO');
    return result.methods?.length ? result.methods : FALLBACK_MOTO;
  } catch {
    return FALLBACK_MOTO;
  }
}

export async function fetchDeliveryStateMethods(): Promise<CatalogMethod[]> {
  try {
    const result = await apiRequest<{ methods: CatalogMethod[] }>(
      '/catalog/methods?category=DELIVERY_STATE'
    );
    return result.methods?.length ? result.methods : FALLBACK_STATES;
  } catch {
    return FALLBACK_STATES;
  }
}

export async function fetchActiveStores(): Promise<CatalogStore[]> {
  try {
    const result = await apiRequest<{ stores: CatalogStore[] }>('/catalog/stores');
    return result.stores ?? [];
  } catch {
    return [];
  }
}
