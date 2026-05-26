"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao: KakaoNamespace;
  }
}

interface KakaoNamespace {
  maps: {
    load: (callback: () => void) => void;
    Map: new (container: HTMLElement, options: MapOptions) => KakaoMapInstance;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Marker: new (options: MarkerOptions) => KakaoMarker;
    InfoWindow: new (options: InfoWindowOptions) => KakaoInfoWindow;
    event: {
      addListener: (
        target: KakaoMarker | KakaoMapInstance,
        type: string,
        handler: () => void
      ) => void;
    };
    services: {
      Places: new () => KakaoPlaces;
      Status: { OK: string };
    };
  };
}

interface MapOptions {
  center: KakaoLatLng;
  level: number;
}

interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

interface KakaoMapInstance {
  setCenter: (latlng: KakaoLatLng) => void;
  getCenter: () => KakaoLatLng;
  setLevel: (level: number) => void;
}

interface MarkerOptions {
  map: KakaoMapInstance;
  position: KakaoLatLng;
  title?: string;
}

interface KakaoMarker {
  setMap: (map: KakaoMapInstance | null) => void;
}

interface InfoWindowOptions {
  content: string;
  removable?: boolean;
}

interface KakaoInfoWindow {
  open: (map: KakaoMapInstance, marker: KakaoMarker) => void;
  close: () => void;
}

interface PlaceResult {
  place_name: string;
  address_name: string;
  x: string;
  y: string;
  category_group_name: string;
}

interface KakaoPlaces {
  keywordSearch: (
    keyword: string,
    callback: (result: PlaceResult[], status: string) => void
  ) => void;
}

export interface MapPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description?: string;
}

interface KakaoMapProps {
  places?: MapPlace[];
  onPlaceClick?: (place: MapPlace) => void;
  center?: { lat: number; lng: number };
  className?: string;
}

const KAKAO_SDK_URL = "//dapi.kakao.com/v2/maps/sdk.js";

export function KakaoMap({ places = [], onPlaceClick, center, className }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.kakao?.maps) return;

    const defaultCenter = center ?? { lat: 37.5665, lng: 126.978 };
    const map = new window.kakao.maps.Map(containerRef.current, {
      center: new window.kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
      level: 5,
    });
    mapRef.current = map;
    setIsLoaded(true);
  }, [center]);

  // Load SDK
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!apiKey) {
      setError("카카오맵 API 키가 설정되지 않았습니다");
      return;
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
      return;
    }

    const script = document.createElement("script");
    script.src = `${KAKAO_SDK_URL}?appkey=${apiKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(initMap);
    };
    script.onerror = () => setError("카카오맵 로드에 실패했습니다");
    document.head.appendChild(script);
  }, [initMap]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    // Clear existing markers
    for (const marker of markersRef.current) {
      marker.setMap(null);
    }
    markersRef.current = [];

    const map = mapRef.current;

    for (const place of places) {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      const marker = new window.kakao.maps.Marker({ map, position, title: place.name });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:8px 12px;font-size:14px;min-width:120px"><strong>${place.name}</strong><br/><span style="color:#666;font-size:12px">${place.category}</span></div>`,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        infoWindow.open(map, marker);
        onPlaceClick?.(place);
      });

      markersRef.current.push(marker);
    }
  }, [places, isLoaded, onPlaceClick]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-gray-100 ${className ?? "h-80"}`}
      >
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className ?? "h-80"}`}>
      <div ref={containerRef} className="h-full w-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-400">지도 로딩 중...</p>
        </div>
      )}
    </div>
  );
}
