import { useEffect, useRef, useState } from "react";
import { Restaurant, getCategoryStyle } from "../data";

interface LeafletMapProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant) => void;
}

export default function LeafletMap({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<number, any>>({});
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // Load Leaflet from CDN dynamically
  useEffect(() => {
    if (window.hasOwnProperty("L")) {
      setIsLeafletLoaded(true);
      return;
    }

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up if component unmounts before loading completes
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Destroy existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Default centerふじみ野市上福岡駅周辺
    const map = L.map(mapContainerRef.current).setView([35.872, 139.516], 14);
    mapRef.current = map;

    // Add standard OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLeafletLoaded]);

  // Handle Markers and Updates
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    // Custom Icon helper
    const createCustomIcon = (category: string, isSelected: boolean) => {
      const style = getCategoryStyle(category);
      const color = style.color;
      const letter = style.letter;

      const size = isSelected ? 36 : 28;
      const borderSize = isSelected ? "border-4 border-white" : "border-2 border-white";
      const shadow = isSelected ? "shadow-xl" : "shadow-md";
      const glyph = isSelected ? "★" : letter;

      return L.divIcon({
        className: "custom-leaflet-icon",
        html: `
          <div class="relative flex items-center justify-center rounded-full ${borderSize} ${shadow} transition-all duration-300" 
               style="background-color: ${color}; width: ${size}px; height: ${size}px; transform: translate(-50%, -50%);">
            <span class="text-white text-[10px] font-bold">${glyph}</span>
            <div class="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]" 
                 style="border-t-color: ${color};"></div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [0, 0],
      });
    };

    // Plot restaurants
    restaurants.forEach((restaurant) => {
      const isSelected = selectedRestaurant?.id === restaurant.id;
      const marker = L.marker([restaurant.lat, restaurant.lng], {
        icon: createCustomIcon(restaurant.category, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      let couponBadge = '<div class="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded inline-block mt-1 font-bold">A券・B券 利用可</div>';
      if (restaurant.couponType === "a_only") {
        couponBadge = '<div class="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded inline-block mt-1 font-bold">A券のみ 利用可</div>';
      } else if (restaurant.couponType === "none") {
        couponBadge = '<div class="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded inline-block mt-1 font-bold">クーポン対象外</div>';
      }

      // Simple HTML Popup with external navigation links
      const catStyle = getCategoryStyle(restaurant.category);
      const displayCategory = restaurant.subCategory ? `${restaurant.category} (${restaurant.subCategory})` : restaurant.category;
      const popupContent = `
        <div class="p-1 max-w-[220px] font-sans">
          <div class="text-xs font-extrabold mb-1" style="color: ${catStyle.color};">${displayCategory}</div>
          <h3 class="font-extrabold text-base text-gray-900 mb-1 leading-tight">${restaurant.name}</h3>
          <p class="text-sm text-gray-600 mb-1 leading-normal">${restaurant.address}</p>
          <p class="text-sm text-gray-500 font-bold mb-1 leading-none">${restaurant.phone === "なし" ? "" : "📞 " + restaurant.phone}</p>
          ${couponBadge}
          <div class="mt-2.5 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + " " + restaurant.address)}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded py-1 text-center font-bold inline-block"
               style="text-decoration: none; display: block;">
               Googleマップ
            </a>
            <a href="https://maps.apple.com/?q=${encodeURIComponent(restaurant.name + " " + restaurant.address)}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded py-1 text-center font-bold inline-block"
               style="text-decoration: none; display: block;">
               Appleマップ
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, isSelected ? -10 : -5],
      });

      marker.on("click", () => {
        onSelectRestaurant(restaurant);
      });

      marker.addTo(map);
      markersRef.current[restaurant.id] = marker;

      if (isSelected) {
        // Open popup immediately for selected one
        setTimeout(() => {
          marker.openPopup();
        }, 100);
      }
    });
  }, [restaurants, selectedRestaurant, isLeafletLoaded]);

  // Center on selected restaurant
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRestaurant) return;

    map.setView([selectedRestaurant.lat, selectedRestaurant.lng], 16, {
      animate: true,
      duration: 0.6,
    });

    const marker = markersRef.current[selectedRestaurant.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 300);
    }
  }, [selectedRestaurant]);

  return (
    <div className="relative w-full h-full min-h-[350px]">
      {!isLeafletLoaded && (
        <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">地図データを読み込み中...</p>
        </div>
      )}
      <div id="leaflet-map-element" ref={mapContainerRef} className="w-full h-full rounded-lg shadow-inner" style={{ minHeight: "100%" }} />
    </div>
  );
}
