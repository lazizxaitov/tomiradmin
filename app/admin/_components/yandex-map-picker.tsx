"use client";

import { useEffect, useRef, useState } from "react";

type ChangePayload = {
  address?: string;
  lat?: string;
  lng?: string;
};

type Props = {
  address: string;
  lat: string;
  lng: string;
  onChange: (payload: ChangePayload) => void;
};

type YMaps = NonNullable<Window["ymaps"]>;
const MAPS_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ?? "";

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      Map: new (container: HTMLElement, options: unknown) => {
        geoObjects: { add: (obj: unknown) => void };
        events: { add: (name: string, cb: (event: { get: (key: string) => number[] }) => void) => void };
        setCenter: (coords: number[], zoom?: number, options?: unknown) => void;
        destroy: () => void;
      };
      Placemark: new (coords: number[], properties?: unknown, options?: unknown) => {
        geometry: { setCoordinates: (coords: number[]) => void; getCoordinates: () => number[] };
        events: { add: (name: string, cb: () => void) => void };
      };
      geocode: (query: unknown, options?: unknown) => Promise<{
        geoObjects: {
          get: (index: number) => {
            geometry: { getCoordinates: () => number[] };
            getAddressLine?: () => string;
            properties?: { get?: (key: string) => string };
          } | null;
        };
      }>;
    };
    __ymapsReadyPromise?: Promise<YMaps>;
  }
}

function loadYandexMaps(): Promise<YMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }

  if (window.ymaps) {
    return new Promise<YMaps>((resolve) => {
      const ymaps = window.ymaps!;
      ymaps.ready(() => resolve(ymaps));
    });
  }

  if (window.__ymapsReadyPromise) {
    return window.__ymapsReadyPromise;
  }

  window.__ymapsReadyPromise = new Promise<YMaps>((resolve, reject) => {
    const script = document.createElement("script");
    const keyQuery = MAPS_API_KEY ? `&apikey=${encodeURIComponent(MAPS_API_KEY)}` : "";
    script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${keyQuery}`;
    script.async = true;
    script.onload = () => {
      const ymaps = window.ymaps;
      if (!ymaps) {
        reject(new Error("Yandex Maps failed to init"));
        return;
      }
      ymaps.ready(() => resolve(ymaps));
    };
    script.onerror = () => reject(new Error("Failed to load Yandex Maps script"));
    document.head.appendChild(script);
  });

  return window.__ymapsReadyPromise;
}

export function YandexMapPicker({ address, lat, lng, onChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{
    setCenter: (coords: number[], zoom?: number, options?: unknown) => void;
    destroy: () => void;
  } | null>(null);
  const markerRef = useRef<{
    geometry: { setCoordinates: (coords: number[]) => void; getCoordinates: () => number[] };
    events: { add: (name: string, cb: () => void) => void };
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const fallbackCenter: [number, number] = [41.311081, 69.240562];

  const parseLat = Number(lat);
  const parseLng = Number(lng);
  const hasCoords = Number.isFinite(parseLat) && Number.isFinite(parseLng);

  const updatePoint = (coords: number[], withReverseGeocode = false) => {
    const [nextLat, nextLng] = coords;
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;

    onChange({
      lat: Number(nextLat).toFixed(6),
      lng: Number(nextLng).toFixed(6),
    });

    if (withReverseGeocode && window.ymaps) {
      window.ymaps
        .geocode([nextLat, nextLng])
        .then((res) => {
          const first = res.geoObjects.get(0);
          const found = first?.getAddressLine?.() || first?.properties?.get?.("text") || "";
          if (found) onChange({ address: found });
        })
        .catch(() => {
          setMapError("Не удалось определить адрес. Проверьте API ключ Яндекс.");
        });
    }
  };

  useEffect(() => {
    let disposed = false;

    loadYandexMaps()
      .then((ymaps) => {
        if (disposed || !mapContainerRef.current) return;

        const center = hasCoords ? [parseLat, parseLng] : fallbackCenter;
        const map = new ymaps.Map(mapContainerRef.current, {
          center,
          zoom: 15,
          controls: ["zoomControl"],
        });

        const marker = new ymaps.Placemark(center, {}, { draggable: true });
        map.geoObjects.add(marker);

        map.events.add("click", (event) => {
          const coords = event.get("coords");
          marker.geometry.setCoordinates(coords);
          updatePoint(coords, true);
        });

        marker.events.add("dragend", () => {
          const coords = marker.geometry.getCoordinates();
          updatePoint(coords, true);
        });

        mapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);
      })
      .catch(() => {
        setMapReady(false);
        setMapError("Карта не загрузилась. Проверьте API ключ Яндекс.");
      });

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!hasCoords) return;

    const coords: [number, number] = [parseLat, parseLng];
    markerRef.current.geometry.setCoordinates(coords);
    mapRef.current.setCenter(coords, 16, { duration: 200 });
  }, [hasCoords, parseLat, parseLng]);

  const searchByAddress = async () => {
    const query = address.trim();
    if (!query || !window.ymaps || !mapRef.current || !markerRef.current) return;

    setBusy(true);
    setMapError(null);
    try {
      try {
        const result = await window.ymaps.geocode(query, { results: 1 });
        const first = result.geoObjects.get(0);
        if (!first) throw new Error("NO_RESULTS");

        const coords = first.geometry.getCoordinates();
        const foundAddress = first.getAddressLine?.() || first.properties?.get?.("text") || query;

        markerRef.current.geometry.setCoordinates(coords);
        mapRef.current.setCenter(coords, 16, { duration: 200 });
        onChange({ address: foundAddress });
        updatePoint(coords, false);
        return;
      } catch {
        // Server-side fallback geocoder (avoids browser CORS/rate limits).
        const response = await fetch(`/api/admin/geocode?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("FALLBACK_FAILED");
        const data = (await response.json()) as {
          item?: { lat: number; lng: number; address?: string };
        };
        if (!data.item) throw new Error("NO_RESULTS");

        const coords: [number, number] = [Number(data.item.lat), Number(data.item.lng)];
        if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
          throw new Error("BAD_COORDS");
        }
        markerRef.current.geometry.setCoordinates(coords);
        mapRef.current.setCenter(coords, 16, { duration: 200 });
        onChange({ address: data.item.address || query });
        updatePoint(coords, false);
      }
    } catch {
      setMapError("Поиск по адресу не сработал. Проверь API-ключ и разреши localhost/127.0.0.1 в кабинете Яндекс.");
    } finally {
      setBusy(false);
    }
  };

  const openInYandexMaps = () => {
    if (!hasCoords) return;
    const url = `https://yandex.uz/maps/?ll=${parseLng}%2C${parseLat}&z=16&pt=${parseLng},${parseLat},pm2rdm`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-[#dce4ec] bg-white p-3">
      <p className="mb-2 text-sm font-semibold text-[#3c2828]">Выбор точки на карте</p>
      {!MAPS_API_KEY ? (
        <p className="mb-2 text-xs text-[#a5522f]">
          Не задан `NEXT_PUBLIC_YANDEX_MAPS_API_KEY`. Добавьте ключ в `.env.local`.
        </p>
      ) : null}
      {mapError ? <p className="mb-2 text-xs text-[#a5522f]">{mapError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={searchByAddress}
          className="rounded-xl border border-[#dce4ec] bg-white px-3 py-2 text-xs font-semibold text-[#243447]"
          disabled={busy || !mapReady}
        >
          {busy ? "Ищем..." : "Найти по адресу"}
        </button>
        <button
          type="button"
          onClick={openInYandexMaps}
          className="rounded-xl border border-[#dce4ec] bg-white px-3 py-2 text-xs font-semibold text-[#243447]"
          disabled={!hasCoords}
        >
          Открыть в Яндекс.Картах
        </button>
        <span className="self-center text-xs text-[#8d7374]">
          Клик по карте или перетащите маркер для точной точки.
        </span>
      </div>

      <div ref={mapContainerRef} className="mt-3 h-64 w-full overflow-hidden rounded-2xl border border-[#dce4ec]" />

      <p className="mt-2 text-xs text-[#8d7374]">
        Координаты: {hasCoords ? `${parseLat.toFixed(6)}, ${parseLng.toFixed(6)}` : "не выбраны"}
      </p>
    </div>
  );
}
