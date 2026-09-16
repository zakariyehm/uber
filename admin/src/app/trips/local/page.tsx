"use client";

import { TripsBoard } from "@/components/TripsBoard";

export default function LocalTripsPage() {
  return (
    <TripsBoard
      kind="local"
      title="Local trips"
      subtitle="Moto Fekon, Bajaj, and Bicycle"
    />
  );
}
