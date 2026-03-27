import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  MapPin, Calendar, Star,
  ArrowRight, Phone, Mail, Facebook, Instagram, Twitter, Menu, X, User, LogOut, LayoutDashboard, ChevronDown
} from "lucide-react";
import ReservationPage from "./ReservationPage.js";
import ContactUs from "../Component/LandingPageComponents/ContactUs";
import LastNews from "../Component/LandingPageComponents/LastNews";
import MediaGallery from "../Component/LandingPageComponents/MediaGallery";
import Clubs from "../Component/LandingPageComponents/Clubs";
import SportDetailedPG from "./SportDetailedPG";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, EffectCoverflow } from 'swiper/modules';
const HUCLogo = "/assets/HUC logo.jpeg";
const CapuniLogo = "/assets/capuni.png";
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

import { motion } from "framer-motion";
import api from "../api/axios";

interface MembershipPlan {
  id: number;
  name_ar: string;
  price: number;
  currency: string;
  duration_months: number;
}

interface BackendMediaPost {
  id: number;
  title: string;
  images?: string[];
  date?: string;
}

interface HomeNewsItem {
  id: number;
  title: string;
  image: string;
}

const BACKEND_URL = "http://localhost:3000";
const asset = (p: string) => `/assets/${p}`;
const DEFAULT_NEWS_IMAGE = asset("HUC Picture Full.jpg");

const normalizeImageUrl = (url?: string): string => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${BACKEND_URL}${url}`;
};


const STAFF_ROLES = new Set([
  "ADMIN", "SPORTS_DIRECTOR", "SPORTS_OFFICER", "FINANCIAL_DIRECTOR",
  "REGISTRATION_STAFF", "TEAM_MANAGER", "SUPPORT", "AUDITOR", "STAFF",
]);

function getDashboardPath(role: string, status?: string): string {
  if (STAFF_ROLES.has(role)) return "/staff/dashboard";
  if (role === "TEAM_MEMBER") return "/team-member/dashboard";
  if (role === "MEMBER") {
    const s = (status ?? "").trim().toLowerCase();
    return s === "active" ? "/member/dashboard" : "/member/pending";
  }
  return "/";
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: "لوحة الإدارة",
    SPORTS_DIRECTOR: "مدير الرياضة",
    SPORTS_OFFICER: "موظف رياضي",
    FINANCIAL_DIRECTOR: "المدير المالي",
    REGISTRATION_STAFF: "موظف التسجيل",
    TEAM_MANAGER: "مدير الفريق",
    SUPPORT: "الدعم الفني",
    AUDITOR: "المدقق المالي",
    STAFF: "لوحة الموظفين",
    MEMBER: "لوحة العضو",
    TEAM_MEMBER: "لوحة عضو الفريق",
  };
  return map[role] ?? "لوحة التحكم";
}

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1️⃣ State لتخزين خطط العضوية من الباك اند
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [latestNewsItems, setLatestNewsItems] = useState<HomeNewsItem[]>([]);
  const [loadingLatestNews, setLoadingLatestNews] = useState(true);

  // 2️⃣ جلب البيانات من الباك اند
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/memberships');
        if (response.ok) {
          const data: unknown = await response.json();
          // ترتيب حسب السعر
          const plans = Array.isArray(data) ? (data as MembershipPlan[]) : [];
          const sortedData = [...plans].sort((a, b) => Number(a.price) - Number(b.price));
          setMembershipPlans(sortedData);
        }
      } catch (error) {
        console.error("Failed to load membership plans:", error);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');

    const validTabs = new Set([
      'home',
      'clubs',
      'Sports',
      'memberships',
      'lastNews',
      'mediaGallery',
      'contact us',
      'reservations',
    ]);

    if (tab && validTabs.has(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    const fetchLatestNews = async () => {
      try {
        setLoadingLatestNews(true);
        const response = await api.get('/media-posts');
        const backendPosts: BackendMediaPost[] =
          response.data?.success && Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        const sortedPosts = [...backendPosts].sort((a, b) => {
          const aTime = a.date ? new Date(a.date).getTime() : 0;
          const bTime = b.date ? new Date(b.date).getTime() : 0;
          return bTime - aTime || b.id - a.id;
        });

        const mappedPosts: HomeNewsItem[] = sortedPosts.map((post) => ({
          id: Number(post.id),
          title: post.title || 'بدون عنوان',
          image: normalizeImageUrl(post.images?.[0]) || DEFAULT_NEWS_IMAGE,
        }));

        if (isMounted) {
          setLatestNewsItems(mappedPosts.slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to load latest news for home page:', error);
        if (isMounted) {
          setLatestNewsItems([]);
        }
      } finally {
        if (isMounted) {
          setLoadingLatestNews(false);
        }
      }
    };

    fetchLatestNews();

    return () => {
      isMounted = false;
    };
  }, []);

  const testimonials = [
    {
      name: "عمر عبد الرحمن",
      rating: 5,
      text: "من اول تدريب وانا حاسس بتغيير كبير والحمدلله دلوقتي بقيت أعرف وضع الجسم والطريقة الصحيحة للتدريب."
    },
    {
      name: "يوسف السيد",
      rating: 5,
      text: "النادي هنا مش بس معدات، المدربين عندهم خبرة، والتركيز على النتيجة خلاني اتطور بسرعة."
    },
    {
      name: "منى خالد",
      rating: 5,
      text: "خدمات ممتازة، المكان نضيف، وحبيت الاهتمام بالتغذية وبرنامج التمرين."
    }
  ];

  const newsItems = [
    { id: 1, title: "نادي جامعة العاصمة يتقالك مع محمد صلاح وساندو علي", image: "/api/placeholder/300/200" },
    { id: 2, title: "بطولة داخلية الاسبوع ده في فرع المعادي", image: "/api/placeholder/300/200" },
    { id: 3, title: "حملة تخفيضات على الاشتراكات السنوية", image: "/api/placeholder/300/200" },
    { id: 4, title: "تدريب مجاني لليوم العالمي للرياضة", image: "/api/placeholder/300/200" }
  ];

  const visibleNewsItems = latestNewsItems.length > 0 ? latestNewsItems : newsItems.slice(0, 3);

  const renderStars = (rating: number) =>
    Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-yellow-400" : "text-gray-300"}`}
        />
      ));

  const SectionTitle = ({ title, subtitle, centered = true, isDark = false }: { title: string; subtitle: string; centered?: boolean; isDark?: boolean }) => (
    <div className={`mb-16 ${centered ? "text-center" : "text-right"}`}>
      <span className="text-[#f8941c] font-bold tracking-wider uppercase text-sm">نادي جامعه العاصمة</span>
      <h2 className={`text-4xl md:text-5xl font-extrabold mt-2 mb-4 ${isDark ? "text-white" : "text-[#0e1c38]"}`}>{title}</h2>
      <div className={`h-1.5 w-24 bg-[#2596be] rounded-full mb-6 ${centered ? "mx-auto" : "ml-auto"}`}></div>
      <p className={`text-lg font-normal max-w-2xl mx-auto leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{subtitle}</p>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <>
            {/* Hero Section */}
            <section className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img
                  src={asset("Exposure 1.png")}
                  alt="Background"
                  className="w-full h-full object-cover scale-105 animate-slow-zoom"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0e1c38]/90 via-[#0e1c38]/60 to-transparent" />
              </div>

              <div className="container mx-auto px-6 relative z-10 pt-20">
                <div className="max-w-3xl text-white text-right">
                  <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight -mt-6">
                    نادي جامعة العاصمة<br />
                    <span className="text-[#f8941c] text-3xl md:text-4xl font-bold" style={{ letterSpacing: '0.05em' }}>روح المنافسة.. طاقة المستقبل </span>
                  </h1>
                  <p className="text-lg md:text-xl mb-10 text-gray-200 font-normal leading-relaxed max-w-xl">
                    انضم لأكبر مجتمع رياضي جامعي بمرافق حديثة، مدربين محترفين، وبرامج تناسب كل المستويات، وتجهيزات عالمية لخدمة أكثر من 5000 عضو.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => window.location.href = '/re'} className="bg-[#f8941c] hover:bg-[#e07d10] text-white px-8 py-4 rounded-full transition-all duration-300 hover:-translate-y-1 font-bold text-lg flex items-center gap-2">
                      سجل الآن <ArrowRight className="w-5 h-5" />
                    </button>
                    {/* <button onClick={() => setActiveTab("sports")} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full transition-all duration-300 border border-white/30 font-bold text-lg hover:border-white/60">
                      استعرض الرياضات
                    </button> */}
                  </div>
                </div>
              </div>
            </section>

            {/* Branches Section */}
            <section className="py-24 bg-gray-50 overflow-hidden">
              <div className="container mx-auto px-6">
                <SectionTitle
                  title="فروعنا المتميزة"
                  subtitle="اختر الفرع الأقرب إليك واستمتع بتجربة رياضية متكاملة بأحدث التجهيزات."
                />

                <Swiper
                  effect={'coverflow'}
                  grabCursor={true}
                  centeredSlides={true}
                  slidesPerView={'auto'}
                  initialSlide={0}
                  coverflowEffect={{
                    rotate: 0,
                    stretch: 0,
                    depth: 100,
                    modifier: 2.5,
                    slideShadows: false,
                  }}
                  pagination={{ clickable: true }}
                  navigation={true}
                  loop={true}
                  modules={[EffectCoverflow, Pagination, Navigation]}
                  className="w-full py-10"
                >
                  {[
                    { id: "helwan", name: "فرع حلوان", location: "حلوان", image: asset("BrancheHU1.jpg"), isMain: true },
                    { id: "maadi", name: "فرع المعادي", location: "زهراء المعادي", image: asset("club.png"), isMain: false },
                    { id: "tagamoa", name: "فرع التجمع", location: "التجمع الخامس", image: asset("club.png"), isMain: false },
                    { id: "zayed", name: "فرع الشيخ زايد", location: "الشيخ زايد", image: asset("club.png"), isMain: false },
                  ].map((branch) => (
                    <SwiperSlide key={branch.id} className="w-[85vw] md:w-[900px] bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
                      <div className="flex flex-col md:flex-row h-full">
                        <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
                          <div className="absolute inset-0 bg-[#0e1c38]/10 z-10"></div>
                          <img src={branch.image} alt={branch.name} className="w-full h-full object-cover" />
                          <div className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-sm px-5 py-2 rounded-xl text-sm font-bold text-[#2596be] shadow-lg">
                            {branch.isMain ? "الفرع الرئيسي" : "فرع حديث"}
                          </div>
                        </div>

                        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center text-right" dir="rtl">
                          <h3 className="text-3xl md:text-4xl font-extrabold mb-4 text-[#0e1c38]">{branch.name}</h3>
                          <p className="text-gray-500 mb-8 font-normal text-lg leading-relaxed">
                            يوفر {branch.name} تجربة رياضية متكاملة بمساحات خضراء واسعة، حمامات سباحة أولمبية، وملاعب مجهزة بأعلى المعايير.
                          </p>

                          <div className="grid grid-cols-2 gap-6 mb-10">
                            {[
                              { icon: MapPin, title: "الموقع", val: branch.location },
                              { icon: Calendar, title: "المواعيد", val: "طوال الأسبوع" },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="bg-blue-50 p-3 rounded-xl text-[#2596be]">
                                  <item.icon className="w-6 h-6" />
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 block mb-1">{item.title}</span>
                                  <span className="font-bold text-gray-900">{item.val}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-4">
                            <button className="flex-1 bg-[#2596be] hover:bg-[#1e7e9e] text-white py-4 rounded-xl transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl flex justify-center items-center gap-2" onClick={() => { window.location.href = `/branches/${branch.id}`; }}>
                              استكشف النادي <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </section>

            {/* Sports Academies Section */}
            <section className="py-20 bg-[#0e1c38] relative overflow-hidden direction-rtl text-right">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="text-white z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">أكاديميات الرياضة</h2>
                    <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                      يعد نادي جامعة العاصمة منظمة للأكاديميات الرياضية، وكل منظمة تتطور مع أحدث المعايير الرياضية والتدريبية. نحن نستهدف إلى توفير المزيد من الفرص والتنافس والتطوير للأعضاء من جميع الأعمار.
                    </p>
                    <button onClick={() => setActiveTab("Sports")} className="border-2 border-[#f8941c] text-[#f8941c] hover:bg-[#f8941c] hover:text-white px-8 py-3 rounded-full transition-all duration-300 font-bold text-lg">
                      اشترك الآن
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <div className="grid grid-cols-6 gap-6 max-w-md">
                      {[
                        { icon: <img src={asset("football.png")} alt="Football" className="w-8 h-8 brightness-0 invert" />, name: 'football' },
                        { icon: <img src={asset("volleyball.png")} alt="Volleyball" className="w-8 h-8 brightness-0 invert" />, name: 'volleyball' },
                        { icon: <img src={asset("basketball.png")} alt="Basketball" className="w-8 h-8 brightness-0 invert" />, name: 'basketball' },
                        { icon: <img src={asset("squash.png")} alt="Squash" className="w-8 h-8 brightness-0 invert" />, name: 'squash' },
                        { icon: <img src={asset("tennis.png")} alt="Tennis" className="w-8 h-8 brightness-0 invert" />, name: 'tennis' },
                        { icon: <img src={asset("swimming.svg")} alt="Swimming" className="w-8 h-8 brightness-0 invert" />, name: 'swimming' },
                      ].map((sport, i) => (
                        <button key={i} onClick={() => setActiveTab("Sports")} className="w-16 h-16 bg-white/10 hover:bg-[#f8941c]/20 rounded-lg flex items-center justify-center text-3xl transition-all duration-300 hover:scale-110 cursor-pointer border border-white/10 hover:border-[#f8941c]/50">
                          {sport.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* News Section - Moved after Sports */}
            <section className="py-20 bg-gray-50">
              <div className="container mx-auto px-4">
                <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-gray-900">اخر الاخبار</h2>
                <p className="text-center text-gray-600 mb-16 text-lg font-normal">تابع آخر أخبار النادي والفعاليات</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {(loadingLatestNews ? [] : visibleNewsItems).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group cursor-pointer"
                      onClick={() => { window.location.href = `/news/${item.id}`; }}
                    >
                      <div className="overflow-hidden">
                        <img src={item.image} alt={item.title} className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-6">
                        <h3 className="font-bold text-base text-center leading-relaxed text-gray-800 group-hover:text-[#2596be] transition-colors">{item.title}</h3>
                        <button className="mt-4 text-[#2596be] font-semibold hover:text-[#f8941c] transition-colors text-sm">اقرأ المزيد ←</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setActiveTab("lastNews")}
                    className="bg-[#2596be] hover:bg-[#1e7e9e] text-white px-8 py-4 rounded-full transition-all duration-300 font-bold text-lg flex items-center gap-2"
                  >
                    عرض المزيد <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section className="py-26 bg-gray-50 relative overflow-hidden">
              <div className="container mx-auto px-6 relative z-10">
                <SectionTitle
                  title="آراء عملائنا"
                  subtitle="شوف تجارب الأعضاء الحقيقية معانا وازاي النادي فرق في حياتهم."
                  isDark={false}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {testimonials.map((t, index) => (
                    <div key={index} className="bg-[#1a2b4d] rounded-[2rem] p-8 hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-2xl border border-white/10">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#2596be] to-[#0e1c38] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md border border-white/10">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">{t.name}</h3>
                          <span className="text-[#f8941c] text-xs font-bold">عضو مميز</span>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-6 leading-relaxed font-normal">"{t.text}"</p>
                      <div className="flex gap-1 border-t border-white/10 pt-4">{renderStars(t.rating)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Stats */}
            {/* <div className="bg-[#0e1c38] text-white py-10 border-b border-white/10">
              <div className="container mx-auto px-6 flex flex-wrap justify-around gap-8 text-center">
                {[
                  { num: "+5000", label: "عضو نشط" },
                  { num: "+20", label: "مدرب محترف" },
                  { num: "3", label: "فروع رئيسية" },
                  { num: "+15", label: "رياضة متنوعة" },
                ].map((stat, idx) => (
                  <div key={idx} className="flex flex-col group cursor-default">
                    <span className="text-4xl md:text-5xl font-bold text-[#f8941c] group-hover:scale-110 transition-transform duration-300">{stat.num}</span>
                    <span className="text-gray-300 text-sm mt-2 font-normal">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div> */}

            {/* App Download */}
            <section className="pt-10 pb-0 bg-[#0e1c38] relative overflow-hidden">
              <div className="container mx-auto px-4 relative z-10">
                <div className="relative flex items-center justify-center py-12 md:py-16">
                  <img src={asset("Uber rewards.png")} alt="App Screenshot Left" className="hidden md:block absolute left-0 md:-left-8 lg:-left-14 xl:-left-20 w-48 md:w-80 lg:w-102 translate-y-11" />
                  <img src={asset("Gold iphone.png")} alt="App Screenshot Right" className="hidden md:block absolute right-0 md:-right-8 lg:-right-14 xl:-right-20 w-48 md:w-80 lg:w-95 translate-y-12" />
                  <div className="text-center text-white max-w-4xl">
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-tight tracking-wide md:tracking-wider">
                      استفد <span className="text-[#f8941c]">بالنقاط</span> من خلال
                    </h2>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl mb-6 font-semibold tracking-wide md:tracking-wider">
                      تطبيق نادي جامعه العاصمة
                    </h2>
                    <p className="text-white/90 mb-10 text-lg md:text-xl lg:text-2xl tracking-wide md:tracking-wider font-normal">
                      حمل التطبيق الآن واستمتع بمميزات حصرية
                    </p>
                    <div className="flex flex-col items-center gap-4">
                      <img src={asset("Layer 12 copy.png")} alt="Google Play" className="h-14 hover:scale-110 transition-transform duration-300 cursor-pointer drop-shadow-lg" />
                      <img src={asset("Layer 28.png")} alt="App Store" className="h-14 hover:scale-110 transition-transform duration-300 cursor-pointer drop-shadow-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        );

      // 👇 هنا الأجزاء اللي كانت بتسبب الخطأ - رجعتها كاملة
      case "events":
        return (
          <div className="container mx-auto px-4 py-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-gray-900">اخر الاحداث</h2>
            <p className="text-center text-gray-600 mb-16 text-lg font-normal">الفعاليات والمسابقات القادمة</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className="bg-blue-50 rounded-2xl h-48 mb-6"></div>
                    <h3 className="font-bold text-xl mb-3 text-gray-900">حدث رياضي {i + 1}</h3>
                    <p className="text-gray-600 mb-6">وصف مختصر عن الحدث الرياضي والفعاليات المصاحبة</p>
                    <button className="text-[#0b2f8f] hover:text-[#ff9900] font-bold transition-colors">اعرف المزيد ←</button>
                  </div>
                ))}
            </div>
          </div>
        );

      case "sports":
        return (
          <div className="container mx-auto px-4 py-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-gray-900">الرياضات</h2>
            <p className="text-center text-gray-600 mb-16 text-lg font-normal">اختر رياضتك المفضلة</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                "كرة القدم", "السباحة", "كرة السلة", "التنس",
                "الجمباز", "كرة اليد", "الكاراتيه", "الملاكمة"
              ].map((sport, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-lg p-8 text-center hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 group">
                  <div className="bg-blue-50 group-hover:bg-blue-100 rounded-full w-24 h-24 mx-auto mb-6 transition-all duration-300"></div>
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#0b2f8f] transition-colors">{sport}</h3>
                </div>
              ))}
            </div>
          </div>
        );

      case "reservations":
        return (
          <div className="min-h-screen bg-gray-50 py-24 animate-fade-in">
            <div className="container mx-auto px-6">
              <SectionTitle title="حجز الملاعب" subtitle="نظام حجز ذكي وسهل لتنظيم وقتك الرياضي مع صحابك." />

              <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
                <div className="md:w-1/3 bg-[#0e1c38] p-10 text-white flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-[#2596be] opacity-20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-6 border-b border-white/20 pb-4">تعليمات هامة</h3>
                    <ul className="text-sm space-y-4 text-gray-300">
                      <li className="flex items-start gap-2"><span className="text-[#f8941c]">•</span> يرجى الحضور قبل الموعد بـ 15 دقيقة.</li>
                      <li className="flex items-start gap-2"><span className="text-[#f8941c]">•</span> الإلغاء متاح قبل 24 ساعة مجانًا.</li>
                      <li className="flex items-start gap-2"><span className="text-[#f8941c]">•</span> يجب ارتداء الملابس الرياضية المناسبة.</li>
                    </ul>
                  </div>
                  <div className="mt-12 relative z-10">
                    <p className="text-xs text-gray-400 mb-2">للمساعدة الفورية</p>
                    <div className="flex items-center gap-3 text-[#f8941c] font-bold text-2xl">
                      <Phone className="w-6 h-6" /> 1913641
                    </div>
                  </div>
                </div>
                <div className="md:w-2/3 p-10">
                  <ReservationPage />
                </div>
              </div>
            </div>
          </div>
        );

      // 👇 هنا قسم العضويات اللي مربوط بالباك اند
      case "memberships":
        return (
          <div className="container mx-auto px-6 py-30">
            <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-gray-900 px-4">العضويات</h2>
            <p className="text-center text-gray-600 mb-16 text-lg font-normal px-4">اختر الباقة الأنسب لك</p>

            {loadingPlans ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2596be]"></div>
              </div>
            ) : membershipPlans.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-xl">لا توجد خطط متاحة حالياً، يرجى المحاولة لاحقاً.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {membershipPlans.map((plan, i) => (
                  <div key={plan.id} className={`bg-white rounded-3xl shadow-xl p-8 md:p-10 transition-all duration-300 hover:-translate-y-2 ${i === 2
                    ? "border-4 border-[#f8941c] ring-4 ring-[#f8941c]/20 transform md:scale-105"
                    : "hover:shadow-2xl"
                    }`}>
                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-900 px-2">{plan.name_ar}</h3>
                    <div className="text-4xl md:text-5xl font-bold text-center text-[#2596be] mb-8">
                      {plan.price} <span className="text-xl md:text-2xl">{plan.currency}</span>
                      <span className="text-sm md:text-base text-gray-500 block mt-2">
                        {plan.duration_months === 12 ? 'سنويًا' : plan.duration_months === 1 ? 'شهريًا' : `كل ${plan.duration_months} شهور`}
                      </span>
                    </div>
                    <ul className="space-y-4 mb-10 px-2">
                      <li className="flex items-center gap-3">
                        <span className="text-green-500 text-2xl">✓</span>
                        <span className="text-base md:text-lg">دخول النادي واستخدام المرافق</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="text-green-500 text-2xl">✓</span>
                        <span className="text-base md:text-lg">خصم على الأنشطة الرياضية</span>
                      </li>
                      {plan.price > 1000 && (
                        <li className="flex items-center gap-3">
                          <span className="text-green-500 text-2xl">✓</span>
                          <span className="text-base md:text-lg">دعوات مجانية للأصدقاء</span>
                        </li>
                      )}
                    </ul>
                    <button
                      className={`w-full py-4 rounded-2xl font-bold text-base md:text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${i === 2
                        ? "bg-[#f8941c] hover:bg-[#e07d10] text-white"
                        : "bg-[#2596be] hover:bg-[#1e7e9e] text-white"
                        }`}
                    >
                      اشترك الآن
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "contact us":
        return <ContactUs />;
      case "lastNews":
        return <LastNews />;
      case "mediaGallery":
        return <MediaGallery />;
      case "clubs":
        return <Clubs onNavigate={setActiveTab} />;
      case "Sports":
        return <SportDetailedPG />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Sticky Glass Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-white/80 backdrop-blur-md border-b border-white/20 shadow-lg py-1"
          : "bg-white py-1.5"
          }`}
      >
        <div className="w-full px-6 md:px-12 lg:px-16">
          <div className="flex items-center justify-between">

            {/* 1. Logo & Brand (Left Side in RTL) */}
            <div
              className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 cursor-pointer mr-2 sm:mr-6"
              onClick={() => setActiveTab("home")}
            >
              <div className="flex w-16 h-16 md:w-20 md:h-20 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <img src={HUCLogo} alt="نادي جامعه العاصمة" className="w-full h-full object-contain" />
              </div>
              <div className="flex w-16 h-16 md:w-20 md:h-20 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <img src={CapuniLogo} alt="كاب يوني" className="w-full h-full object-contain" />
              </div>
              {/* <div className="hidden md:block">
                <h1 className="font-extrabold text-lg text-[#0e1c38] leading-tight">نادي جامعه العاصمة</h1>
              </div> */}
            </div>

            {/* 2. Desktop Navigation (Center) - Clean Floating Style */}
            <nav className="hidden xl:flex items-center gap-2 mx-auto">
              {[
                { key: "home", label: "الرئيسية" },
                { key: "clubs", label: "الفروع" },
                { key: "Sports", label: "الرياضات" },
                { key: "memberships", label: "العضويات" },
                { key: "lastNews", label: "اخر الاخبار" },
                { key: "contact us", label: "تواصل معنا" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`font-bold transition-all duration-300 px-4 py-1.5 rounded-full text-sm relative whitespace-nowrap ${activeTab === tab.key
                    ? "text-white"
                    : "text-gray-600 hover:text-[#2596be]"
                    }`}
                >
                  <span className="relative z-10">{tab.label}</span>
                  {activeTab === tab.key && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: "spring", duration: 0.5 }}
                      className="absolute inset-0 z-0 bg-[#2596be] rounded-full shadow-md"
                    ></motion.span>
                  )}
                </button>
              ))}
            </nav>

            {/* 3. Actions (Right Side in RTL) */}
            <div className="flex items-center gap-4">

              {/* Language Switcher */}
              {/* Language Switcher Removed */}


              {/* Vertical Divider */}
              <div className="hidden md:block h-5 w-px bg-gray-200"></div>

              {/* Buttons Group */}
              <div className="hidden md:flex items-center gap-3">
                {user ? (
                  /* Logged-in: Avatar + Dropdown */
                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen((v) => !v)}
                      className="flex items-center gap-2 bg-white border border-gray-200 hover:border-[#2596be] px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      {/* Avatar circle with initials */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2596be] to-[#0e1c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user.fullName?.charAt(0) ?? <User className="w-4 h-4" />}
                      </div>
                      <div className="text-right leading-tight">
                        <p className="font-bold text-[#0e1c38] text-xs whitespace-nowrap">{user.fullName}</p>
                        <p className="text-[#2596be] text-[10px] font-semibold whitespace-nowrap">{getRoleLabel(user.role)}</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Panel */}
                    {userDropdownOpen && (
                      <div
                        className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in"
                        onMouseLeave={() => setUserDropdownOpen(false)}
                      >
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                          <p className="font-bold text-[#0e1c38] text-sm truncate">{user.fullName}</p>
                          <p className="text-[#2596be] text-xs font-semibold">{getRoleLabel(user.role)}</p>
                        </div>
                        <button
                          onClick={() => { navigate(getDashboardPath(user.role, (user as any).status)); setUserDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-semibold text-[#0e1c38] hover:bg-blue-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#2596be]" />
                          {getRoleLabel(user.role)}
                        </button>
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          <LogOut className="w-4 h-4" />
                          تسجيل الخروج
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Login Button - Ghost/Outline Style */}
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="text-[#0e1c38] hover:bg-gray-50 px-4 py-2 rounded-full transition-all duration-300 font-bold text-sm flex items-center gap-2 whitespace-nowrap border border-transparent hover:border-gray-200"
                    >
                      <User className="w-4 h-4" /> تسجيل الدخول
                    </button>

                    {/* Register Button - Primary CTA */}
                    <button
                      onClick={() => window.location.href = '/re'}
                      className="bg-[#f8941c] hover:bg-[#e07d10] text-white px-4 py-2 rounded-full transition-all duration-300 font-bold text-sm shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
                    >
                      <User className="w-4 h-4" /> سجل الآن
                    </button>
                  </>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="xl:hidden p-2 text-[#0e1c38] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-[#0e1c38] text-white p-6 animate-fade-in flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <span className="font-bold text-xl text-[#f8941c]">القائمة</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            {[
              { key: "home", label: "الرئيسية" },
              { key: "clubs", label: "الفروع" },
              { key: "Sports", label: "الرياضات" },
              { key: "memberships", label: "العضويات" },
              { key: "lastNews", label: "اخر الاخبار" },
              { key: "contact us", label: "تواصل معنا" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); setMobileMenuOpen(false); }}
                className={`w-full text-right py-4 px-4 rounded-xl font-bold text-lg transition-all ${activeTab === item.key ? "bg-[#f8941c] text-white" : "hover:bg-white/5 text-gray-300"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {user ? (
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2596be] to-[#0e1c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {user.fullName?.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="font-bold text-white text-sm">{user.fullName}</p>
                  <p className="text-[#f8941c] text-xs font-semibold">{getRoleLabel(user.role)}</p>
                </div>
              </div>
              <button
                onClick={() => { navigate(getDashboardPath(user.role, (user as any).status)); setMobileMenuOpen(false); }}
                className="w-full bg-[#2596be] text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-5 h-5" /> {getRoleLabel(user.role)}
              </button>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full bg-red-500/20 border border-red-400/30 text-red-300 py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" /> تسجيل الخروج
              </button>
            </div>
          ) : (
            <button
              onClick={() => { window.location.href = '/login'; setMobileMenuOpen(false); }}
              className="w-full bg-white text-[#0e1c38] py-4 rounded-xl font-bold text-lg mt-4"
            >
              تسجيل دخول
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="pt-20">{renderContent()}</main>

      {/* Footer */}
      <footer className="bg-[#0e1c38] text-white pt-20 pb-10 rounded-t-[3rem] mt-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">

            <div className="max-w-sm">
              <div className="flex items-center gap-4 mb-6">
                <img src={HUCLogo} alt="نادي جامعه العاضمة" className="w-16 h-16 object-contain bg-white rounded-lg p-2" />
                <div>
                  <h3 className="font-bold text-2xl">نادي جامعه العاصمة</h3>
                  <p className="text-[#f8941c] font-medium">عراقة.. رياضة.. حياة</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 font-normal">
                مؤسسة رياضية رائدة تقدم مجتمعًا رياضيًا متكاملًا بخدمات عالمية تناسب جميع أفراد الأسرة.
              </p>
              {/* App Download Buttons in Footer */}
              <div className="flex flex-wrap gap-4">
                <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-lg transition-all">
                  <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" className="h-8" />
                </a>
                <a href="https://www.apple.com/app-store/" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 border border-white/10 p-2 rounded-lg transition-all">
                  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" className="h-8" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 md:gap-24">
              <div>
                <h4 className="font-bold text-lg mb-6 text-white">روابط هامة</h4>
                <ul className="space-y-4 text-gray-400">
                  <li><button onClick={() => setActiveTab("home")} className="hover:text-[#f8941c] transition-colors">الرئيسية</button></li>
                  <li><button onClick={() => setActiveTab("sports")} className="hover:text-[#f8941c] transition-colors">الرياضات</button></li>
                  <li><button onClick={() => setActiveTab("memberships")} className="hover:text-[#f8941c] transition-colors">العضويات</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-6 text-white">تواصل معنا</h4>
                <ul className="space-y-4 text-gray-400 text-sm">
                  <li className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-[#f8941c]" />
                    <a
                      href="https://maps.app.goo.gl/QHexupLs17Y7u7rF6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      الموقع على الخريطة
                    </a>
                  </li>
                  <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-[#f8941c]" /> 1913641</li>
                  <li className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#f8941c]" />
                    <a href="mailto:huc@hq.helwan.edu.eg" className="hover:text-white transition-colors">
                      huc@hq.helwan.edu.eg
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} نادي جامعه العاصمة — جميع الحقوق محفوظة</p>
            <div className="flex gap-4">
              <a href="https://www.facebook.com/share/1ADZY7CcCU/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1877F2] transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/helwan.university.club/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#E4405F] transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="https://x.com/Helwan_HUC" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1DA1F2] transition-colors"><Twitter className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
