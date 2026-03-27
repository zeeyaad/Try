import { motion } from 'framer-motion';
import { CheckCircle, Download, Printer, Home, Facebook, Instagram, Twitter, MapPin, Phone, Mail } from 'lucide-react';
const AssignmentImage = "/assets/Assigment.jpeg";
const HUCLogo = "/assets/HUC logo.jpeg";
import { AuthService } from '../../../services/authService';

type PrintFormData = {
    logoUrl: string;
    cost?: string;
    photoUrl?: string;
    name?: string;
    dob?: string;
    type?: string;
    address?: string;
    profession?: string;
    phone?: string;
    declarantId?: string;
    reportWhat?: string;
    signatureName?: string;
    signature?: string;
    editedBy?: string;
};

const getFormHTML = (d: PrintFormData) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>استمارة عضوية</title>
  <!-- Adjust this path if you place the CSS elsewhere -->
  <link rel="stylesheet" href="/css/MemberShip-Form.css"/>
  <style>
    .form-container { position: relative; padding: 40px; max-width: 800px; margin: auto; background: white; }
    .overlay { position:absolute; top:0; left:0; width:100%; height:100%; background: url('${
      d.logoUrl
    }') center/contain no-repeat; opacity:0.1; }
    h2.section-title { text-align:center; margin:20px 0; font-size:1.6rem; }
    .header-sec-part { display:flex; justify-content:space-between; align-items:center; }
    .value-input-group { text-align:right; }
    .value-input-group .label { font-weight:600; }
    .value-input-group .value { display:inline-block; margin-left:8px; }
    .photo-section { text-align:center; margin:20px 0; }
    .photo-img { width:150px; height:180px; object-fit:cover;  }
    .fields-wrapper { margin:20px 0; }
    .field { display:flex; justify-content:space-between; margin:8px 0; }
    .field .label { width:150px; text-align:right; font-weight:500; }
    .field .value { flex:1; text-align:center; border-bottom:1px dashed #999; padding-bottom:2px; }
    .radio-value { text-align:center; border-bottom:1px dashed #999; padding-bottom:2px; }
    .section-subtitle { margin-top:30px; font-size:1.2rem; text-align:center; }
    .declaration-text { margin:15px 0; line-height:1.5; }
    .declaration-date-right { text-align:right; margin-top:10px; }
    .signature-area { margin-top:20px; }
    .signature-item { display:flex; justify-content:space-between; margin:8px 0; }
    .signature-item .label { width:150px; text-align:right; font-weight:500; }
    .signature-item .value { flex:1; text-align:center; border-bottom:1px dashed #999; padding-bottom:2px; }
    @media print {
      body, html { margin:0; padding:0; }
      .form-container { box-shadow:none; }
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="overlay"></div>

    <div class="header-sec-part">
      <div class="value-input-group">
        <span class="label">قيمة الإستمارة</span>
        <span class="value">${d.cost ?? ''}</span>
      </div>
      <img src="${d.logoUrl}" alt="Logo" style="height:80px;" />
    </div>

    <h2 class="section-title">إستمارة عضوية</h2>

    <div class="photo-section">
      ${
        d.photoUrl
          ? `<img src="${d.photoUrl}" class="photo-img"/>`
          : `<div class="photo-img">صورة</div>`
      }
    </div>

    <div class="fields-wrapper">
      ${[
        ["الإسم", d.name],
        ["تاريخ الميلاد", d.dob],
        ["النوع", d.type],
        ["العنوان", d.address],
      ]
        .map(
          ([lbl, val]) => `
        <div class="field">
          <span class="label">${lbl}</span>
          <span class="value">${val || "—"}</span>
        </div>
      `
        )
        .join("")}


      ${[
        ["المهنة", d.profession],
        ["الهاتف واتس اب", d.phone],
      ]
        .map(
          ([lbl, val]) => `
        <div class="field">
          <span class="label">${lbl}</span>
          <span class="value">${val || "—"}</span>
        </div>
      `
        )
        .join("")}
    </div>

    <h4 class="section-subtitle">إقرار</h4>
    <div class="declaration-text">
      <p>أقر أنا <strong>${d.name ?? ""}</strong> برقم قومي <strong>${
    d.declarantId ?? ""
  }</strong> بأن البيانات الواردة صحيحة على مسؤوليتي الشخصية.</p>
<p class="declaration-date-right">
  بتاريخ :
  ${new Date().toLocaleDateString("en-GB")} 
  ${new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}
</p>

    </div>

    <div class="signature-area">
      ${[
        ["المقرر بما فيه", d.reportWhat],
        ["الإسم", d.signatureName],
        ["التوقيع", d.signature],
      ]
        .map(
          ([lbl]) => `
        <div class="signature-item">
          <span class="label">${lbl}</span>
          <span class="value"></span>
        </div>
      `
        )
        .join("")}
    </div>

 <div class="footer" style="margin-top:40px; text-align:center; font-size:0.9rem;">
  <p>
    ${
      d.editedBy
        ? `تم تعديل البيانات من قبل: <strong>${d.editedBy}</strong>`
        : `<strong>${d.name ?? "—"}</strong> قام بتسجيل هذه البيانات`
    }
  </p>
</div>
  </div>

  <script>
    window.onload = () => {
      window.print();
      window.onafterprint = () => window.close();
    };
  </script>
</body>
</html>
`;

const loadPrintFormData = (): PrintFormData | null => {
    try {
        const raw = localStorage.getItem('membership-print-data');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<PrintFormData>;
        return {
            logoUrl: parsed.logoUrl || HUCLogo,
            cost: parsed.cost,
            photoUrl: parsed.photoUrl,
            name: parsed.name,
            dob: parsed.dob,
            type: parsed.type,
            address: parsed.address,
            profession: parsed.profession,
            phone: parsed.phone,
            declarantId: parsed.declarantId,
            reportWhat: parsed.reportWhat,
            signatureName: parsed.signatureName,
            signature: parsed.signature,
            editedBy: parsed.editedBy,
        };
    } catch (e) {
        console.error('Failed to load membership-print-data from localStorage', e);
        return null;
    }
};

const getLastRegisteredMemberId = (): number | null => {
    const raw = localStorage.getItem('last_registered_member_id');
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
};

/**
 * AssignmentPage Component
 * 
 * Final success page in the registration flow.
 * Displays the assignment form with download and print functionality.
 */
export const AssignmentPage = () => {

    /**
     * Handle download of the assignment image
     */
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = AssignmentImage;
        link.download = 'Assignment-Helwan-Club.jpeg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Handle print - triggers browser print dialog
     * CSS media query ensures only the image is printed
     */
    const handlePrint = async () => {
        // 1) Prefer explicit print payload if already prepared
        let data = loadPrintFormData();

        // 2) Otherwise fetch from backend using last registered member id
        if (!data) {
            const memberId = getLastRegisteredMemberId();
            if (memberId) {
                try {
                    const res = await AuthService.getTeamMemberDetails(memberId);
                    const m = res?.data;

                    const photoUrl =
                        m?.documents?.personal_photo_url
                            ? `http://localhost:3000${m.documents.personal_photo_url}`
                            : undefined;

                    data = {
                        logoUrl: HUCLogo,
                        cost: '',
                        photoUrl,
                        name: m?.name_ar || m?.name_en,
                        dob: m?.birthdate || '',
                        type: m?.gender || '',
                        address: m?.address || '',
                        // Team member doesn't have a "profession" column.
                        // Use position first, then fallback to selected teams.
                        profession: m?.team_member_details?.position || (Array.isArray(m?.teams) ? m.teams.join(', ') : ''),
                        phone: m?.phone || '',
                        declarantId: m?.national_id || '',
                        reportWhat: '',
                        signatureName: '',
                        signature: '',
                        editedBy: '',
                    };
                } catch (e) {
                    console.error('Failed to fetch team member details for printing', e);
                }
            }
        }

        if (!data) {
            alert('لا توجد بيانات متاحة لطباعة استمارة العضوية حالياً.');
            return;
        }

        const html = getFormHTML(data);
        const printWindow = window.open('', '_blank', 'width=900,height=1200');
        if (!printWindow) {
            alert('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة (Pop-ups).');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    /**
     * Navigate back to landing page
     */
    const handleDone = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-slate-50 font-['Cairo']" dir="rtl">
            <div className="container mx-auto px-4 max-w-5xl py-12">
                {/* Logo Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex justify-center mb-8 no-print"
                >
                    <img
                        src={HUCLogo}
                        alt="نادي جامعة حلوان"
                        className="h-20 w-auto object-contain"
                    />
                </motion.div>

                {/* Success Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'circOut' }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6"
                    >
                        <CheckCircle className="w-16 h-16 text-green-600" strokeWidth={2.5} />
                    </motion.div>

                    <h1 className="text-4xl font-bold text-[#1a5f7a] mb-3">
                        تم التسجيل بنجاح!
                    </h1>
                    <p className="text-lg text-gray-600">
                        يرجى طباعة الاستمارة أدناه وتقديمها مع المستندات المطلوبة
                    </p>
                </motion.div>

                {/* Assignment Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: 'circOut' }}
                    className="bg-white rounded-3xl shadow-xl p-8 mb-8"
                >
                    {/* Card Header */}
                    <div className="text-center mb-6 no-print">
                        <h2 className="text-2xl font-bold text-[#1a5f7a] mb-2">
                            استمارة التعيين
                        </h2>
                        <p className="text-gray-600">
                            يمكنك تحميل أو طباعة الاستمارة من الأزرار أدناه
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8 no-print">
                        {/* Download Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-[#2596be] hover:bg-[#1a7a9a] text-white font-bold rounded-xl shadow-lg shadow-[#2596be]/20 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            تحميل الاستمارة
                        </motion.button>

                        {/* Print Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePrint}
                            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-[#2596be] hover:bg-[#1a7a9a] text-white font-bold rounded-xl shadow-lg shadow-[#2596be]/20 transition-all"
                        >
                            <Printer className="w-5 h-5" />
                            طباعة الاستمارة
                        </motion.button>
                    </div>

                    {/* Assignment Image Container */}
                    <div className="flex justify-center items-center bg-[#e8f4f8] rounded-2xl p-6 assignment-container">
                        <img
                            src={AssignmentImage}
                            alt="استمارة التعيين - نادي جامعة حلوان"
                            className="max-w-full h-auto rounded-xl shadow-lg assignment-image"
                        />
                    </div>
                </motion.div>

                {/* Navigation - Done Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-center no-print"
                >
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDone}
                        className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                    >
                        <Home className="w-5 h-5" />
                        العودة إلى الصفحة الرئيسية
                    </motion.button>
                </motion.div>

                {/* Print Instructions (visible when printing) */}
                <div className="print-only text-center mt-8 text-sm text-gray-600">
                    <p>نادي جامعة حلوان - استمارة التعيين</p>
                    <p className="mt-2">يرجى إحضار هذه الاستمارة مع المستندات المطلوبة</p>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-[#0e1c38] text-white pt-16 pb-10 rounded-t-[3rem] mt-16 no-print">
                <div className="container mx-auto px-6 max-w-5xl">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">

                        {/* Club Info Section */}
                        <div className="max-w-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <img
                                    src={HUCLogo}
                                    alt="نادي جامعة حلوان"
                                    className="w-16 h-16 object-contain bg-white rounded-lg p-2"
                                />
                                <div>
                                    <h3 className="font-bold text-2xl">نادي جامعة حلوان</h3>
                                    <p className="text-[#f8941c] font-medium">عراقة.. رياضة.. حياة</p>
                                </div>
                            </div>
                            <p className="text-gray-400 leading-relaxed font-normal">
                                وجهتك الأولى للرياضة والترفيه. نقدم لك مجتمع رياضي متكامل بخدمات عالمية تناسب كل أفراد الأسرة.
                            </p>
                        </div>

                        {/* Quick Links & Contact */}
                        <div className="grid grid-cols-2 gap-12">
                            {/* Quick Links */}
                            <div>
                                <h4 className="font-bold text-lg mb-6 text-white">روابط سريعة</h4>
                                <ul className="space-y-4 text-gray-400">
                                    <li>
                                        <button
                                            onClick={() => window.location.href = '/'}
                                            className="hover:text-indigo-400 transition-colors"
                                        >
                                            الرئيسية
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            onClick={() => window.location.href = '/re'}
                                            className="hover:text-indigo-400 transition-colors"
                                        >
                                            التسجيل
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            onClick={() => window.location.href = '/login'}
                                            className="hover:text-indigo-400 transition-colors"
                                        >
                                            تسجيل الدخول
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h4 className="font-bold text-lg mb-6 text-white">تواصل معنا</h4>
                                <ul className="space-y-4 text-gray-400 text-sm">
                                    <li className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-[#2596be]" />
                                        <a href="https://maps.app.goo.gl/QHexupLs17Y7u7rF6" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">الموقع على الخريطة</a>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-[#2596be]" />
                                        1913641
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-[#2596be]" />
                                        huc@hq.helwan.edu.eg
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-gray-500 text-sm">
                            © {new Date().getFullYear()} نادي جامعة حلوان — جميع الحقوق محفوظة
                        </p>

                        {/* Social Media Icons */}
                        <div className="flex gap-4">
                            <a
                                href="#"
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1877F2] transition-colors"
                                aria-label="Facebook"
                            >
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#E4405F] transition-colors"
                                aria-label="Instagram"
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#1DA1F2] transition-colors"
                                aria-label="Twitter"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Print-specific CSS */}
            <style>{`
                /* Hide everything except the image when printing */
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    
                    .assignment-container,
                    .assignment-container *,
                    .assignment-image,
                    .print-only,
                    .print-only * {
                        visibility: visible;
                    }
                    
                    .assignment-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    
                    .assignment-image {
                        max-width: 100%;
                        width: 100%;
                        height: auto;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .print-only {
                        display: block;
                        position: absolute;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 100%;
                    }
                }
                
                /* Hide print-only content on screen */
                @media screen {
                    .print-only {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default AssignmentPage;
