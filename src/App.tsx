import { useState, useMemo, useEffect } from "react";
import { RESTAURANTS, CATEGORIES, Restaurant } from "./data";
import LeafletMap from "./components/LeafletMap";
import cuponLogo from "./assets/cupon_fujimin.webp";
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  Compass,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Areas list for filtering (Dynamically extracted to cover every single district including "大原", "北", etc.)
const AREAS = [
  "すべて",
  ...Array.from(new Set(RESTAURANTS.map((r) => r.area).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ja")
  ),
];

const MALLS = [
  "イオンタウンふじみ野",
  "トナリエふじみ野",
  "ココネ上福岡",
  "ビバモール埼玉大井",
  "ピアシティふじみ野",
  "イオン大井店"
];

export default function App() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [selectedArea, setSelectedArea] = useState("すべて");
  const [selectedCouponType, setSelectedCouponType] = useState<"all" | "both" | "a_only">("all");
  const [selectedMall, setSelectedMall] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const restaurantsWithOverrides = RESTAURANTS;

  // Compute store counts for each shopping mall
  const mallCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MALLS.forEach((mall) => {
      counts[mall] = restaurantsWithOverrides.filter((r) => r.mall === mall).length;
    });
    return counts;
  }, [restaurantsWithOverrides]);

  // Keep selected restaurant coordinates updated
  const currentSelectedRestaurant = useMemo(() => {
    if (!selectedRestaurant) return null;
    return restaurantsWithOverrides.find(r => r.id === selectedRestaurant.id) || selectedRestaurant;
  }, [selectedRestaurant, restaurantsWithOverrides]);

  // Filter restaurants based on search, category, area, and shopping mall
  const filteredRestaurants = useMemo(() => {
    return restaurantsWithOverrides.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.menu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.mall && r.mall.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.subCategory && r.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory =
        selectedCategory === "すべて" || r.category === selectedCategory;

      const matchesArea =
        selectedArea === "すべて" || r.area === selectedArea;

      const rCouponType = r.couponType || "both";
      const matchesCouponType =
        selectedCouponType === "all" ||
        (selectedCouponType === "both" && rCouponType !== "none" && rCouponType !== "a_only") ||
        (selectedCouponType === "a_only" && rCouponType === "a_only");

      const matchesMall = !selectedMall || r.mall === selectedMall;

      return matchesSearch && matchesCategory && matchesArea && matchesCouponType && matchesMall;
    });
  }, [restaurantsWithOverrides, searchQuery, selectedCategory, selectedArea, selectedCouponType, selectedMall]);

  // Count restaurants per category for badge display
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { すべて: restaurantsWithOverrides.length };
    CATEGORIES.forEach(cat => {
      if (cat !== "すべて") {
        counts[cat] = restaurantsWithOverrides.filter(r => r.category === cat).length;
      }
    });
    return counts;
  }, [restaurantsWithOverrides]);

  // Handle restaurant card selection
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    // On mobile, automatically collapse sidebar to focus on the map
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 shadow-sm z-20 justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={cuponLogo}
            alt="ふじみ野市消費活性化クーポンロゴ"
            className="w-10 h-10 object-contain shrink-0 rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('header-logo-fallback');
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div id="header-logo-fallback" className="hidden w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-base shrink-0">
            🎫
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-800 tracking-tight">
              ふじみ野市消費活性化クーポン検索マップ（令和8年度版）
            </h1>
            <p className="hidden md:block text-[9px] text-slate-500 font-medium">
              加盟店舗 {RESTAURANTS.length}ヶ所
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Sidebar Panel */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={isMobile ? { x: "-100%", opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { width: "320px", opacity: 1 }}
              exit={isMobile ? { x: "-100%", opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute md:relative top-0 left-0 h-full w-full md:w-80 bg-white border-r border-slate-200 flex flex-col z-[1050] md:z-10 flex-shrink-0 shadow-md"
            >
              {/* Mobile-only Header with clear Close Button */}
              <div className="md:hidden px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-extrabold text-slate-700">加盟店舗 検索・絞り込み</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-xs text-white bg-slate-950 hover:bg-slate-900 font-bold flex items-center gap-1.5 px-3 py-2 border border-slate-950 rounded shadow-sm transition-all duration-150 active:scale-95"
                >
                  <span className="text-[10px]">◀︎</span>
                  <span>メニューを閉じる</span>
                </button>
              </div>

              {/* Search & Filters block */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2.5 flex-shrink-0">
                {/* Search query input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="店名、住所、飲食ジャンル(カフェ等)で検索..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Area dropdown */}
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    地区でさがす
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coupon Type Filter Segment */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                    クーポン利用区分
                  </label>
                  <div className="grid grid-cols-3 gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedCouponType("all")}
                      className={`py-1 text-[10px] font-bold rounded transition-all duration-150 ${
                        selectedCouponType === "all"
                          ? "bg-white text-slate-800 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      すべて
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCouponType("both")}
                      className={`py-1 text-[10px] font-bold rounded transition-all duration-150 ${
                        selectedCouponType === "both"
                          ? "bg-white text-emerald-700 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="A券とB券の両方が使えます"
                    >
                      A・B券
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCouponType("a_only")}
                      className={`py-1 text-[10px] font-bold rounded transition-all duration-150 ${
                        selectedCouponType === "a_only"
                          ? "bg-white text-green-700 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="A券のみが使えます"
                    >
                      A券のみ
                    </button>
                  </div>
                </div>

                {/* Shopping Malls Section */}
                <div className="space-y-1.5 pt-0.5">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block flex justify-between items-center">
                    <span>🏢 ショッピングモールから探す</span>
                    {selectedMall && (
                      <button
                        onClick={() => setSelectedMall(null)}
                        className="text-[9px] text-blue-600 hover:underline font-bold"
                      >
                        クリア
                      </button>
                    )}
                  </label>
                  <div className="grid grid-cols-2 gap-1 max-h-[110px] overflow-y-auto pr-1">
                    {MALLS.map((mall) => {
                      const isSelected = selectedMall === mall;
                      const count = mallCounts[mall] || 0;
                      return (
                        <button
                          key={mall}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMall(null);
                            } else {
                              setSelectedMall(mall);
                              setSelectedArea("すべて");
                              setSelectedCategory("すべて");
                              setSearchQuery("");
                            }
                          }}
                          className={`py-1 px-1.5 rounded text-[10px] font-bold text-left border transition-all duration-150 flex items-center justify-between ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white font-extrabold shadow-sm"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <span className="truncate mr-1">{mall}</span>
                          <span className={`text-[8px] px-1 py-0.2 rounded-full font-extrabold shrink-0 ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filter statistics strip */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <p className="uppercase tracking-wider">
                    検索結果: <strong className="text-slate-800">{filteredRestaurants.length}</strong> 件
                  </p>
                  {(searchQuery || selectedCategory !== "すべて" || selectedArea !== "すべて" || selectedCouponType !== "all" || selectedMall) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("すべて");
                        setSelectedArea("すべて");
                        setSelectedCouponType("all");
                        setSelectedMall(null);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                    >
                      条件クリア
                    </button>
                  )}
                </div>
              </div>

              {/* Horizontal scroll Categories for quick filtering */}
              <div className="px-3 py-1.5 bg-slate-50/20 border-b border-slate-100 flex gap-1 overflow-x-auto scrollbar-none flex-shrink-0">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap transition font-semibold ${
                        isSelected
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Store List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
                {filteredRestaurants.length > 0 ? (
                  filteredRestaurants.map((restaurant) => {
                    const isSelected = selectedRestaurant?.id === restaurant.id;
                    return (
                      <div
                        key={restaurant.id}
                        onClick={() => handleSelectRestaurant(restaurant)}
                        className={`p-3.5 border-b border-slate-100 hover:bg-slate-50/50 transition cursor-pointer flex flex-col gap-1 ${
                          isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : ""
                        }`}
                        id={`restaurant-card-${restaurant.id}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-bold text-slate-900 text-xs leading-tight">
                            {restaurant.name}
                          </h3>
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {restaurant.subCategory || restaurant.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>{restaurant.address}</span>
                        </p>
                        
                        <div className="text-[10px] text-slate-600 bg-slate-100/55 p-1.5 rounded border border-slate-100/30 font-medium italic mt-0.5 line-clamp-2">
                          {restaurant.menu}
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-2 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {restaurant.couponType === "a_only" ? (
                                <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] font-extrabold rounded border border-green-200">A券のみ 利用可</span>
                              ) : (
                                <>
                                  <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] font-extrabold rounded border border-green-200">A券 利用可</span>
                                  <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[9px] font-extrabold rounded border border-orange-200">B券 利用可</span>
                                </>
                              )}
                            </div>
                            <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5">
                              位置を表示
                              <ChevronRight className="h-2.5 w-2.5" />
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 mt-0.5">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + " " + restaurant.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1 px-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold text-center border border-blue-200/50 transition-all duration-150 flex items-center justify-center gap-1"
                            >
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              Googleマップ
                            </a>
                            <a
                              href={`https://maps.apple.com/?q=${encodeURIComponent(restaurant.name + " " + restaurant.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1 px-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 text-[9px] font-bold text-center border border-slate-200/50 transition-all duration-150 flex items-center justify-center gap-1"
                            >
                              <Compass className="h-2.5 w-2.5 shrink-0" />
                              Appleマップ
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <AlertTriangle className="h-6 w-6 mx-auto text-slate-300 animate-pulse" />
                    <p className="text-xs font-semibold">店舗が見つかりません</p>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar Toggle Tab Button (Desktop Only) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-100 border-r border-t border-b border-slate-200 shadow-sm p-1.5 rounded-r z-30 transition focus:outline-none hidden md:block"
          style={{ transform: isSidebarOpen ? "translateX(320px) translateY(-50%)" : "translateX(0) translateY(-50%)", transition: "transform 0.2s ease-in-out" }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
        </button>

        {/* Map Container Area */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-100">
          <LeafletMap
            restaurants={filteredRestaurants}
            selectedRestaurant={currentSelectedRestaurant}
            onSelectRestaurant={handleSelectRestaurant}
          />

          {/* Quick Stats Overlay (Floating on Map) */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200 text-[11px] text-slate-700 z-[400] max-w-[190px] hidden sm:block">
            <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              現在の表示範囲
            </h4>
            <p className="mb-0.5">登録ヶ所: <strong className="text-slate-900">{filteredRestaurants.length}ヶ所</strong></p>
            <p className="mb-1">加盟店舗: <strong className="text-slate-900">{filteredRestaurants.length}店舗</strong></p>
            <p className="text-[9px] text-slate-500 leading-normal border-t border-slate-100 pt-1 mt-1 font-medium">
              ※ クーポンが利用可能な加盟店舗・ショッピングモールを地図上に表示しています。
            </p>
          </div>

          {/* Floating toggle for Mobile Sidebar (Only visible when sidebar is closed, positioned to clear Leaflet logo) */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden absolute bottom-14 right-5 bg-slate-950 text-white hover:bg-slate-900 px-4 py-2.5 rounded-full shadow-lg z-[400] transition active:scale-95 flex items-center gap-2 text-xs font-bold"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>メニューを開く</span>
            </button>
          )}
        </main>
      </div>

      {/* High-density Footer */}
      <footer className="h-8 bg-slate-800 flex items-center justify-center px-4 text-[10px] text-slate-400 shrink-0 z-20">
        <div>ふじみ野市消費活性化クーポン検索マップ（令和8年度版）</div>
      </footer>
    </div>
  );
}
