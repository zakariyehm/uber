"use client";

import { TripsBoard } from "@/components/TripsBoard";

export default function StateTripsPage() {
  return (
    <TripsBoard
      kind="state"
      title="State trips"
      subtitle="Delivery State destinations"
    />
  );
}
