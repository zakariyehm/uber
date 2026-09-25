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
  pickupLat?: number | null;
  pickupLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  distanceKm?: string;
  durationLabel?: string;
  offerExpiresAt?: string;
  offeredToDriverId?: string;
  paymentHoldStatus?: string;
  settlementType?: string;
  /** LOCAL | STATE when returned from admin listTrips */
  tripKind?: string | null;
};

export type LiveDriver = {
  id: string;
  name: string;
  phone: string;
  rating: string;
  vehicleType?: string | null;
  activeTripId: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  riderKind?: string | null;
  storeId?: string | null;
  storeName?: string | null;
};

export type VehicleRow = {
  id: string;
  driverId: string;
  driverName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  rating: string;
  tripCount: number;
  todayBalance: string;
  createdAt: string;
  isOnline: boolean;
  isActive: boolean;
  vehicleType: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  licenseNumber: string;
};

export type AnalyticsPayload = {
  range: string;
  from: string;
  generatedAt: string;
  kpis: {
    gmv: string;
    platformFee: string;
    driverEarnings: string;
    deliveryStateBalance: string;
    settledCount: number;
    fullTrips: number;
    noShows: number;
    tripsCreated: number;
    cancelled: number;
    newCustomers: number;
    onlineDrivers: number;
  };
  methods: Array<{ id: string; label: string; trips: number; gmv: string }>;
  series: Array<{ date: string; trips: number; gmv: string }>;
  trips: Array<{
    id: string;
    orderId: string;
    pickupLocation: string;
    destinationLocation: string;
    deliveryMethod: string;
    vehicleType?: string | null;
    distanceKm: string;
    deliveryPrice: string;
    platformFee: string;
    driverEarnings: string;
    settlementType?: string | null;
    status: string;
    createdAt: string;
    settledAt?: string | null;
    riderName: string;
    driverName: string;
  }>;
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
