"use client";

import { formatOrderCode } from "@/lib/format";
import type { LiveDriver, TripRow } from "@/lib/types";
import { useEffect, useRef } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const CENTER: [number, number] = [45.3182, 2.0469];

type Props = {
  trips: TripRow[];
  drivers: LiveDriver[];
  selectedId?: string | null;
  onSelectTrip?: (id: string) => void;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Mapbox failed to load"));
    document.head.appendChild(script);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function DispatchMap({ trips, drivers, selectedId, onSelectTrip }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !host.current) return;
    let cancelled = false;
    loadCss("https://unpkg.com/mapbox-gl@3/dist/mapbox-gl.css");
    void loadScript("https://unpkg.com/mapbox-gl@3/dist/mapbox-gl.js").then(() => {
      if (cancelled || !host.current || mapRef.current) return;
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: host.current,
        style: "mapbox://styles/mapbox/navigation-night-v1",
        center: CENTER,
        zoom: 12.2,
        attributionControl: false,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        readyRef.current = true;
        map.resize();
      });
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(onResize, 80);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = (window as any).mapboxgl;
    if (!map || !mapboxgl) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const bounds = new mapboxgl.LngLatBounds();
    let hasPoint = false;

    const add = (lng: number, lat: number, el: HTMLElement) => {
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      hasPoint = true;
    };

    for (const trip of trips) {
      const lat = Number(trip.pickupLat);
      const lng = Number(trip.pickupLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const selected = selectedId === trip.id;
      const pending = trip.status === "pending";
      const el = document.createElement("button");
      el.type = "button";
      el.title = `${formatOrderCode(trip.orderId)} · ${trip.pickupLocation}`;
      el.style.cssText = [
        "border:0",
        "cursor:pointer",
        "padding:0",
        "background:transparent",
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "gap:4px",
      ].join(";");
      el.innerHTML = `
        <span style="
          display:inline-flex;align-items:center;gap:6px;
          padding:4px 8px;border-radius:999px;
          background:${selected ? "#000" : "#111"};
          color:#fff;font:600 10px/1 ui-sans-serif,system-ui;
          box-shadow:0 8px 20px rgba(0,0,0,.35);
          outline:${selected ? "2px solid #3376BD" : "0"};
        ">
          <span style="width:7px;height:7px;border-radius:99px;background:${pending ? "#f59e0b" : "#3376BD"}"></span>
          ${formatOrderCode(trip.orderId)}
        </span>
        <span style="width:10px;height:10px;border-radius:99px;background:#fff;border:3px solid ${pending ? "#f59e0b" : "#3376BD"}"></span>
      `;
      el.onclick = () => onSelectTrip?.(trip.id);
      add(lng, lat, el);
    }

    for (const driver of drivers) {
      const lat = Number(driver.latitude);
      const lng = Number(driver.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const busy = Boolean(driver.activeTripId);
      const el = document.createElement("div");
      el.title = `${driver.name} · ${busy ? "On trip" : "Available"}`;
      el.style.cssText = [
        "width:28px",
        "height:28px",
        "border-radius:999px",
        `background:${busy ? "#111" : "#16a34a"}`,
        "border:2px solid #fff",
        "box-shadow:0 6px 16px rgba(0,0,0,.35)",
        "display:grid",
        "place-items:center",
        "color:#fff",
        "font:700 11px/1 ui-sans-serif,system-ui",
      ].join(";");
      el.textContent = (driver.name || "D").slice(0, 1).toUpperCase();
      add(lng, lat, el);
    }

    if (hasPoint && typeof map.fitBounds === "function") {
      try {
        map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 400 });
      } catch {
        /* empty bounds */
      }
    }
  }, [trips, drivers, selectedId, onSelectTrip]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="grid h-full place-items-center bg-[#0b1220] text-sm text-white/60">
        Add NEXT_PUBLIC_MAPBOX_TOKEN to show the live city map.
      </div>
    );
  }

  return <div ref={host} className="h-full w-full bg-[#0b1220]" />;
}
