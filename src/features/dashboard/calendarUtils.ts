import { DS } from "./DesignSystem";
import type { SessionEvent } from "./types";

export const DAY_NAMES_SHORT = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"];
export const MONTH_NAMES_AR = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// All sports now coming from backend. Mock config removed.

export const STATUS_COLORS: Record<SessionEvent["status"], { bg: string; text: string; border: string }> = {
    "حضور": { bg: DS.colors.successLight, text: DS.colors.success, border: DS.colors.success + "40" },
    "غياب": { bg: DS.colors.errorLight, text: DS.colors.error, border: DS.colors.error + "40" },
    "قادم": { bg: DS.colors.primaryLight, text: DS.colors.primary, border: DS.colors.primary + "40" },
};

/**
 * Calculates the effective end date for a subscription.
 * Strictly enforces that a subscription is limited to the calendar month of its start date.
 */
export function getEffectiveEndDate(startDate: string | Date | undefined | null, _endDate?: string | Date | undefined | null): Date | null {
    if (!startDate || startDate === "-") return null;
    const sDate = new Date(startDate);
    if (isNaN(sDate.getTime())) return null;

    // Strict 1-Month policy: Enforce the end of the SAME calendar month as the start date
    // (e.g., if joins March 10, end date is March 31)
    return new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0);
}

export function buildMonthEvents(year: number, month: number, sports?: any[], bookings?: any[]): Map<string, SessionEvent[]> {
    const map = new Map<string, SessionEvent[]>();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // If no sports provided, return empty map
    const config = sports || [];

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dow = date.getDay();
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const evts: SessionEvent[] = [];

        // Regular Sports sessions
        config.forEach(cfg => {
            if (cfg.status !== "نشط") return;

            // Date filtering: enforce strict 1-month range
            const rawStart = cfg.startDate || cfg.start_date;

            const checkDate = new Date(year, month, d);
            checkDate.setHours(0, 0, 0, 0);

            const sDateRaw = (rawStart && rawStart !== "-") ? new Date(rawStart) : (cfg.createdAt || cfg.created_at ? new Date(cfg.createdAt || cfg.created_at) : null);

            // If no date and not active, hide. 
            // If active but no date at all, default to "this month" to avoid disappearing.
            if (!sDateRaw || isNaN(sDateRaw.getTime())) {
                if (cfg.status === "نشط") {
                    // Fallback: use first day of current VIEWED month if looking at this month, or current date's month
                    const now = new Date();
                    if (now.getFullYear() === year && now.getMonth() === month) {
                        // We are looking at current month, allow it to show
                    } else {
                        return; // Don't show in other months if no start date
                    }
                } else {
                    return;
                }
            }

            // Enforce that "Month" means ONLY the calendar month in which it started.
            let sDate, eDate;
            if (sDateRaw && !isNaN(sDateRaw.getTime())) {
                sDate = new Date(sDateRaw.getFullYear(), sDateRaw.getMonth(), 1);
                eDate = new Date(sDateRaw.getFullYear(), sDateRaw.getMonth() + 1, 0);
            } else {
                sDate = new Date(year, month, 1);
                eDate = new Date(year, month + 1, 0);
            }

            sDate.setHours(0, 0, 0, 0);
            eDate.setHours(23, 59, 59, 999);

            if (checkDate < sDate || checkDate > eDate) return;

            const sid = cfg.id || cfg.sportId;
            const weekdays = cfg.weekdays || [];
            if (weekdays.length > 0 && !weekdays.includes(dow)) return;

            let status: SessionEvent["status"] = "قادم";

            // If the date is in the past, default to "Absent" if no record exists
            if (checkDate < today) {
                status = "غياب";
            }

            if (cfg.records && Array.isArray(cfg.records)) {
                const record = cfg.records.find((r: any) => {
                    const rDate = new Date(r.date);
                    return rDate.getFullYear() === year &&
                        rDate.getMonth() === month &&
                        rDate.getDate() === d;
                });
                if (record) {
                    status = record.attended ? "حضور" : "غياب";
                }
            }

            evts.push({
                sportId: sid,
                name: cfg.name,
                icon: cfg.icon || "🏅",
                color: cfg.color || "#1E6FB9",
                time: cfg.time || cfg.nextTime || "-",
                court: cfg.court || "-",
                status
            });
        });

        // Confirmed Bookings (from localStorage)
        if (bookings && Array.isArray(bookings)) {
            bookings.forEach(b => {
                if (b.date === key) {
                    const checkDate = new Date(year, month, d);
                    checkDate.setHours(0, 0, 0, 0);

                    // If it's in the past and no attendance data exists, don't call it "قادم"
                    const bookingStatus: SessionEvent["status"] = checkDate < today ? "غياب" : "قادم";

                    evts.push({
                        sportId: `booking-${b.id}`,
                        name: `حجز: ${b.court}`,
                        icon: "🏟️",
                        color: "#F59E0B", // Orange for bookings
                        time: b.time || "-",
                        court: b.court || "-",
                        status: bookingStatus,
                        price: Number(b.price || b.total_price || 0)
                    });
                }
            });
        }

        if (evts.length) map.set(key, evts);
    }
    return map;
}
