import { redirect } from "next/navigation";

export default function LocalTripsRedirect() {
  redirect("/trips");
}
