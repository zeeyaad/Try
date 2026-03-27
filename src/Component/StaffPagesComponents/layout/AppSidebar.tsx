import { useEffect, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Home,
  Image,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Shield,
  Trophy,
  User,
  UserPlus,
  Users,
  Dumbbell,
  Link2,
} from "lucide-react";
import { PAYMENT_ALERTS } from "../../../data/paymentsData";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SidebarItem = {
  title: string;
  icon: React.ElementType;
  path: string;
  privilege?: string | null;
};

type SidebarGroup = {
  label: string;
  collapsible: boolean;
  items: SidebarItem[];
};

// ─── Groups ────────────────────────────────────────────────────────────────────

const SIDEBAR_GROUPS: SidebarGroup[] = [
  // ── 1. الرئيسية ───────────────────────────────────────────────────────────
  {
    label: "الرئيسية",
    collapsible: false,
    items: [
      {
        title: "لوحة التحكم",
        icon: LayoutDashboard,
        path: "/staff/dashboard",
        privilege: "dashboard.view",
      },
    ],
  },

  // ── 2. الأعضاء ────────────────────────────────────────────────────────────
  {
    label: "الأعضاء",
    collapsible: false,
    items: [
      {
        title: "طلبات التسجيل",
        icon: ClipboardList,
        path: "/staff/dashboard/registrations",
        privilege: "VIEW_MEMBERS",
      },
      {
        title: "إدارة الأعضاء",
        icon: Users,
        path: "/staff/dashboard/members/manage",
        privilege: "VIEW_MEMBERS",
      },
      {
        title: "إضافة عضو نادي",
        icon: UserPlus,
        path: "/staff/dashboard/members/new",
        privilege: "VIEW_MEMBERS",
      },
      {
        title: "إضافة لاعب فريق",
        icon: UserPlus,
        path: "/staff/dashboard/members/new-team",
        privilege: "VIEW_MEMBERS",
      },
    ],
  },

  // ── 3. العمليات اليومية ───────────────────────────────────────────────────
  {
    label: "العمليات اليومية",
    collapsible: false,
    items: [
      {
        title: "حجوزات الملاعب",
        icon: CalendarCheck,
        path: "/staff/dashboard/sports/bookings",
        privilege: "VIEW_SPORTS",
      },
      {
        title: "إدارة الدعوات",
        icon: Link2,
        path: "/staff/dashboard/sports/invitations",
        privilege: "VIEW_SPORTS",
      },
    ],
  },

  // ── 4. إدارة الرياضات ─────────────────────────────────────────────────────
  {
    label: "إدارة الرياضات",
    collapsible: true,
    items: [
      {
        title: "الرياضات",
        icon: Trophy,
        path: "/staff/dashboard/sports",
        privilege: "VIEW_SPORTS",
      },
      {
        title: "الفرق",
        icon: Users,
        path: "/staff/dashboard/sports/teams",
        privilege: "VIEW_SPORTS",
      },
      {
        title: "الملاعب والفيلدات",
        icon: MapPin,
        path: "/staff/dashboard/sports/courts",
        privilege: "VIEW_SPORTS",
      },
      {
        title: "تعيين الرياضات",
        icon: Shield,
        path: "/staff/dashboard/members/sports",
        privilege: "VIEW_MEMBERS",
      },
      {
        title: "الأعضاء بالرياضة",
        icon: Users,
        path: "/staff/dashboard/members/sports-view",
        privilege: "VIEW_MEMBERS",
      },
    ],
  },

  // ── 5. المالية والخدمات ───────────────────────────────────────────────────
  {
    label: "المالية والخدمات",
    collapsible: true,
    items: [
      {
        title: "الاشتراكات والدفع",
        icon: CreditCard,
        path: "/staff/dashboard/finance/subscriptions",
        privilege: "VIEW_FINANCE",
      },
      {
        title: "العضويات",
        icon: BadgeCheck,
        path: "/staff/dashboard/memberships",
        privilege: "VIEW_MEMBERSHIP_PLANS",
      },
      {
        title: "معرض الوسائط",
        icon: Image,
        path: "/staff/dashboard/media-gallery",
        // no privilege required
      },
    ],
  },

  // ── 6. الموظفون ───────────────────────────────────────────────────────────
  {
    label: "الموظفون",
    collapsible: true,
    items: [
      {
        title: "إضافة موظف جديد",
        icon: UserPlus,
        path: "/staff/dashboard/admin/staff/new",
        privilege: "STAFF_CREATE",
      },
      {
        title: "إدارة الموظفين",
        icon: Users,
        path: "/staff/dashboard/admin/staff/manage",
        privilege: "STAFF_CREATE",
      },
    ],
  },

  // ── 7. النظام ─────────────────────────────────────────────────────────────
  {
    label: "النظام",
    collapsible: true,
    items: [
      {
        title: "باقات الصلاحيات",
        icon: Shield,
        path: "/staff/dashboard/admin/privilege-packages",
        privilege: "VIEW_PRIVILEGES",
      },
      {
        title: "تعيين الصلاحيات",
        icon: Shield,
        path: "/staff/dashboard/admin/staff/assign-privileges",
        privilege: "VIEW_PRIVILEGES",
      },
      {
        title: "سحب الصلاحيات",
        icon: Shield,
        path: "/staff/dashboard/admin/staff/revoke-privileges",
        privilege: "VIEW_PRIVILEGES",
      },
      {
        title: "سجل التدقيق",
        icon: ScrollText,
        path: "/staff/dashboard/audit-log",
        privilege: "audit.view",
      },
    ],
  },
];

// ─── Member-only nav ───────────────────────────────────────────────────────────

const MEMBER_SIDEBAR_ITEMS: SidebarItem[] = [
  { title: "الرئيسية", icon: Home, path: "/member/dashboard/home" },
  { title: "ملفي الشخصي", icon: User, path: "/member/dashboard/profile" },
  { title: "عضويتي", icon: CreditCard, path: "/member/dashboard/memberships" },
  { title: "اشتراكاتي الرياضية", icon: Trophy, path: "/member/dashboard/sports" },
  { title: "استكشف الرياضات", icon: Dumbbell, path: "/member/dashboard/subscribe" },
  { title: "حجز الملاعب", icon: MapPin, path: "/member/dashboard/courts" },
];

// ─── Main Component ────────────────────────────────────────────────────────────

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const { hasPrivilege, user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isMember = user?.role === "MEMBER";

  // ── Sidebar width via CSS var ──────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth < 768;
      if (isSmall) setCollapsed(true);
      const width = (collapsed || isSmall) ? "60px" : "256px";
      document.documentElement.style.setProperty("--sidebar-width", width);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [collapsed]);

  // ── Auto-expand group containing active route ──────────────────────────────
  useEffect(() => {
    const activeGroup = SIDEBAR_GROUPS.find(
      g =>
        g.collapsible &&
        g.items.some(
          item =>
            currentPath === item.path ||
            (item.path !== "/staff/dashboard" && currentPath.startsWith(item.path))
        )
    );
    if (activeGroup) {
      setOpenGroups(prev => new Set([...prev, activeGroup.label]));
    }
  }, [currentPath]);

  // ── Toggle collapsible group ───────────────────────────────────────────────
  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // ── Active detection ───────────────────────────────────────────────────────
  const isActive = (path: string) =>
    currentPath === path ||
    (path !== "/staff/dashboard" && currentPath.startsWith(path));

  // ── Privilege filter ───────────────────────────────────────────────────────
  const filterItems = (items: SidebarItem[]): SidebarItem[] => {
    if (user?.role === "ADMIN") return items;
    return items.filter(item => !item.privilege || hasPrivilege(item.privilege));
  };

  // ── Payment alert helpers ──────────────────────────────────────────────────
  const hasPaymentAlert = (path: string) =>
    path.includes("finance/subscriptions") && PAYMENT_ALERTS.length > 0;

  const paymentCountLabel =
    PAYMENT_ALERTS.length > 9 ? "9+" : String(PAYMENT_ALERTS.length);

  // ── Render single nav item ─────────────────────────────────────────────────
  const renderItem = (item: SidebarItem) => {
    const active = isActive(item.path);
    const hasAlert = hasPaymentAlert(item.path);

    if (collapsed) {
      return (
        <RouterNavLink
          key={item.path}
          to={item.path}
          title={item.title}
          className={`relative mx-auto mb-0.5 flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 ${active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-white/80 hover:bg-white/15 hover:text-white"
            }`}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {hasAlert && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-[#214474]" />
          )}
        </RouterNavLink>
      );
    }

    return (
      <RouterNavLink
        key={item.path}
        to={item.path}
        className={`mx-2 mb-0.5 flex h-10 items-center gap-3 rounded-lg border-r-[3px] px-3 transition-all duration-150 ${active
          ? "bg-primary border-primary text-primary-foreground font-semibold shadow-sm"
          : "border-transparent text-white/85 hover:bg-white/10 hover:text-white"
          }`}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-sm font-medium leading-none">{item.title}</span>
        {hasAlert && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold shrink-0">
            {paymentCountLabel}
          </span>
        )}
      </RouterNavLink>
    );
  };

  // ── Render group label / collapsible header ────────────────────────────────
  const renderGroupHeader = (group: SidebarGroup) => {
    if (collapsed) return null; // no labels in icon-only mode

    if (!group.collapsible) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 mt-4">
          <div className="h-px flex-1 bg-white/15" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap px-1">
            {group.label}
          </span>
          <div className="h-px flex-1 bg-white/15" />
        </div>
      );
    }

    const isOpen = openGroups.has(group.label);
    return (
      <button
        onClick={() => toggleGroup(group.label)}
        className="w-full flex items-center gap-2 px-3 py-1.5 mt-4 rounded-md hover:bg-white/10 transition-colors"
      >
        <div className="h-px flex-1 bg-white/15" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap px-1 flex items-center gap-1">
          {group.label}
          <ChevronLeft
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "-rotate-90" : ""
              }`}
          />
        </span>
        <div className="h-px flex-1 bg-white/15" />
      </button>
    );
  };

  return (
    <aside
      className="fixed right-0 top-16 bottom-0 z-30 flex flex-col border-l border-[#2a5489] transition-[width] duration-200 ease-in-out"
      style={{ backgroundColor: "#214474", width: collapsed ? "60px" : "256px" }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto py-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {isMember ? (
          // Member-only nav ─────────────────────────────────────────────────
          <div className={collapsed ? "flex flex-col items-center gap-0.5 pt-1" : ""}>
            {MEMBER_SIDEBAR_ITEMS.map(item => renderItem(item))}
          </div>
        ) : (
          // Staff nav groups ─────────────────────────────────────────────────
          SIDEBAR_GROUPS.map(group => {
            const visibleItems = filterItems(group.items);
            if (visibleItems.length === 0) return null;

            const isOpen = !group.collapsible || openGroups.has(group.label);

            return (
              <div key={group.label}>
                {renderGroupHeader(group)}

                {group.collapsible ? (
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className={`pt-1 ${collapsed ? "flex flex-col items-center gap-0.5" : ""}`}>
                          {visibleItems.map(item => renderItem(item))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ) : (
                  <div className={`pt-1 ${collapsed ? "flex flex-col items-center gap-0.5" : ""}`}>
                    {visibleItems.map(item => renderItem(item))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* ── Profile link (staff only) ────────────────────────────────────────── */}
      {!isMember && (
        <div className={`border-t border-white/10 py-2 ${collapsed ? "flex justify-center" : ""}`}>
          {renderItem({ title: "ملفي الشخصي", icon: User, path: "/staff/dashboard/profile" })}
        </div>
      )}

      {/* ── Expand / Collapse toggle ─────────────────────────────────────────── */}
      <div className="border-t border-white/10 px-2 py-3">
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-white transition-all duration-150 hover:bg-white/10"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed
            ? <ChevronLeft className="h-4 w-4" />   // collapsed → expand (point left = away from right wall)
            : <ChevronRight className="h-4 w-4" />   // expanded  → collapse (point right = toward wall)
          }
        </button>
      </div>
    </aside>
  );
}
