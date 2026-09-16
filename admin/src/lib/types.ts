export type Overview = {
  generatedAt: string;
  today: {
    gmv: string;
    platformFee: string;
    driverEarnings: string;
    riderRefundPending: string;
    deliveryStateBalance: string;
    settledCount: number;
    fullTrips: number;
    noShows: number;
    tripsCreated: number;
    tripsByStatus: Record<string, number>;
    newRiders: number;
  };
  allTime: {
    gmv: string;
    platformFee: string;
    driverEarnings: string;
    riderRefundPending: string;
    deliveryStateBalance: string;
    settledCount: number;
    riders: number;
    drivers: number;
    tripsByStatus: Record<string, number>;
  };
  fleet: {
    onlineDrivers: number;
    offlineDrivers: number;
    totalDrivers: number;
    liveTrips: number;
    pendingOffers: number;
  };
  wallets: { riderPendingCredits: string; deliveryStateBalance?: string };
  driverFeePercent?: number;
  stateDriverPayout?: number;
};

export type TripRow = {
  id: string;
  orderId: string;
  pickupLocation: string;
  destinationLocation: string;
  deliveryMethod: string;
  vehicleType?: string | null;
  openToAllVehicleTypes?: boolean;
  deliveryPrice: string;
  status: string;
  createdAt: string;
  driverName?: string;
  riderName?: string;
  riderPhone?: string | null;
  driverPhone?: string | null;
  paymentHoldStatus?: string;
  settlementType?: string;
  offeredToDriverId?: string;
  offerExpiresAt?: string;
};

export type LiveDriver = {
  id: string;
  name: string;
  phone: string;
  rating: string;
  vehicleType?: string | null;
  activeTripId: string | null;
};

export type LiveOps = {
  trips: TripRow[];
  onlineDrivers: LiveDriver[];
};

export type AdminUserRow = {
  id: string;
  role: string;
  name: string;
  phone: string;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  rating: string;
  isOnline: boolean;
  vehicleType?: string | null;
  tripCount: number;
  todayBalance: string | null;
  pendingBalance: string | null;
};

export type ServiceMethod = {
  id: string;
  category: string;
  slug: string;
  name: string;
  icon: string;
  time: string;
  timeLabel: string;
  price: string;
  displayPrice: string;
  vehicleType: string;
  isActive: boolean;
  sortOrder: number;
};
