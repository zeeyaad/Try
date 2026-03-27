import React from "react";

// ─── Props Interface ────────────────────────────────────────────────────────
export interface SportCardProps {
    /** Arabic display title of the sport */
    title: string;
    /** URL of the sport cover image */
    image: string;
    /** Training days, e.g. "السبت - الثلاثاء - الخميس" */
    days: string;
    /** Training time range, e.g. "11:00 - 13:00" */
    time: string;
    /** Court / location name */
    location: string;
    /** Monthly price in EGP */
    price: number;
    /** Whether the user has already joined this sport */
    joined?: boolean;
    /** Optional click handler for the join button */
    onJoin?: () => void;
    /** Current status label, e.g. "نشط", "قيد الانتظار", "منتهي" */
    status?: string;
    /** Subscription end date ISO string, e.g. "2026-03-10" */
    endDate?: string;
    /** Callback when user clicks the Rejoin button */
    onRejoin?: () => void;
}

// ─── Helper: Format number as Arabic locale price ───────────────────────────
const formatPrice = (n: number) =>
    n.toLocaleString("ar-EG");

// ─── Helper: Is today on or past the end date? ──────────────────────────────
const isExpiredOrToday = (endDate?: string): boolean => {
    if (!endDate || endDate === "-") return false;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today >= end;
};

// ─── Helper: Days remaining until end date ──────────────────────────────────
const daysUntilExpiry = (endDate?: string): number | null => {
    if (!endDate || endDate === "-") return null;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

// ─── SportCard Component ────────────────────────────────────────────────────
const SportCard: React.FC<SportCardProps> = ({
    title,
    image,
    days,
    time,
    location,
    price,
    joined = false,
    onJoin,
    status = "نشط",
    endDate,
    onRejoin,
}) => {
    const expiredOrToday = isExpiredOrToday(endDate);
    const daysLeft = daysUntilExpiry(endDate);
    const expiresVerySOon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

    return (
        <div
            dir="rtl"
            className="
                w-full bg-white rounded-2xl shadow-md overflow-hidden
                transition-all duration-300 ease-out
                hover:-translate-y-1 hover:shadow-xl
                border border-gray-100
            "
        >
            {/* ── Image Section ── */}
            <div className="relative h-48 overflow-hidden">
                <img
                    src={image}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={384}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80";
                    }}
                />

                {/* Gradient overlay: bottom → top */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Sport title + trophy — bottom-right */}
                <div className="absolute bottom-3 right-4 flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <span className="text-white text-lg font-extrabold drop-shadow-md leading-tight">
                        {title}
                    </span>
                </div>

                {/* JOINED / Expiry badge — top-left */}
                {(joined || status === "نشط") && (
                    <span
                        className={`
                            absolute top-3 left-3
                            text-white text-xs font-bold
                            px-3 py-1 rounded-full shadow-md
                            flex items-center gap-1
                            ${expiredOrToday ? "bg-orange-500" : expiresVerySOon ? "bg-yellow-500" : "bg-green-500"}
                        `}
                    >
                        {expiredOrToday ? "⏰ إنتهى اليوم" : expiresVerySOon ? `⚠️ ينتهي خلال ${daysLeft} أيام` : "✓ JOINED"}
                    </span>
                )}
            </div>

            {/* ── Card Body ── */}
            <div className="p-5 space-y-4">

                {/* ── Expiry Warning Banner ── */}
                {expiresVerySOon && !expiredOrToday && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <p className="text-xs font-semibold text-yellow-700">
                            {daysLeft === 0 ? "ينتهي اشتراكك اليوم!" : `ينتهي اشتراكك خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}. جدد الاشتراك الآن.`}
                        </p>
                    </div>
                )}

                {expiredOrToday && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <span className="text-lg">🔔</span>
                        <p className="text-xs font-semibold text-orange-700">
                            انتهى اشتراكك. أعد الانضمام للاستمرار في التدريب.
                        </p>
                    </div>
                )}

                {/* A) Training Schedule */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2.5">
                    <p className="text-sm font-bold text-blue-700 flex items-center gap-1.5">
                        <span>🗓</span>
                        <span>مواعيد التدريب</span>
                    </p>

                    {/* Days */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-base">📅</span>
                        <span className="font-medium">{days}</span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-base">⏰</span>
                        <span className="font-medium">{time}</span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-base">📍</span>
                        <span className="font-medium">{location}</span>
                    </div>
                </div>

                {/* B) End Date + Monthly Price row */}
                <div className="grid grid-cols-2 gap-2">
                    {/* End Date */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                        <span className="text-[11px] text-gray-400 font-medium">تاريخ الانتهاء</span>
                        <span className={`text-sm font-bold ${expiredOrToday ? "text-orange-600" : expiresVerySOon ? "text-yellow-600" : "text-gray-700"}`}>
                            {endDate && endDate !== "-" ? new Date(endDate).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "غير محدد"}
                        </span>
                    </div>

                    {/* Monthly Price */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <span>💰</span>
                            <span>التكلفة الشهرية</span>
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-amber-500">
                                {price > 0 ? formatPrice(price) : "—"}
                            </span>
                            {price > 0 && <span className="text-[10px] text-gray-400 font-medium">ج.م</span>}
                        </div>
                    </div>
                </div>

                {/* C) Action Button based on Status */}
                {expiredOrToday ? (
                    <button
                        onClick={onRejoin}
                        className="
                            w-full py-3 rounded-xl text-sm font-bold text-white
                            bg-gradient-to-l from-orange-400 to-red-400
                            hover:from-orange-500 hover:to-red-500
                            active:scale-95
                            transition-all duration-200
                            shadow-md hover:shadow-lg
                            flex items-center justify-center gap-2
                        "
                    >
                        <span>🔄</span>
                        <span>إعادة الانضمام</span>
                    </button>
                ) : expiresVerySOon && (joined || status === "نشط") ? (
                    <button
                        onClick={onRejoin}
                        className="
                            w-full py-3 rounded-xl text-sm font-bold text-white
                            bg-gradient-to-l from-yellow-500 to-amber-500
                            hover:from-yellow-600 hover:to-amber-600
                            active:scale-95
                            transition-all duration-200
                            shadow-md hover:shadow-lg
                            flex items-center justify-center gap-2
                        "
                    >
                        <span>🔄</span>
                        <span>تجديد الاشتراك</span>
                    </button>
                ) : status === "منتهي" ? (
                    <button
                        disabled
                        className="w-full py-3 rounded-xl text-sm font-bold bg-red-50 text-red-700 border border-red-100 flex items-center justify-center gap-2 cursor-default"
                    >
                        <span>❌</span>
                        <span>الاشتراك منتهي</span>
                    </button>
                ) : status === "قيد الانتظار" ? (
                    <button
                        disabled
                        className="w-full py-3 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center gap-2 cursor-default"
                    >
                        <span>⏳</span>
                        <span>قيد المراجعة</span>
                    </button>
                ) : joined || status === "نشط" ? (
                    <button
                        disabled
                        className="
                            w-full py-3 rounded-xl text-sm font-bold
                            bg-green-100 text-green-700 border border-green-200
                            flex items-center justify-center gap-2
                            cursor-default
                        "
                    >
                        <span>✓</span>
                        <span>منضم بالفعل</span>
                    </button>
                ) : (
                    <button
                        onClick={onJoin}
                        className="
                            w-full py-3 rounded-xl text-sm font-bold text-white
                            bg-gradient-to-l from-amber-400 to-orange-400
                            hover:from-amber-500 hover:to-orange-500
                            active:scale-95
                            transition-all duration-200
                            shadow-md hover:shadow-lg
                            flex items-center justify-center gap-2
                        "
                    >
                        <span>الانضمام الآن</span>
                        <span>🏅</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default SportCard;
