import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../Component/StaffPagesComponents/ui/button";
import { Input } from "../Component/StaffPagesComponents/ui/input";
import { Label } from "../Component/StaffPagesComponents/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../Component/StaffPagesComponents/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../Component/StaffPagesComponents/ui/select";
import { Badge } from "../Component/StaffPagesComponents/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../Component/StaffPagesComponents/ui/popover";
import {
    ChevronLeft,
    ChevronRight,
    X,
    Phone,
    User,
    CalendarCheck,
    Lock,
    Plus,
    Clock,
    Pencil,
    Loader2,
    RefreshCw,
    Link2,
    Check,
    Mail,
    MessageCircle,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import type { Booking, BookingStatus } from "../data/bookingsData";
import api from "../api/axios";

// ─── API Types ────────────────────────────────────────────────────────────────

interface ApiField {
    id: string;
    name?: string;
    name_ar?: string;
    name_en?: string;
    sport?: { name_ar?: string; name_en?: string };
    sport_id?: number;
    status?: string;
    is_active?: boolean;
}

interface ApiBookableSport {
    sport_id: number;
    sport_name_ar?: string;
    sport_name_en?: string;
    fields: ApiField[];
}

interface ApiCalendarSlot {
    start_time: string; // "HH:mm:ss"
    end_time: string;
    // slot-level status
    status: "available" | "booked" | "training" | "blocked";
    // flat fields returned by the backend calendar API
    booking_id?: string;
    booking_status?: string;        // e.g. "confirmed", "cancelled", "pending_payment"
    member_id?: number | null;
    team_member_id?: number | null;
    training_id?: string;
    // actual booking times (not slot times)
    actual_booking_start?: string;  // "HH:mm:ss" - actual booking start time
    actual_booking_end?: string;    // "HH:mm:ss" - actual booking end time
    // nested booking object (alternative / older API format)
    booking?: {
        id: string;
        status?: string;
        member?: {
            id?: number;
            name_ar?: string;
            full_name?: string;
            member_id?: string;
            phone?: string;
            national_id?: string;
            user_type?: string;
        };
        notes?: string;
    };
}

interface ApiCalendarDay {
    date: string;
    slots: ApiCalendarSlot[];
}

// ─── Helpers: API → Booking shape ────────────────────────────────────────────

function slotToBooking(slot: ApiCalendarSlot, day: ApiCalendarDay, field: ApiField): Booking | null {
    if (slot.status === "available") return null;

    // Use actual booking times if available, otherwise fall back to slot times
    const from = slot.actual_booking_start ? slot.actual_booking_start.slice(0, 5) : slot.start_time.slice(0, 5);
    const to = slot.actual_booking_end ? slot.actual_booking_end.slice(0, 5) : slot.end_time.slice(0, 5);
    const courtName = field.name_ar ?? field.name_en ?? field.name ?? field.id;

    const dateKey = day.date.split("T")[0];

    if (slot.status === "training") {
        return {
            id: slot.training_id ?? `trn-${dateKey}-${from}`,
            courtId: field.id,
            courtName,
            date: dateKey,
            from,
            to,
            status: "blocked",
            isManual: false,
            blockedReason: "حصة تدريبية",
        };
    }

    if (slot.status === "blocked") {
        return {
            id: slot.booking_id ?? `blk-${dateKey}-${from}`,
            courtId: field.id,
            courtName,
            date: dateKey,
            from,
            to,
            status: "blocked",
            isManual: true,
            blockedReason: "محجوب",
        };
    }

    // status === "booked"
    // The API returns flat fields (booking_status, member_id) OR a nested booking object
    const bookingStatus = slot.booking_status ?? slot.booking?.status;
    const b = slot.booking;
    const memberData = b?.member;
    const raw = memberData as Record<string, unknown> | undefined;

    const nameAr =
        (raw?.name_ar as string) ||
        (raw?.full_name as string) ||
        [
            raw?.first_name_ar ?? raw?.first_name_en ?? "",
            raw?.last_name_ar ?? raw?.last_name_en ?? "",
        ].filter(Boolean).join(" ").trim() ||
        "عضو";

    const memberId =
        (raw?.member_id as string) ??
        (raw?.memberid as string) ??
        String(memberData?.id ?? slot.member_id ?? "");

    const phone = (raw?.phone as string) || (raw?.phone_number as string) || "";
    const nationalId = (raw?.national_id as string) || (raw?.nationalid as string) || "";
    const memberType = slot.team_member_id
        ? "team_member"
        : (raw?.user_type === "team_member" ? "team_member" : "member");

    return {
        id: slot.booking_id ?? b?.id ?? `bk-${dateKey}-${from}`,
        courtId: field.id,
        courtName,
        date: dateKey,
        from,
        to,
        status: (bookingStatus === "cancelled" ? "cancelled" : "confirmed") as BookingStatus,
        isManual: false,
        member: (memberData || slot.member_id) ? {
            id: (raw?.id as number) ?? memberData?.id ?? slot.member_id ?? 0,
            nameAr,
            memberId,
            phone,
            nationalId,
            memberType: memberType as "member" | "team_member",
        } : undefined,
    };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_SLOTS: string[] = Array.from({ length: 17 }, (_, i) => {
    const h = 6 + i;
    return `${String(h).padStart(2, "0")}:00`;
});

const TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 36 }, (_, i) => {
    const totalMins = 360 + i * 30;
    const h24 = Math.floor(totalMins / 60);
    const min = totalMins % 60;
    const value = `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const period = h24 < 12 ? "AM" : "PM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const label = `${h12}:${String(min).padStart(2, "0")} ${period}`;
    return { value, label };
});

const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const AR_MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toArabicNumerals(n: number): string {
    return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}

function formatHour(slot: string): string {
    const h = parseInt(slot.split(":")[0], 10);
    const suffix = h < 12 ? "ص" : "م";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${toArabicNumerals(h12)}${suffix}`;
}

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day - 6 + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
    return `${toArabicNumerals(date.getDate())} ${AR_MONTHS[date.getMonth()]}`;
}

function dayOfWeekLabel(date: Date): string {
    return AR_DAYS[date.getDay()];
}

// ─── Conflict Detection ───────────────────────────────────────────────────────

const hasConflict = (
    bookings: Booking[],
    courtId: string,
    date: string,
    from: string,
    to: string,
    excludeId?: string
): boolean => {
    return bookings.some(
        (b) =>
            b.id !== excludeId &&
            b.courtId === courtId &&
            b.date === date &&
            b.status !== "cancelled" &&
            b.from < to &&
            b.to > from
    );
};

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
    if (status === "confirmed")
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">مؤكد</Badge>;
    if (status === "blocked")
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">محجوب</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">ملغي</Badge>;
}

// ─── Mini TimeSlotPicker ─────────────────────────────────────────────────────

function TimeSlotPicker({
    value,
    onChange,
    placeholder,
    minValue,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    minValue?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = TIME_OPTIONS.find((t) => t.value === value);
    const filteredOptions = minValue
        ? TIME_OPTIONS.filter((t) => t.value > minValue)
        : TIME_OPTIONS;

    return (
        <Popover open={open} onOpenChange={setOpen} modal>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-sm w-full
                        ${selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-primary/30 bg-background text-primary hover:bg-primary/10"
                        }`}
                >
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {selected ? selected.label : <span className="opacity-60">{placeholder}</span>}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[17rem] p-4 rounded-2xl" align="start" side="bottom" dir="ltr">
                <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                    {filteredOptions.map((slot) => (
                        <button
                            key={slot.value}
                            type="button"
                            onClick={() => { onChange(slot.value); setOpen(false); }}
                            className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all
                                ${slot.value === value
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-primary/30 bg-background text-primary hover:bg-primary hover:text-primary-foreground"
                                }`}
                        >
                            {slot.label}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-medium text-left">{value}</span>
        </div>
    );
}

// ─── Booking Detail Panel ────────────────────────────────────────────────────

function BookingDetailPanel({
    booking,
    onClose,
    onCancel,
    onUnblock,
    onEdit,
}: {
    booking: Booking;
    onClose: () => void;
    onCancel: (id: string) => void;
    onUnblock: (id: string) => void;
    onEdit: (booking: Booking) => void;
}) {
    const { toast } = useToast();
    const navigate = useNavigate();

    const copyPhone = () => {
        if (booking.member?.phone) {
            void navigator.clipboard.writeText(booking.member.phone);
            toast({ title: "تم النسخ", description: "تم نسخ رقم الهاتف إلى الحافظة" });
        }
    };

    const dateObj = new Date(booking.date);
    const displayDate = `${dayOfWeekLabel(dateObj)} ${formatDisplayDate(dateObj)} ${dateObj.getFullYear()}`;

    const fmtTime = (t: string) => {
        const [hStr] = t.split(":");
        const h = parseInt(hStr, 10);
        const suffix = h < 12 ? "ص" : "م";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${toArabicNumerals(h12)}:٠٠ ${suffix}`;
    };

    return (
        <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-16 bottom-0 left-0 z-40 w-[360px] bg-background border-r border-border shadow-2xl flex flex-col overflow-hidden"
            dir="rtl"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">تفاصيل الحجز</span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="إغلاق لوحة التفاصيل"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Booking Info */}
                <div className="px-5 py-4 space-y-3 border-b border-border">
                    <InfoRow label="الملعب" value={booking.courtName} />
                    <InfoRow label="التاريخ" value={displayDate} />
                    <InfoRow label="الوقت" value={`${fmtTime(booking.from)} — ${fmtTime(booking.to)}`} />
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">الحالة</span>
                        <StatusBadge status={booking.status} />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">النوع</span>
                        <Badge variant="outline" className="text-xs">
                            {booking.isManual ? "يدوي — من الموظف" : "تلقائي — من التطبيق"}
                        </Badge>
                    </div>
                </div>

                {/* Blocked reason */}
                {booking.status === "blocked" && booking.blockedReason && (
                    <div className="px-5 py-4 bg-rose-50 border-b border-rose-200">
                        <p className="text-xs font-semibold text-rose-700 mb-1">سبب الحجب</p>
                        <p className="text-sm text-rose-800">{booking.blockedReason}</p>
                    </div>
                )}

                {/* Member Info */}
                {booking.member ? (
                    <div className="px-5 py-4 space-y-3 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">بيانات العضو</p>
                        <InfoRow label="الاسم" value={booking.member.nameAr} />
                        <InfoRow label="رقم العضو" value={booking.member.memberId} />
                        <InfoRow label="الهاتف" value={booking.member.phone} />
                        <InfoRow label="الرقم القومي" value={`${booking.member.nationalId.slice(0, 6)}...`} />
                        <InfoRow
                            label="نوع العضوية"
                            value={booking.member.memberType === "member" ? "عضو اجتماعي" : "لاعب فريق"}
                        />
                    </div>
                ) : (
                    <div className="px-5 py-4 border-b border-border">
                        <p className="text-sm text-muted-foreground">لا توجد بيانات عضو لهذا الحجز</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-border space-y-2 shrink-0">
                {booking.member && (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={copyPhone}>
                            <Phone className="h-3.5 w-3.5" />
                            تواصل
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5"
                            onClick={() => {
                                // TODO: Navigate to /staff/dashboard/members/manage?id=:memberId
                                navigate("/staff/dashboard/members/manage");
                            }}
                        >
                            <User className="h-3.5 w-3.5" />
                            عرض الملف
                        </Button>
                    </div>
                )}

                {(booking.status === "confirmed" || booking.status === "blocked") && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={() => onEdit(booking)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                    </Button>
                )}

                {booking.status === "confirmed" && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => onCancel(booking.id)}
                    >
                        <X className="h-3.5 w-3.5" />
                        إلغاء الحجز
                    </Button>
                )}

                {booking.status === "blocked" && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white"
                        onClick={() => onUnblock(booking.id)}
                    >
                        <Lock className="h-3.5 w-3.5" />
                        إلغاء الحجب
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Booking Form Dialog (Add & Edit) ────────────────────────────────────────

type BookingForm = {
    courtId: string;
    date: string;
    from: string;
    to: string;
    memberId: string;
    memberName: string;
    phone: string;
    nationalId: string;
    memberType: "member" | "team_member";
};

const emptyBookingForm = (courtId = "", date = "", from = ""): BookingForm => ({
    courtId,
    date,
    from,
    to: "",
    memberId: "",
    memberName: "",
    phone: "",
    nationalId: "",
    memberType: "member",
});

function BookingFormDialog({
    open,
    onOpenChange,
    editBooking,
    defaultCourtId,
    defaultDate,
    defaultFrom,
    bookings,
    courts,
    onSave,
    isSubmitting,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editBooking: Booking | null;
    defaultCourtId: string;
    defaultDate: string;
    defaultFrom: string;
    bookings: Booking[];
    courts: ApiField[];
    onSave: (form: BookingForm) => void;
    isSubmitting?: boolean;
}) {
    const isEdit = editBooking !== null;
    const [form, setForm] = useState<BookingForm>(() =>
        isEdit && editBooking
            ? {
                courtId: editBooking.courtId,
                date: editBooking.date,
                from: editBooking.from,
                to: editBooking.to,
                memberId: editBooking.member?.memberId ?? "",
                memberName: editBooking.member?.nameAr ?? "",
                phone: editBooking.member?.phone ?? "",
                nationalId: editBooking.member?.nationalId ?? "",
                memberType: editBooking.member?.memberType ?? "member",
            }
            : emptyBookingForm(defaultCourtId, defaultDate, defaultFrom)
    );
    const { toast } = useToast();

    const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "notfound">("idle");

    useEffect(() => {
        const numericId = form.memberId.trim().replace(/\D/g, "");
        if (!numericId) { setLookupState("idle"); return; }
        setLookupState("loading");
        const timer = setTimeout(async () => {
            try {
                const endpoint = form.memberType === "team_member"
                    ? `/team-members/${numericId}`
                    : `/members/${numericId}`;
                const res = await api.get<{ success: boolean; data: { first_name_ar?: string; last_name_ar?: string; first_name_en?: string; last_name_en?: string; phone?: string; phone_number?: string; national_id?: string; name_ar?: string; full_name?: string } }>(endpoint);
                const m = res?.data?.data;
                if (m) {
                    const fullName =
                        `${m.first_name_ar ?? m.first_name_en ?? ""} ${m.last_name_ar ?? m.last_name_en ?? ""}`.trim() ||
                        m.name_ar ||
                        m.full_name ||
                        "";
                    setForm(prev => ({
                        ...prev,
                        memberName: fullName || prev.memberName,
                        phone: m.phone ?? m.phone_number ?? prev.phone,
                        nationalId: m.national_id ?? prev.nationalId,
                    }));
                    setLookupState(fullName ? "found" : "notfound");
                } else {
                    setLookupState("notfound");
                }
            } catch {
                setLookupState("notfound");
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.memberId, form.memberType]);

    useEffect(() => {
        if (!open) return;
        setForm(
            isEdit && editBooking
                ? {
                    courtId: editBooking.courtId,
                    date: editBooking.date,
                    from: editBooking.from,
                    to: editBooking.to,
                    memberId: editBooking.member?.memberId ?? "",
                    memberName: editBooking.member?.nameAr ?? "",
                    phone: editBooking.member?.phone ?? "",
                    nationalId: editBooking.member?.nationalId ?? "",
                    memberType: editBooking.member?.memberType ?? "member",
                }
                : emptyBookingForm(defaultCourtId, defaultDate, defaultFrom)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSave = () => {
        if (!form.courtId || !form.date || !form.from || !form.to || !form.memberId || !form.memberName) {
            toast({ title: "بيانات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة.", variant: "destructive" });
            return;
        }
        if (form.from >= form.to) {
            toast({ title: "توقيت خاطئ", description: "وقت النهاية يجب أن يكون بعد وقت البداية.", variant: "destructive" });
            return;
        }
        if (hasConflict(bookings, form.courtId, form.date, form.from, form.to, editBooking?.id)) {
            toast({ title: "تعارض في المواعيد", description: "هذا الوقت محجوز بالفعل.", variant: "destructive" });
            return;
        }
        onSave(form);
    };

    const memberIdEntered = form.memberId.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0" dir="rtl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                    <DialogTitle>{isEdit ? "تعديل الحجز" : "إضافة حجز يدوي"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "عدّل بيانات الحجز ثم اضغط حفظ" : "أدخل بيانات الحجز الجديد"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            تفاصيل الحجز
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>الملعب <span className="text-destructive">*</span></Label>
                                <Select value={form.courtId} onValueChange={(v) => setForm({ ...form, courtId: v })}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="اختر الملعب" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courts.filter(c => c.status === "active" || c.is_active !== false).map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name_ar ?? c.name_en ?? c.name ?? c.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="booking-date">التاريخ <span className="text-destructive">*</span></Label>
                                <Input
                                    id="booking-date"
                                    type="date"
                                    dir="ltr"
                                    className="text-left"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>من الساعة <span className="text-destructive">*</span></Label>
                                <TimeSlotPicker
                                    value={form.from}
                                    onChange={(v) => setForm({ ...form, from: v, to: form.to && form.to <= v ? "" : form.to })}
                                    placeholder="البداية"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>إلى الساعة <span className="text-destructive">*</span></Label>
                                <TimeSlotPicker
                                    value={form.to}
                                    onChange={(v) => setForm({ ...form, to: v })}
                                    placeholder="النهاية"
                                    minValue={form.from}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border" />

                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            بيانات العضو
                        </p>

                        <div className="space-y-1.5 mb-4">
                            <Label htmlFor="booking-member-id">
                                رقم العضو <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="booking-member-id"
                                    dir="ltr"
                                    className="text-left font-mono pr-8"
                                    placeholder="123"
                                    value={form.memberId}
                                    onChange={(e) => {
                                        setLookupState("idle");
                                        setForm({ ...form, memberId: e.target.value, memberName: "", phone: "", nationalId: "" });
                                    }}
                                />
                                {lookupState === "loading" && (
                                    <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                )}
                                {lookupState === "found" && (
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 text-[10px] font-bold">✓</span>
                                )}
                            </div>
                            {lookupState === "notfound" && (
                                <p className="text-[11px] text-destructive">لم يُعثر على عضو بهذا الرقم</p>
                            )}
                            {lookupState === "idle" && !form.memberId.trim() && (
                                <p className="text-[11px] text-muted-foreground">أدخل الرقم النظامي للعضو — ستُملأ البيانات تلقائياً</p>
                            )}
                            {lookupState === "found" && (
                                <p className="text-[11px] text-emerald-600">تم جلب بيانات العضو</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="booking-member-name">
                                    اسم العضو <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="booking-member-name"
                                    placeholder={memberIdEntered ? "الاسم بالعربية" : "—"}
                                    disabled={!memberIdEntered}
                                    value={form.memberName}
                                    onChange={(e) => setForm({ ...form, memberName: e.target.value })}
                                    className={!memberIdEntered ? "bg-muted/50 cursor-not-allowed" : ""}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="booking-phone">رقم الهاتف</Label>
                                <Input
                                    id="booking-phone"
                                    dir="ltr"
                                    className={`text-left ${!memberIdEntered ? "bg-muted/50 cursor-not-allowed" : ""}`}
                                    placeholder={memberIdEntered ? "01012345678" : "—"}
                                    disabled={!memberIdEntered}
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="booking-nid">الرقم القومي</Label>
                                <Input
                                    id="booking-nid"
                                    dir="ltr"
                                    className={`text-left ${!memberIdEntered ? "bg-muted/50 cursor-not-allowed" : ""}`}
                                    placeholder={memberIdEntered ? "30012345678901" : "—"}
                                    maxLength={14}
                                    disabled={!memberIdEntered}
                                    value={form.nationalId}
                                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label>نوع العضو <span className="text-destructive">*</span></Label>
                                <Select
                                    value={form.memberType}
                                    onValueChange={(v) => {
                                        setForm({ ...form, memberType: v as "member" | "team_member", memberName: "", phone: "", nationalId: "" });
                                        setLookupState("idle");
                                    }}
                                    disabled={!memberIdEntered}
                                >
                                    <SelectTrigger className={`w-full ${!memberIdEntered ? "bg-muted/50 opacity-60" : ""}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">عضو اجتماعي</SelectItem>
                                        <SelectItem value="team_member">لاعب فريق</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2 flex-row-reverse sm:justify-start">
                    <Button type="button" onClick={handleSave} className="gap-1.5" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />{isEdit ? "جارٍ الحفظ..." : "جارٍ الإضافة..."}</>
                        ) : (
                            isEdit ? "حفظ التعديلات" : "إضافة الحجز"
                        )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Block Slot Dialog ───────────────────────────────────────────────────────

type BlockForm = {
    courtId: string;
    date: string;
    from: string;
    to: string;
    reason: string;
};

function BlockSlotDialog({
    open,
    onOpenChange,
    defaultCourtId,
    defaultDate,
    defaultFrom,
    bookings,
    courts,
    onSave,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    defaultCourtId: string;
    defaultDate: string;
    defaultFrom: string;
    bookings: Booking[];
    courts: ApiField[];
    onSave: (form: BlockForm) => void;
}) {
    const [form, setForm] = useState<BlockForm>({
        courtId: defaultCourtId,
        date: defaultDate,
        from: defaultFrom,
        to: "",
        reason: "",
    });
    const { toast } = useToast();

    useEffect(() => {
        if (!open) return;
        setForm({ courtId: defaultCourtId, date: defaultDate, from: defaultFrom, to: "", reason: "" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSave = () => {
        if (!form.courtId || !form.date || !form.from || !form.to) {
            toast({ title: "بيانات ناقصة", description: "يرجى تحديد الملعب والتاريخ والوقت.", variant: "destructive" });
            return;
        }
        if (form.from >= form.to) {
            toast({ title: "توقيت خاطئ", description: "وقت النهاية يجب أن يكون بعد وقت البداية.", variant: "destructive" });
            return;
        }
        if (hasConflict(bookings, form.courtId, form.date, form.from, form.to)) {
            toast({ title: "تعارض في المواعيد", description: "هذا الوقت محجوز بالفعل.", variant: "destructive" });
            return;
        }
        onSave(form);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-md" dir="rtl">
                <DialogHeader>
                    <DialogTitle>حجب وقت</DialogTitle>
                    <DialogDescription>سيتم منع الحجوزات في هذا الوقت</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>الملعب</Label>
                        <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/30 text-sm">
                            {courts.find((c) => c.id === form.courtId)?.name_ar ?? courts.find((c) => c.id === form.courtId)?.name_en ?? "—"}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>التاريخ</Label>
                        <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/30 text-sm" dir="ltr">
                            {form.date}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>من</Label>
                        <div className="h-9 px-3 flex items-center rounded-md border border-border bg-muted/30 text-sm" dir="ltr">
                            {form.from}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>إلى <span className="text-destructive">*</span></Label>
                        <TimeSlotPicker value={form.to} onChange={(v) => setForm({ ...form, to: v })} placeholder="وقت النهاية" />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="block-reason">السبب (اختياري)</Label>
                        <Input
                            id="block-reason"
                            placeholder='مثال: "صيانة", "بطولة داخلية"'
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 flex-row-reverse sm:justify-start">
                    <Button onClick={handleSave} className="gap-1">
                        <Lock className="h-3.5 w-3.5" /> حجب الوقت
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Share Booking Dialog ───────────────────────────────────────────────────

function ShareBookingDialog({
    open,
    onOpenChange,
    shareUrl,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    shareUrl: string;
}) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        void navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const shareButtons = [
        {
            label: "واتساب",
            icon: <MessageCircle className="h-5 w-5" />,
            color: "text-green-600 border-green-200 hover:bg-green-50",
            action: () => window.open(`https://wa.me/?text=${encodeURIComponent("رابط الحجز ")}${encodeURIComponent(shareUrl)}`, "_blank"),
        },
        {
            label: copied ? "تم ✓" : "نسخ الرابط",
            icon: copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />,
            color: copied ? "text-emerald-600 border-emerald-300 hover:bg-emerald-50" : "text-slate-600 border-slate-200 hover:bg-slate-50",
            action: copyToClipboard,
        },
        {
            label: "تويتر",
            icon: <span className="text-base font-black leading-none">𝕏</span>,
            color: "text-slate-800 border-slate-200 hover:bg-slate-50",
            action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("رابط الحجز")}`, "_blank"),
        },
        {
            label: "بريد",
            icon: <Mail className="h-5 w-5" />,
            color: "text-blue-600 border-blue-200 hover:bg-blue-50",
            action: () => window.open(`mailto:?subject=${encodeURIComponent("رابط الحجز")}&body=${encodeURIComponent(shareUrl)}`, "_blank"),
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader className="text-center items-center pb-1 shrink-0">
                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
                        <Check className="h-6 w-6 text-emerald-600" />
                    </div>
                    <DialogTitle className="text-base">تمت الإضافة بنجاح ✓</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        شارك رابط الدعوة مع اللاعبين
                    </DialogDescription>
                </DialogHeader>

                {/* Share buttons */}
                <div className="flex justify-center gap-5 py-3">
                    {shareButtons.map((btn) => (
                        <button
                            key={btn.label}
                            type="button"
                            onClick={btn.action}
                            className={`flex flex-col items-center gap-1.5 group`}
                        >
                            <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors ${btn.color}`}>
                                {btn.icon}
                            </span>
                            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                                {btn.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Link box */}
                {shareUrl && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 mb-2">
                        <p className="flex-1 truncate text-[11px] text-muted-foreground font-mono" title={shareUrl} dir="ltr">
                            {shareUrl}
                        </p>
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${copied
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                }`}
                        >
                            {copied ? "تم ✓" : "نسخ"}
                        </button>
                    </div>
                )}

                <DialogFooter className="pt-1 shrink-0">
                    <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                        إغلاق
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourtBookingsPage() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [courts, setCourts] = useState<ApiField[]>([]);
    const [courtsLoading, setCourtsLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(false);

    const [selectedCourtId, setSelectedCourtId] = useState<string>("");
    const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today));
    const [bookings, setBookings] = useState<Booking[]>([]);

    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editBooking, setEditBooking] = useState<Booking | null>(null);
    const [isAddingBooking, setIsAddingBooking] = useState(false);

    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [blockDefaults, setBlockDefaults] = useState({ courtId: "", date: "", from: "" });

    const [cellPopover, setCellPopover] = useState<{ date: string; slot: string } | null>(null);

    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [pendingShareUrl, setPendingShareUrl] = useState<string | null>(null);

    const { toast } = useToast();

    // ── Fetch courts ──────────────────────────────────────────────────────────

    const fetchCourts = useCallback(async () => {
        setCourtsLoading(true);
        try {
            const res = await api.get<{ success: boolean; data: ApiBookableSport[] }>("/members/bookings/sports");
            const sports = Array.isArray(res?.data?.data) ? res.data.data : [];
            const allFields = sports.flatMap((sport) =>
                Array.isArray(sport.fields) ? sport.fields.map(f => ({ ...f, sport_id: sport.sport_id })) : []
            );
            const uniqueFields = Array.from(
                new Map(allFields.filter((field) => field?.id).map((field) => [field.id, field])).values()
            );
            setCourts(uniqueFields);
            setSelectedCourtId((prev) => {
                const newId = prev && uniqueFields.some((field) => field.id === prev) ? prev : (uniqueFields[0]?.id ?? "");
                return newId;
            });
            if (uniqueFields.length === 0) {
                setBookings([]);
            }
        } catch {
            toast({ title: "تعذر تحميل الملاعب", variant: "destructive" });
        } finally {
            setCourtsLoading(false);
        }
    }, [toast]);

    useEffect(() => { void fetchCourts(); }, [fetchCourts]);

    // ── Fetch calendar ────────────────────────────────────────────────────────

    const fetchCalendar = useCallback(async () => {
        if (!selectedCourtId) return;
        setCalendarLoading(true);
        const weekDaysLocal = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const start = toISODate(weekDaysLocal[0]);
        const end = toISODate(weekDaysLocal[6]);
        const field = courts.find(c => c.id === selectedCourtId);
        try {
            const res = await api.get<{ success: boolean; data: { days: ApiCalendarDay[] } }>(
                `/members/bookings/fields/${selectedCourtId}/calendar`,
                { params: { start_date: start, end_date: end } }
            );
            const days: ApiCalendarDay[] = res?.data?.data?.days ?? [];
            const raw: Booking[] = [];
            for (const day of days) {
                for (const slot of day.slots) {
                    const b = field ? slotToBooking(slot, day, field) : null;
                    if (b) raw.push(b);
                }
            }

            // Merge consecutive slots with the same id into one block
            // BUT: If actual_booking_start/end are provided, use those (don't merge)
            const mergeMap = new Map<string, Booking>();
            for (const b of raw) {
                const existing = mergeMap.get(b.id);
                if (!existing) {
                    mergeMap.set(b.id, { ...b });
                }
            }
            const finalBookings = Array.from(mergeMap.values());
            setBookings(finalBookings);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '';
            if (!msg.toLowerCase().includes('not available')) {
                console.warn('[CourtBookings] calendar fetch failed:', msg);
            }
            setBookings([]);
        } finally {
            setCalendarLoading(false);
        }
    }, [selectedCourtId, weekStart, courts]);


    useEffect(() => { void fetchCalendar(); }, [fetchCalendar]);

    // ─── Derived ──────────────────────────────────────────────────────────────

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const selectedCourt = courts.find((c) => c.id === selectedCourtId);
    const selectedCourtName = selectedCourt?.name_ar ?? selectedCourt?.name_en ?? selectedCourt?.name ?? "";
    const weekLabel = weekDays.length > 0
        ? `${formatDisplayDate(weekDays[0])} — ${formatDisplayDate(weekDays[6])} ${weekDays[6].getFullYear()}`
        : "";

    const filteredBookings = bookings.filter((b) => {
        // Compare date strings directly to avoid timezone issues
        const bookingDate = b.date; // Already in "YYYY-MM-DD" format
        const weekStartDate = toISODate(weekStart);
        const weekEndDate = toISODate(weekDays[6]);
        return b.courtId === selectedCourtId && bookingDate >= weekStartDate && bookingDate <= weekEndDate;
    });


    const courtsBySport: Record<string, ApiField[]> = {};
    for (const c of courts) {
        const sportLabel = c.sport?.name_ar ?? c.sport?.name_en ?? "أخرى";
        if (!courtsBySport[sportLabel]) courtsBySport[sportLabel] = [];
        courtsBySport[sportLabel].push(c);
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    /** Cancel confirmed booking → DELETE /api/bookings/:bookingId */
    const handleCancelBooking = async (id: string) => {
        const booking = bookings.find(b => b.id === id);
        if (booking?.status === "cancelled") {
            toast({ title: "الحجز ملغي بالفعل", variant: "destructive" });
            setActiveBooking(null);
            return;
        }
        // Optimistic update first
        setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" as BookingStatus } : b));
        setActiveBooking(null);
        try {
            await api.delete(`/bookings/${id}`, { data: { reason: "إلغاء من الموظف" } });
            toast({ title: "تم الإلغاء", description: "تم إلغاء الحجز بنجاح" });
            void fetchCalendar();
        } catch (err: unknown) {
            const e = err as { status?: number; message?: string; responseData?: { error?: string; message?: string } };
            const msg = e?.responseData?.error || e?.responseData?.message || e?.message || "فشل إلغاء الحجز";
            toast({ title: "فشل إلغاء الحجز", description: msg, variant: "destructive" });
        }
    };

    /** Unblock slot → DELETE /api/bookings/:bookingId */
    const handleUnblock = async (id: string) => {
        // Optimistic removal first
        setBookings((prev) => prev.filter((b) => b.id !== id));
        setActiveBooking(null);
        try {
            await api.delete(`/bookings/${id}`, { data: { reason: "إلغاء الحجب من الموظف" } });
            toast({ title: "تم إلغاء الحجب", description: "الوقت متاح الآن للحجز" });
            void fetchCalendar();
        } catch (err: unknown) {
            const e = err as { status?: number; message?: string; responseData?: { error?: string; message?: string } };
            const msg = e?.responseData?.error || e?.responseData?.message || e?.message || "فشل إلغاء الحجب";
            toast({ title: "فشل إلغاء الحجب", description: msg, variant: "destructive" });
        }
    };

    /** Add new manual booking → POST /api/bookings → auto-confirm → register participant */
    const handleAddBooking = async (form: BookingForm) => {
        setIsAddingBooking(true);
        const courtObj = courts.find((c) => c.id === form.courtId);
        const normalizedMemberId = form.memberId
            .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
            .replace(/\D/g, "");
        const memberIdNum = Number(normalizedMemberId);

        if (!Number.isFinite(memberIdNum) || memberIdNum <= 0) {
            toast({ title: "رقم العضو غير صالح", description: "يرجى إدخال رقم عضو صحيح.", variant: "destructive" });
            return;
        }
        if (!courtObj?.sport_id) {
            toast({ title: "بيانات غير مكتملة", description: "لا يمكن تحديد النشاط لهذا الملعب.", variant: "destructive" });
            return;
        }

        const payload = {
            userType: form.memberType,
            userId: memberIdNum,
            sport_id: courtObj.sport_id,
            field_id: form.courtId,
            start_time: `${form.date}T${form.from}:00`,
            end_time: `${form.date}T${form.to}:00`,
            notes: "حجز يدوي من الموظف",
        };

        try {
            // Step 1: Create the booking
            const res = await api.post<{ success: boolean; data: { id?: string; share_token?: string; share_url?: string } }>("/bookings", payload);
            const bookingId = res?.data?.data?.id;
            const shareToken = res?.data?.data?.share_token;

            // Step 2: Auto-confirm so it shows on calendar (bypass payment for staff)
            if (bookingId) {
                try {
                    await api.post(`/bookings/${bookingId}/confirm-payment`, { paymentReference: "STAFF_MANUAL" });
                } catch (confirmErr) {
                    console.error("Failed to confirm booking:", confirmErr);
                }
            }

            // NOTE: No need to register the creator manually.
            // The backend already auto-adds them as is_creator=true in createBooking().
            // The share link is for OTHER people to join, not for re-registering the booker.

            // Navigate the calendar to show the newly created booking
            if (form.courtId !== selectedCourtId) {
                setSelectedCourtId(form.courtId);
            }
            const bookedDate = new Date(form.date);
            bookedDate.setHours(0, 0, 0, 0);
            setWeekStart(getWeekStart(bookedDate));

            void fetchCalendar();
            setAddDialogOpen(false);
            setEditBooking(null);
            // Build the correct invite URL pointing to InvitationPage (/invite/:token)
            const shareUrl = shareToken ? `${window.location.origin}/invite/${shareToken}` : null;
            if (shareUrl) {
                setPendingShareUrl(shareUrl);
                setShareDialogOpen(true);
            } else {
                toast({ title: "تمت الإضافة", description: `تم إضافة حجز "${form.memberName}" بنجاح.` });
            }
        } catch (err: unknown) {
            const e = err as { status?: number; message?: string; responseData?: { error?: string; message?: string } };
            const msg = e?.responseData?.error || e?.responseData?.message || e?.message || "فشل إنشاء الحجز";
            toast({ title: "فشل إنشاء الحجز", description: msg, variant: "destructive" });
        } finally {
            setIsAddingBooking(false);
        }
    };


    /** Edit booking → cancel original + POST new → auto-confirm → register participant */
    const handleEditBooking = async (form: BookingForm) => {
        if (!editBooking) return;
        const courtObj = courts.find((c) => c.id === form.courtId);
        if (!courtObj?.sport_id) {
            toast({ title: "بيانات غير مكتملة", description: "لا يمكن تحديد النشاط لهذا الملعب.", variant: "destructive" });
            return;
        }
        const normalizedMemberId = form.memberId
            .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
            .replace(/\D/g, "");
        const memberIdNum = Number(normalizedMemberId);
        if (!Number.isFinite(memberIdNum) || memberIdNum <= 0) {
            toast({ title: "رقم العضو غير صالح", description: "يرجى إدخال رقم عضو صحيح.", variant: "destructive" });
            return;
        }
        try {
            // Cancel old booking
            if (editBooking.status !== "cancelled") {
                await api.delete(`/bookings/${editBooking.id}`, { data: { reason: "تعديل الحجز من الموظف" } });
            }
            // Create replacement booking
            const res = await api.post<{ success: boolean; data: { id?: string; share_token?: string } }>("/bookings", {
                userType: form.memberType,
                userId: memberIdNum,
                sport_id: courtObj.sport_id,
                field_id: form.courtId,
                start_time: `${form.date}T${form.from}:00`,
                end_time: `${form.date}T${form.to}:00`,
                notes: "تعديل يدوي من الموظف",
            });
            const newBookingId = res?.data?.data?.id;
            const shareToken = res?.data?.data?.share_token;

            // Auto-confirm the replacement booking
            if (newBookingId) {
                try {
                    await api.post(`/bookings/${newBookingId}/confirm-payment`, { paymentReference: "STAFF_MANUAL" });
                } catch {
                    console.warn("[CourtBookings] Could not auto-confirm edited booking", newBookingId);
                }
            }

            // Register updated member info
            if (shareToken && form.memberName) {
                try {
                    await api.post(`/bookings/share/${shareToken}/register`, {
                        full_name: form.memberName,
                        phone_number: form.phone || undefined,
                        national_id: form.nationalId || undefined,
                    });
                } catch {
                    console.warn("[CourtBookings] Could not register participant info for edited booking");
                }
            }

            toast({ title: "تم التحديث", description: "تم تحديث بيانات الحجز بنجاح." });
            void fetchCalendar();
            setActiveBooking(null);
            setEditBooking(null);
            setAddDialogOpen(false);
        } catch (err: unknown) {
            const e = err as { status?: number; message?: string; responseData?: { error?: string; message?: string } };
            const msg = e?.responseData?.error || e?.responseData?.message || e?.message || "فشل تحديث الحجز";
            toast({ title: "فشل تحديث الحجز", description: msg, variant: "destructive" });
        }
    };

    /** Block slot → POST /api/bookings (workaround until dedicated endpoint) */
    const handleBlockSlot = async (form: BlockForm) => {
        // TODO: Replace with dedicated admin block endpoint when available
        const courtObj = courts.find((c) => c.id === form.courtId);
        if (!courtObj?.sport_id) {
            toast({ title: "بيانات غير مكتملة", description: "لا يمكن تحديد النشاط لهذا الملعب.", variant: "destructive" });
            return;
        }
        const courtName = courtObj?.name_ar ?? courtObj?.name_en ?? courtObj?.name ?? "";
        // Optimistic local add as fallback
        const tempId = crypto.randomUUID();
        const newBlock: Booking = {
            id: tempId,
            courtId: form.courtId,
            courtName,
            date: form.date,
            from: form.from,
            to: form.to,
            status: "blocked",
            isManual: true,
            blockedReason: form.reason || undefined,
        };
        setBookings((prev) => [...prev, newBlock]);
        setBlockDialogOpen(false);
        try {
            await api.post("/bookings", {
                userType: "member",
                userId: 1, // sentinel admin userId — replace with actual staff ID when available
                sport_id: courtObj.sport_id,
                field_id: form.courtId,
                start_time: `${form.date}T${form.from}:00`,
                end_time: `${form.date}T${form.to}:00`,
                notes: form.reason || "حجب إداري",
            });
            toast({ title: "تم الحجب", description: "تم حجب الوقت بنجاح." });
            void fetchCalendar();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "فشل حجب الوقت";
            toast({ title: "فشل حجب الوقت", description: msg, variant: "destructive" });
            // Keep optimistic block in local state as fallback
        }
    };

    const openEditFromPanel = (booking: Booking) => {
        setActiveBooking(null);
        setEditBooking(booking);
        setAddDialogOpen(true);
    };

    const goWeekBack = () => setWeekStart((prev) => addDays(prev, -7));
    const goWeekForward = () => setWeekStart((prev) => addDays(prev, 7));
    const goToday = () => setWeekStart(getWeekStart(today));
    const isCurrentWeek = toISODate(weekStart) === toISODate(getWeekStart(today));
    const todayIso = toISODate(today);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="h-full overflow-y-auto p-4 pb-8 space-y-4" dir="rtl">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold leading-tight">إدارة حجوزات الملاعب</h1>
                    <p className="text-xs text-muted-foreground mt-1 font-normal flex items-center gap-1.5">
                        {courtsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : selectedCourtName}
                        {!courtsLoading && <span className="mx-1.5 text-border">|</span>}
                        {weekLabel}
                        {calendarLoading && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                    </p>
                </div>
                <Button
                    type="button"
                    className="gap-2 shrink-0 shadow-sm px-4"
                    onClick={() => { setEditBooking(null); setAddDialogOpen(true); }}
                    aria-label="إضافة حجز يدوي جديد"
                >
                    <Plus className="h-4 w-4" />
                    إضافة حجز يدوي
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <Select value={selectedCourtId} onValueChange={setSelectedCourtId} disabled={courtsLoading}>
                    <SelectTrigger className="w-52" aria-label="اختيار الملعب">
                        <SelectValue placeholder={courtsLoading ? "جاري التحميل..." : "اختر الملعب"} />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(courtsBySport).map(([sport, sportCourts]) => (
                            <div key={sport}>
                                <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                    {sport}
                                </p>
                                {sportCourts.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="pr-4">
                                        {c.name_ar ?? c.name_en ?? c.name ?? c.id}
                                        {c.status === "inactive" && <span className="text-muted-foreground text-[10px] mr-1">(معطّل)</span>}
                                    </SelectItem>
                                ))}
                            </div>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => void fetchCalendar()} disabled={calendarLoading || !selectedCourtId} className="gap-1">
                    <RefreshCw className={`h-3.5 w-3.5 ${calendarLoading ? "animate-spin" : ""}`} />
                    تحديث
                </Button>

                <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={goWeekBack}
                        className="p-2.5 hover:bg-muted transition-colors"
                        aria-label="الانتقال إلى الأسبوع السابق"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm font-medium whitespace-nowrap border-x border-border">{weekLabel}</span>
                    <button
                        type="button"
                        onClick={goWeekForward}
                        className="p-2.5 hover:bg-muted transition-colors"
                        aria-label="الانتقال إلى الأسبوع التالي"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                </div>

                {!isCurrentWeek && (
                    <Button type="button" variant="outline" size="sm" onClick={goToday} aria-label="الانتقال إلى الأسبوع الحالي">اليوم</Button>
                )}
            </div>

            {/* Legend */}
            <div className="inline-flex items-center gap-5 rounded-md border border-border bg-muted/30 px-3 py-1.5">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-500" />مؤكد
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block w-3 h-3 rounded-sm bg-rose-400 border border-rose-500" />محجوب
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block w-3 h-3 rounded-sm bg-muted border border-border" />متاح
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block w-3 h-3 rounded-sm bg-muted/40 border border-dashed border-border opacity-50" />ملغي
                </span>
            </div>

            {/* Booking Grid (CSS grid + absolute blocks) */}
            <div className="overflow-x-auto overflow-y-auto max-h-[75vh] rounded-xl border border-border shadow-sm">
                {/* Day header row */}
                <div
                    className="sticky top-0 z-20 grid bg-muted/60 border-b border-border"
                    style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minWidth: 700 }}
                >
                    {/* Corner */}
                    <div className="sticky right-0 z-30 bg-muted/60 border-l border-border" />
                    {weekDays.map((day) => {
                        const isToday = toISODate(day) === todayIso;
                        const isPast = day < today;
                        return (
                            <div
                                key={toISODate(day)}
                                className={`py-2 px-1 text-center text-xs font-semibold border-l border-border ${
                                    isToday
                                        ? "bg-primary/15 text-primary border-b-primary/40"
                                        : isPast
                                            ? "opacity-40 bg-muted/20 text-foreground"
                                            : "text-foreground"
                                }`}
                            >
                                <div>{dayOfWeekLabel(day)}</div>
                                <div className={`text-[10px] font-normal mt-0.5 ${isToday ? "text-primary font-medium" : "text-muted-foreground"
                                    }`}>
                                    {toArabicNumerals(day.getDate())} {AR_MONTHS[day.getMonth()]}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Grid body */}
                <div
                    className="grid"
                    style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minWidth: 700 }}
                >
                    {/* Time label column */}
                    <div className="sticky right-0 z-10 bg-muted/20 border-l border-border">
                        {HOUR_SLOTS.map((slot) => (
                            <div
                                key={slot}
                                className="flex items-start justify-center pt-1 border-b border-border text-[10px] text-muted-foreground font-medium"
                                style={{ height: 64 }}
                            >
                                {formatHour(slot)}
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => {
                        const dateStr = toISODate(day);
                        const isToday = dateStr === todayIso;
                        const isPast = day < today;
                        const dayBookings = filteredBookings.filter(b => b.date === dateStr);

                        return (
                            <div
                                key={dateStr}
                                className={`relative border-l border-border ${
                                    isPast
                                        ? "bg-muted/30 opacity-60"
                                        : isToday
                                            ? "bg-primary/[0.06]"
                                            : ""
                                }`}
                                style={{ height: HOUR_SLOTS.length * 64 }}
                            >
                                {/* Hour grid lines */}
                                {HOUR_SLOTS.map((slot, idx) => (
                                    <div
                                        key={slot}
                                        className="absolute w-full border-b border-border"
                                        style={{ top: idx * 64, height: 64 }}
                                    />
                                ))}

                                {/* Empty-cell click targets (behind booking blocks) */}
                                {HOUR_SLOTS.map((slot) => {
                                    const [slotH, slotM] = slot.split(":").map(Number);
                                    const startMins = (slotH * 60 + slotM) - (6 * 60);
                                    const isCellOpen = cellPopover?.date === dateStr && cellPopover?.slot === slot;

                                    if (isPast) {
                                        return (
                                            <div
                                                key={slot}
                                                className="absolute w-full cursor-not-allowed"
                                                style={{ top: (startMins / 60) * 64, height: 64, zIndex: 0 }}
                                            />
                                        );
                                    }

                                    return (
                                        <Popover
                                            key={slot}
                                            open={isCellOpen}
                                            onOpenChange={(v) => setCellPopover(v ? { date: dateStr, slot } : null)}
                                        >
                                            <PopoverTrigger asChild>
                                                <div
                                                    className="absolute w-full group hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                                    style={{ top: (startMins / 60) * 64, height: 64, zIndex: 0 }}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`خانة متاحة — ${dayOfWeekLabel(day)} ${slot}`}
                                                >
                                                    <span className="text-[9px] text-primary/60 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                                                        متاح
                                                    </span>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-44 p-2" dir="rtl" side="bottom" align="end">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted text-right transition-colors w-full"
                                                        onClick={() => {
                                                            setCellPopover(null);
                                                            setEditBooking(null);
                                                            setBlockDefaults({ courtId: selectedCourtId, date: dateStr, from: slot });
                                                            setAddDialogOpen(true);
                                                        }}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        إضافة حجز
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 text-right transition-colors w-full"
                                                        onClick={() => {
                                                            setCellPopover(null);
                                                            setBlockDefaults({ courtId: selectedCourtId, date: dateStr, from: slot });
                                                            setBlockDialogOpen(true);
                                                        }}
                                                    >
                                                        <Lock className="h-3.5 w-3.5" />
                                                        حجب الوقت
                                                    </button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                })}

                                {/* Booking blocks (above empty cells) */}
                                {dayBookings.map((booking) => {
                                    const [fh, fm] = booking.from.split(":").map(Number);
                                    const [th, tm] = booking.to.split(":").map(Number);
                                    const startMins = (fh * 60 + fm) - (6 * 60);
                                    const endMins = (th * 60 + tm) - (6 * 60);
                                    const top = (startMins / 60) * 64;
                                    const height = Math.max(((endMins - startMins) / 60) * 64, 32);

                                    if (booking.status === "confirmed") {
                                        return (
                                            <button
                                                key={booking.id}
                                                type="button"
                                                onClick={isPast ? undefined : () => setActiveBooking(booking)}
                                                aria-label={`حجز مؤكد — ${booking.member?.nameAr ?? "حجز مؤكد"}`}
                                                className={`absolute rounded-lg bg-emerald-100 border border-emerald-300 transition-colors p-2 overflow-hidden text-right w-[calc(100%-8px)] ${
                                                    isPast ? "cursor-not-allowed" : "hover:bg-emerald-200 cursor-pointer"
                                                }`}
                                                style={{ top: top + 2, height: height - 4, left: 4, right: 4, zIndex: 10 }}
                                            >
                                                <p className="text-[11px] font-semibold text-emerald-800 truncate leading-tight">
                                                    {booking.member?.nameAr ?? "حجز مؤكد"}
                                                </p>
                                                <p className="text-[10px] text-emerald-600 leading-tight">{booking.from} - {booking.to}</p>
                                                {booking.isManual && (
                                                    <span className="text-[8px] bg-emerald-200 text-emerald-700 rounded px-1">يدوي</span>
                                                )}
                                            </button>
                                        );
                                    }
                                    if (booking.status === "blocked") {
                                        return (
                                            <button
                                                key={booking.id}
                                                type="button"
                                                onClick={isPast ? undefined : () => setActiveBooking(booking)}
                                                aria-label="وقت محجوب"
                                                className={`absolute rounded-lg bg-rose-100 border border-rose-300 transition-colors flex flex-col items-center justify-center gap-1 w-[calc(100%-8px)] ${
                                                    isPast ? "cursor-not-allowed" : "hover:bg-rose-200 cursor-pointer"
                                                }`}
                                                style={{ top: top + 2, height: height - 4, left: 4, right: 4, zIndex: 10 }}
                                            >
                                                <Lock className="h-3 w-3 text-rose-600" />
                                                <span className="text-[10px] font-semibold text-rose-700">محجوب</span>
                                            </button>
                                        );
                                    }
                                    // cancelled
                                    return (
                                        <button
                                            key={booking.id}
                                            type="button"
                                            onClick={isPast ? undefined : () => setActiveBooking(booking)}
                                            aria-label="حجز ملغي"
                                            className={`absolute rounded-lg bg-muted/40 border border-dashed border-border flex items-center justify-center opacity-50 w-[calc(100%-8px)] ${
                                                isPast ? "cursor-not-allowed" : ""
                                            }`}
                                            style={{ top: top + 2, height: height - 4, left: 4, right: 4, zIndex: 10 }}
                                        >
                                            <span className="text-[10px] text-muted-foreground line-through">ملغي</span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail Panel */}
            <AnimatePresence>
                {activeBooking && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
                            onClick={() => setActiveBooking(null)}
                        />
                        <BookingDetailPanel
                            booking={activeBooking}
                            onClose={() => setActiveBooking(null)}
                            onCancel={handleCancelBooking}
                            onUnblock={handleUnblock}
                            onEdit={openEditFromPanel}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Add / Edit Dialog */}
            <BookingFormDialog
                open={addDialogOpen}
                onOpenChange={(v) => { setAddDialogOpen(v); if (!v) setEditBooking(null); }}
                editBooking={editBooking}
                defaultCourtId={editBooking ? editBooking.courtId : (blockDefaults.courtId || selectedCourtId)}
                defaultDate={editBooking ? editBooking.date : blockDefaults.date}
                defaultFrom={editBooking ? editBooking.from : blockDefaults.from}
                bookings={bookings}
                courts={courts}
                onSave={editBooking ? (form => void handleEditBooking(form)) : (form => void handleAddBooking(form))}
                isSubmitting={isAddingBooking}
            />

            {/* Block Dialog */}
            <BlockSlotDialog
                open={blockDialogOpen}
                onOpenChange={setBlockDialogOpen}
                defaultCourtId={blockDefaults.courtId || selectedCourtId}
                defaultDate={blockDefaults.date}
                defaultFrom={blockDefaults.from}
                bookings={bookings}
                courts={courts}
                onSave={(form) => void handleBlockSlot(form)}
            />

            {/* Share Booking Dialog */}
            <ShareBookingDialog
                open={shareDialogOpen}
                onOpenChange={setShareDialogOpen}
                shareUrl={pendingShareUrl ?? ""}
            />
        </div>
    );
}