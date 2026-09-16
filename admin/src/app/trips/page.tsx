import { redirect } from "next/navigation";

export default function TripsIndexPage() {
  redirect("/trips/local");
}
