import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import bookingService from "../services/bookingService";
import { CheckCircle, Copy } from "lucide-react";

interface TeamMemberSubscriptionApi {
    id?: number | string;
    subscription_id?: number | string;
    team_id?: string;
    status?: string;
    subscription_status?: string;
    payment_reference?: string | null;
    payment_completed_at?: string | null;
    price?: number | string;
}

interface LastPaidSportCache {
    name: string;
    amount: number;
    teamId?: string;
    paidAt: number;
}

const TeamMemberSportPaymentPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [processing, setProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [shareUrl, setShareUrl] = useState<string>("");

    const paymentData = useMemo(() => {
        const type = searchParams.get("type") || "subscription";
        const subscriptionId = Number(searchParams.get("subscriptionId") || 0);
        const bookingId = searchParams.get("bookingId") || "";
        const paymentReference = searchParams.get("paymentReference") || "PAY-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        const amountStr = searchParams.get("amount");
        const amount = amountStr && Number(amountStr) > 0 ? Number(amountStr) : 0;
        const currency = searchParams.get("currency") || "EGP";
        const sportName = searchParams.get("sportName") || "Sport";
        const slotTime = searchParams.get("slotTime") || searchParams.get("time") || "-";
        const slotDays = searchParams.get("slotDays") || searchParams.get("date") || "-";
        const court = searchParams.get("court") || searchParams.get("courtName") || "-";
        const slotId = searchParams.get("slotId") || "";
        const teamId = searchParams.get("teamId") || "";

        const raw = {
            type,
            subscriptionId,
            bookingId,
            paymentReference,
            amount,
            currency,
            sportName,
            slotTime,
            slotDays,
            court,
            teamId,
            slotId,
        } as const;

        const isBooking =
            raw.type === "booking" ||
            (!!raw.bookingId && !(raw.subscriptionId > 0));

        return {
            ...raw,
            isBooking,
            isValid: isBooking ? !!raw.bookingId : (raw.subscriptionId > 0 || !!raw.teamId || !!raw.slotId),
        };
    }, [searchParams]);

    const loadTeamMemberSubscriptions = async () => {
        if (!user?.team_member_id) return [] as TeamMemberSubscriptionApi[];
        const parseRaw = (payload: unknown) => {
            const source = payload as {
                data?: { subscriptions?: unknown[] } | unknown[];
                subscriptions?: unknown[];
            };
            if (Array.isArray((source.data as { subscriptions?: unknown[] } | undefined)?.subscriptions)) {
                return (source.data as { subscriptions: unknown[] }).subscriptions;
            }
            if (Array.isArray(source.data)) {
                return source.data;
            }
            if (Array.isArray(source.subscriptions)) {
                return source.subscriptions;
            }
            return [];
        };
        try {
            const res = await api.get(`/team-member-subscriptions/${user.team_member_id}/subscriptions`);
            return parseRaw(res.data) as TeamMemberSubscriptionApi[];
        } catch {
            const fallback = await api.get(`/team-members/${user.team_member_id}/subscriptions`);
            return parseRaw(fallback.data) as TeamMemberSubscriptionApi[];
        }
    };

    const resolvePaymentData = async () => {
        let resolvedSubscriptionId = paymentData.subscriptionId;
        let resolvedPaymentReference = paymentData.paymentReference;
        let resolvedAmount = paymentData.amount;
        let resolvedCurrency = paymentData.currency;

        if (user?.team_member_id && (paymentData.teamId || paymentData.slotId)) {
            try {
                const subscriptions = await loadTeamMemberSubscriptions();
                const candidates = paymentData.teamId
                    ? subscriptions.filter((s) => String(s.team_id || "") === String(paymentData.teamId))
                    : subscriptions;

                const pendingCandidate =
                    candidates.find((s) => String(s.subscription_status || "").toLowerCase() === "pending_payment") ||
                    candidates[0];

                if (pendingCandidate) {
                    const candidateSubscriptionId = Number(pendingCandidate.subscription_id || pendingCandidate.id || 0);
                    if (!resolvedSubscriptionId || candidateSubscriptionId > 0) {
                        resolvedSubscriptionId = candidateSubscriptionId;
                    }
                    if (!resolvedPaymentReference) {
                        resolvedPaymentReference = String(pendingCandidate.payment_reference || "");
                    }
                    if (resolvedAmount <= 0) {
                        resolvedAmount = Number(pendingCandidate.price || 0);
                    }
                }
            } catch {
                // Keep URL values and try subscribe fallback below.
            }
        }

        if (
            user?.team_member_id &&
            (paymentData.teamId || paymentData.slotId) &&
            (!resolvedSubscriptionId || !resolvedPaymentReference || resolvedAmount <= 0)
        ) {
            const subscribeRes = await api.post("/team-member-subscriptions/subscribe", {
                ...(paymentData.slotId ? { schedule_id: paymentData.slotId } : { team_id: paymentData.teamId }),
                team_member_id: user.team_member_id,
            });

            const subscribePayload = subscribeRes?.data || {};
            const subscriptionData = subscribePayload.data || {};
            const payment = subscribePayload.payment || {};

            resolvedSubscriptionId = Number(
                subscriptionData.id || subscriptionData.subscription_id || resolvedSubscriptionId || 0
            );
            resolvedPaymentReference = String(
                payment.reference || subscriptionData.payment_reference || resolvedPaymentReference || ""
            );
            resolvedAmount = Number(payment.amount ?? subscriptionData.price ?? resolvedAmount ?? 0);
            resolvedCurrency = String(payment.currency || resolvedCurrency || "EGP");
        }

        return {
            subscriptionId: resolvedSubscriptionId,
            paymentReference: resolvedPaymentReference,
            amount: resolvedAmount,
            currency: resolvedCurrency,
        };
    };

    const confirmPaymentRequest = async (
        subscriptionId: number,
        payload: {
            payment_reference?: string;
            transaction_id: string;
            payment_method: string;
            gateway_response: string;
        }
    ) => {
        try {
            return await api.post(
                `/team-member-subscriptions/subscriptions/${subscriptionId}/confirm-payment`,
                payload
            );
        } catch (error: unknown) {
            const err = error as {
                status?: number;
                original?: { response?: { status?: number } };
            };
            const maybe404 =
                err?.status === 404 ||
                (err?.original as { response?: { status?: number } } | undefined)?.response?.status === 404;
            if (!maybe404) {
                throw error;
            }

            return await api.post(
                `/team-members/subscriptions/${subscriptionId}/confirm-payment`,
                payload
            );
        }
    };

    const handleBack = () => {
        navigate("/team-member/dashboard");
    };

    const handleCopyLink = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl).catch(() => undefined);
        const btn = document.getElementById("team-copy-btn");
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = "✅ تم النسخ";
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        }
    };

    const persistLastPaidSport = (args: { sportName: string; amount: number; teamId?: string }) => {
        const payload: LastPaidSportCache = {
            name: args.sportName || "رياضة",
            amount: Number(args.amount) || 0,
            teamId: args.teamId,
            paidAt: Date.now(),
        };
        sessionStorage.setItem("tm_last_paid_sport", JSON.stringify(payload));
    };

    const handlePayNow = async () => {
        if (!paymentData.isValid) {
            setErrorMessage("بيانات الدفع غير مكتملة. برجاء إعادة المحاولة.");
            return;
        }

        setProcessing(true);
        setErrorMessage(null);

        try {
            if (paymentData.isBooking) {
                if (!paymentData.bookingId) throw new Error("رقم الحجز مفقود");
                const booking = await bookingService.confirmPayment(paymentData.bookingId, paymentData.paymentReference);
                // Save confirmed booking to localStorage so calendar shows it
                try {
                    const userId = user?.member_id || user?.team_member_id;
                    if (userId) {
                        const storageKey = `confirmed_bookings_${userId}`;
                        const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
                        existing.push({
                            id: paymentData.bookingId,
                            date: paymentData.slotDays,  // YYYY-MM-DD
                            time: paymentData.slotTime,
                            court: paymentData.court,
                            confirmedAt: Date.now(),
                        });
                        localStorage.setItem(storageKey, JSON.stringify(existing));
                    }
                } catch { /* silent */ }

                const origin = window.location.origin;

                let token = booking?.share_token;

                if (!token && paymentData.bookingId) {
                    try {
                        const details = await bookingService.getBookingDetails(paymentData.bookingId);
                        token = details?.share_token;
                    } catch {
                        // ignore, we'll just show modal without link
                    }
                }

                if (token) {
                    setShareUrl(`${origin}/bookings/share/${token}`);
                } else {
                    setShareUrl("");
                }

                setSuccessMessage("✅ تم تأكيد الحجز والدفع بنجاح.");
                setShowSuccessModal(true);
            } else {
                const resolved = await resolvePaymentData();
                if (!resolved.subscriptionId) {
                    setErrorMessage("Could not resolve your subscription. Please re-join the sport first.");
                    return;
                }

                const confirmPayload = {
                    ...(resolved.paymentReference ? { payment_reference: resolved.paymentReference } : {}),
                    transaction_id: `TXN-${resolved.subscriptionId}-${Date.now()}`,
                    payment_method: "credit_card",
                    gateway_response: "team_member_payment_page",
                };

                await confirmPaymentRequest(resolved.subscriptionId, confirmPayload);

                persistLastPaidSport({
                    sportName: paymentData.sportName,
                    amount: resolved.amount,
                    teamId: paymentData.teamId || undefined,
                });
                setSuccessMessage("Payment completed successfully. Your sport is now active.");
                setTimeout(() => {
                    navigate("/team-member/dashboard", { replace: true });
                }, 1500);
            }
        } catch (error: any) {
            console.error("Payment error:", error);
            setErrorMessage(
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "فشل إتمام الدفع"
            );
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-4">
            <div dir="rtl" className="w-full max-w-[520px] bg-white border border-ds-border rounded-2xl shadow-ds-card p-6">
                <h1 className="text-2xl font-black text-ds-text-primary mb-2">صفحة الدفع</h1>
                <p className="text-sm text-ds-text-secondary mb-6">
                    {paymentData.isBooking
                        ? "اكمل الدفع لتأكيد حجز الملعب."
                        : "اكمل الدفع اولاً. بعد الدفع سيتم تفعيل الاشتراك مباشرة."}
                </p>

                {!paymentData.isValid ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-5">
                        بيانات الدفع غير مكتملة. ارجع واختر الموعد مرة اخرى.
                    </div>
                ) : null}

                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-text-secondary">الرياضة</span>
                        <span className="font-bold text-ds-text-primary">{paymentData.sportName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-text-secondary">الوقت</span>
                        <span className="font-bold text-ds-text-primary">{paymentData.slotTime}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-text-secondary">الايام</span>
                        <span className="font-bold text-ds-text-primary">{paymentData.slotDays}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-text-secondary">الملعب</span>
                        <span className="font-bold text-ds-text-primary">{paymentData.court}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-text-secondary">مرجع الدفع</span>
                        <span dir="ltr" className="font-mono text-xs text-ds-text-primary">{paymentData.paymentReference || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-ds-text-secondary">المبلغ</span>
                        <span className="font-black text-xl text-ds-orange">
                            {paymentData.amount > 0
                                ? `${paymentData.amount.toLocaleString("ar-EG")} ${paymentData.currency === "EGP" ? "ج.م" : paymentData.currency}`
                                : "بانتظار تحديد التكلفة"}
                        </span>
                    </div>
                </div>

                {successMessage ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm mb-4">
                        {successMessage}
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-4">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handlePayNow}
                        disabled={!paymentData.isValid || processing}
                        className="flex-1 h-11 rounded-lg bg-ds-primary text-white font-bold hover:opacity-95 disabled:opacity-60"
                    >
                        {processing ? "جاري الدفع..." : "ادفع الآن"}
                    </button>
                    <button
                        type="button"
                        onClick={handleBack}
                        disabled={processing}
                        className="flex-1 h-11 rounded-lg border border-ds-border text-ds-text-primary font-bold hover:bg-gray-50 disabled:opacity-60"
                    >
                        رجوع
                    </button>
                </div>
            </div>

            {/* Success Modal for booking with invite link */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div dir="rtl" className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>

                            <h2 className="text-2xl font-black text-ds-text-primary mb-2">
                                تم تأكيد الحجز بنجاح!
                            </h2>
                            <p className="text-ds-text-secondary mb-8">
                                تم تسجيل حجزك ودفع الرسوم بنجاح. يمكنك الآن دعوة أصدقائك للانضمام لهذا الحجز عبر الرابط التالي.
                            </p>

                            {shareUrl && (
                                <div className="space-y-4 mb-8 text-right">
                                    <label className="block text-xs font-bold text-ds-text-muted mb-1 px-1">
                                        رابط دعوة المشاركين:
                                    </label>
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                                        <div className="flex-1 overflow-hidden">
                                            <p
                                                dir="ltr"
                                                className="text-sm font-mono text-gray-600 truncate px-2"
                                            >
                                                {shareUrl}
                                            </p>
                                        </div>
                                        <button
                                            id="team-copy-btn"
                                            type="button"
                                            onClick={handleCopyLink}
                                            className="flex items-center gap-2 px-4 py-2 bg-ds-primary text-white text-xs font-bold rounded-lg hover:bg-ds-primary-dark transition-colors shrink-0"
                                        >
                                            <Copy className="w-3 h-3" />
                                            نسخ الرابط
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate("/team-member/dashboard", { replace: true })}
                                    className="w-full h-12 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                                >
                                    العودة للرئيسية
                                </button>
                                {/* 
                                <button
                                    type="button"
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full h-12 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    إغلاق
                                </button>
                                */}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamMemberSportPaymentPage;
