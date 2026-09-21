export const STORE_CATEGORIES = [
  { id: "GROCERY", label: "Grocery / Supermarket" },
  { id: "MINI_MART", label: "Mini-mart" },
  { id: "PRODUCE", label: "Fresh produce" },
  { id: "BUTCHER", label: "Meat / Butcher" },
  { id: "FISH", label: "Fish / Seafood" },
  { id: "BAKERY", label: "Bakery" },
  { id: "COFFEE", label: "Coffee / Cafe" },
  { id: "RESTAURANT", label: "Restaurant" },
  { id: "JUICE", label: "Juice bar" },
  { id: "PHARMACY", label: "Pharmacy" },
  { id: "COSMETICS", label: "Cosmetics / Beauty" },
  { id: "ELECTRONICS", label: "Electronics / Mobile" },
  { id: "FASHION", label: "Fashion / Clothes" },
  { id: "HARDWARE", label: "Hardware" },
  { id: "WATER_GAS", label: "Water / Gas refill" },
  { id: "FLOWERS", label: "Flowers / Gifts" },
  { id: "OTHER", label: "Other" },
] as const;

export type StoreCategoryId = (typeof STORE_CATEGORIES)[number]["id"];

export function storeCategoryLabel(id?: string | null) {
  return STORE_CATEGORIES.find((item) => item.id === id)?.label || id || "—";
}

export type StoreRow = {
  id: string;
  name: string;
  category: string;
  phone?: string | null;
  ownerName?: string | null;
  address?: string | null;
  district?: string | null;
  description?: string | null;
  balance?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StoreProfile = {
  store: StoreRow;
  stats: {
    ordersTotal: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  orders: {
    id: string;
    orderId: string;
    status: string;
    deliveryPrice: string;
    storeOrderCode?: string;
    storeBranchLocation?: string;
    destinationLocation: string;
    recipientName: string;
    payerType?: string;
    createdAt: string;
    completedAt?: string;
  }[];
  transactions: {
    id: string;
    type: string;
    status?: string;
    amount: string;
    balanceAfter: string;
    note?: string | null;
    orderId?: string | null;
    deliveryRequestId?: string | null;
    createdAt: string;
    settledAt?: string | null;
  }[];
};
