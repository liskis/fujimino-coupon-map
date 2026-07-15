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
  ChevronRight,
  QrCode,
  Share2,
  Copy,
  Check
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = "https://liskis.github.io/fujimino-coupon-map/";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.getElementById("share-url-input") as HTMLInputElement;
      if (input) {
        input.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy link", err);
        }
      }
    });
  };

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
          <div className="flex flex-col items-center shrink-0">
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
            <span className="text-[10px] md:text-[11px] font-extrabold text-slate-600 mt-0.5 leading-none shrink-0">ふじみ野市</span>
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
              消費活性化クーポン検索マップ2026
            </h1>
            <p className="hidden md:block text-xs text-slate-500 font-bold">
              加盟店舗 {RESTAURANTS.length}ヶ所
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-200 transition active:scale-95 cursor-pointer shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>友達に教える</span>
          </button>
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
                <span className="text-sm font-extrabold text-slate-700">加盟店舗 検索・絞り込み</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="bg-slate-950 text-white hover:bg-slate-900 px-4 py-2.5 rounded-full shadow-lg transition active:scale-95 flex items-center gap-2 text-xs font-bold"
                >
                  <span className="text-xs">◀︎</span>
                  <span>地図を表示</span>
                </button>
              </div>

              {/* Search & Filters block */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2.5 flex-shrink-0">
                {/* Search query input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="店名、住所、飲食ジャンル(カフェ等)で検索..."
                    className="w-full pl-9 pr-7 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-sm font-semibold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Area dropdown */}
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <label className="text-sm font-bold text-slate-700 shrink-0">
                    地区でさがす
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-40 text-sm bg-white border border-slate-200 rounded py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
                  >
                    {AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coupon Type Filter Segment */}
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <label className="text-sm font-bold text-slate-700 shrink-0">
                    クーポン利用区分
                  </label>
                  <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 text-center text-xs font-bold w-40 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedCouponType("all")}
                      className={`flex-1 py-1 rounded transition-all duration-150 ${
                        selectedCouponType === "all"
                          ? "bg-white text-slate-800 shadow-xs font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      すべて
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCouponType("both")}
                      className={`flex-1 py-1 rounded transition-all duration-150 ${
                        selectedCouponType === "both"
                          ? "bg-white text-emerald-700 shadow-xs font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="A券とB券の両方が使えます"
                    >
                      共通券
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCouponType("a_only")}
                      className={`flex-1 py-1 rounded transition-all duration-150 ${
                        selectedCouponType === "a_only"
                          ? "bg-white text-green-700 shadow-xs font-extrabold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      title="A券のみが使えます"
                    >
                      Aのみ
                    </button>
                  </div>
                </div>

                {/* Shopping Malls Section */}
                <div className="flex items-center justify-between gap-2 py-0.5">
                  <label className="text-sm font-bold text-slate-700 shrink-0">
                    ショッピングモール
                  </label>
                  <select
                    value={selectedMall || "選択しない"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "選択しない") {
                        setSelectedMall(null);
                      } else {
                        setSelectedMall(val);
                        setSelectedArea("すべて");
                        setSelectedCategory("すべて");
                        setSearchQuery("");
                      }
                    }}
                    className="w-40 text-sm bg-white border border-slate-200 rounded py-1 px-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
                  >
                    <option value="選択しない">選択しない</option>
                    {MALLS.map((mall) => (
                      <option key={mall} value={mall}>
                        {mall}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Horizontal scroll Categories for quick filtering */}
              <div className="px-3 py-1.5 bg-slate-50/20 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded border whitespace-nowrap transition font-bold ${
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

              {/* Filter statistics strip - Moved under Categories */}
              <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm text-slate-500 font-bold flex-shrink-0 shadow-xs">
                <p className="tracking-wider">
                  検索結果: <span className="text-slate-900 font-extrabold text-base">{filteredRestaurants.length}</span> 件
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
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline text-xs"
                  >
                    条件クリア
                  </button>
                )}
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
                        className={`p-3.5 border-b border-slate-100 hover:bg-slate-50/50 transition cursor-pointer flex flex-col gap-1.5 ${
                          isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : ""
                        }`}
                        id={`restaurant-card-${restaurant.id}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight">
                            {restaurant.name}
                          </h3>
                          <span className="text-[10px] md:text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {restaurant.subCategory || restaurant.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{restaurant.address}</span>
                        </p>
                        
                        <div className="text-xs md:text-sm text-slate-600 bg-slate-100/55 p-2 rounded border border-slate-200/30 font-medium italic mt-1 line-clamp-2">
                          {restaurant.menu}
                        </div>
                        
                        <div className="flex flex-col gap-2.5 mt-2.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {restaurant.couponType === "a_only" ? (
                                <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] md:text-xs font-extrabold rounded border border-green-200">A券のみ 利用可</span>
                              ) : (
                                <>
                                  <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] md:text-xs font-extrabold rounded border border-green-200">A券 利用可</span>
                                  <span className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] md:text-xs font-extrabold rounded border border-orange-200">B券 利用可</span>
                                </>
                              )}
                            </div>
                            <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                              位置を表示
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + " " + restaurant.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1.5 px-2 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold text-center border border-blue-200/50 transition-all duration-150 flex items-center justify-center gap-1"
                            >
                              <MapPin className="h-3 w-3 shrink-0" />
                              Googleマップ
                            </a>
                            <a
                              href={`https://maps.apple.com/?q=${encodeURIComponent(restaurant.name + " " + restaurant.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="py-1.5 px-2 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold text-center border border-slate-200/50 transition-all duration-150 flex items-center justify-center gap-1"
                            >
                              <Compass className="h-3 w-3 shrink-0" />
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
                    <p className="text-sm font-semibold">店舗が見つかりません</p>
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
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-3.5 rounded-lg shadow-md border border-slate-200 text-xs text-slate-700 z-[400] max-w-[210px] hidden sm:block">
            <h4 className="font-extrabold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              現在の表示範囲
            </h4>
            <p className="mb-0.5">登録ヶ所: <strong className="text-slate-900">{filteredRestaurants.length}ヶ所</strong></p>
            <p className="mb-1">加盟店舗: <strong className="text-slate-900">{filteredRestaurants.length}店舗</strong></p>
            <p className="text-[10px] text-slate-500 leading-normal border-t border-slate-100 pt-1.5 mt-1.5 font-medium">
              ※ クーポンが利用可能な加盟店舗・ショッピングモールを地図上に表示しています。
            </p>
          </div>

          {/* Floating toggle for Mobile Sidebar (Only visible when sidebar is closed, positioned in the top-right corner) */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden absolute top-3 right-3 bg-slate-950 text-white hover:bg-slate-900 px-4 py-2.5 rounded-full shadow-lg z-[1020] transition active:scale-95 flex items-center gap-2 text-xs font-bold"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>リストを表示</span>
            </button>
          )}
        </main>
      </div>

      {/* High-density Footer */}
      <footer className="h-8 bg-slate-800 flex items-center justify-center px-4 text-xs text-slate-400 shrink-0 z-20">
        <div>ふじみ野市消費活性化クーポン検索マップ2026 ※2026/7/2現在</div>
      </footer>

      {/* Share/QR Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 max-w-sm w-full space-y-5 text-center relative z-10"
            >
              {/* Close button */}
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg p-1 transition cursor-pointer"
                aria-label="閉じる"
              >
                ✕
              </button>
              
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-slate-800 flex items-center justify-center gap-1.5">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  お友達に教える / 共有
                </h2>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  QRコードをスマートフォンで読み取るか、<br />URLをコピーしてお友達に共有できます。
                </p>
              </div>
              
              {/* QR Image */}
              <div className="bg-slate-50 p-4 rounded-xl inline-block border border-slate-200/60 shadow-inner">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fliskis.github.io%2Ffujimino-coupon-map%2F"
                  alt="ふじみ野市消費活性化クーポン検索マップ2026 QRコード"
                  className="w-40 h-40 mx-auto object-contain rounded"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              
              {/* Copy Container */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                  <input
                    id="share-url-input"
                    type="text"
                    readOnly
                    value="https://liskis.github.io/fujimino-coupon-map/"
                    className="flex-1 bg-transparent border-none text-xs font-mono text-slate-600 focus:outline-none px-2 text-center"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>コピー済</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>コピー</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold">
                ふじみ野市消費活性化クーポン検索マップ2026
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
