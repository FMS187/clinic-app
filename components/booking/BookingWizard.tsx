'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  MapPin, Calendar, Camera, CreditCard, CheckCircle, 
  Navigation, Clock, ChevronLeft, 
  Loader2, UploadCloud, Sparkles, ShieldCheck, PhoneCall,
  Smile, AlertTriangle
} from 'lucide-react';

type BookingState = {
  tenantId: string;
  branchId: string;
  branchName: string;
  branchCity: string;
  branchLat: number;
  branchLng: number;
  category: 'dental' | 'derma';
  serviceId?: string;
  serviceName?: string;
  depositAmount?: number;
  totalPrice?: number;
  doctorId?: string | number;
  doctorName?: string;
  doctorTitle?: string;
  date?: string;
  timeSlot?: string;
  mediaKeys: string[];
  patientName: string;
  patientPhone: string;
  paymentMethod: 'PAY_ONLINE' | 'PAY_AT_CLINIC';
};

const YEMEN_BRANCHES = [
  { 
    id: 'b-sanaa-1', 
    name: 'فرع حدة التخصصي', 
    city: 'صنعاء', 
    address: 'شارع حدة، بجوار مركز الكميم، صنعاء', 
    lat: 15.3188, 
    lng: 44.1852,
    phone: '01-411222'
  },
  { 
    id: 'b-sanaa-2', 
    name: 'فرع عيادات الستين والسبعين', 
    city: 'صنعاء', 
    address: 'تقاطع الستين الجنوبي، مقابل حديقة السبعين', 
    lat: 15.3340, 
    lng: 44.2050,
    phone: '01-244333'
  },
  { 
    id: 'b-aden-1', 
    name: 'فرع خور مكسر الطبي', 
    city: 'عدن', 
    address: 'حي السفارات، بجوار فندق عدن، خور مكسر', 
    lat: 12.8275, 
    lng: 45.0390,
    phone: '02-233444'
  },
  { 
    id: 'b-aden-2', 
    name: 'فرع المنصورة والشيخ عثمان', 
    city: 'عدن', 
    address: 'شارع التسعين، ريمي، المنصورة', 
    lat: 12.8630, 
    lng: 44.9850,
    phone: '02-388555'
  }
];

const CLINIC_SERVICES = {
  dental: [
    { id: 'd1', name: 'ابتسامة هوليود وفينير E-max', durationMins: 60, depositAmount: 30, totalPrice: 150, desc: 'تصميم ابتسامة رقمي وعدسات خزفية مقاومة للتصبغ' },
    { id: 'd2', name: 'تبييض الأسنان بتقنية الفلاش / الليزر', durationMins: 45, depositAmount: 15, totalPrice: 60, desc: 'تبييض عميق وآمن يفتح حتى 8 درجات' },
    { id: 'd3', name: 'زراعة الأسنان الفورية وتطعيم العظم', durationMins: 60, depositAmount: 50, totalPrice: 300, desc: 'زراعة سويسرية بأحدث أنظمة التوجيه ثلاثي الأبعاد' },
    { id: 'd4', name: 'تقويم الأسنان الشفاف (Invisalign)', durationMins: 40, depositAmount: 25, totalPrice: 200, desc: 'تقويم خفي بدون أسلاك معدنية بمتابعة دورية' },
    { id: 'd5', name: 'تنظيف الجير وتلميع الأسنان وعلاج اللثة', durationMins: 30, depositAmount: 10, totalPrice: 25, desc: 'إزالة كاملة للترسبات وحماية اللثة' }
  ],
  derma: [
    { id: 'c1', name: 'حقن الفيلر التجميلي (شفاه / تحديد الفك)', durationMins: 35, depositAmount: 20, totalPrice: 110, desc: 'مواد معتمدة تعطي نتائج طبيعية وفورية' },
    { id: 'c2', name: 'جلسة البوتوكس لإزالة التجاعيد', durationMins: 25, depositAmount: 20, totalPrice: 90, desc: 'علاج تجاعيد الجبهة وحول العين' },
    { id: 'c3', name: 'إبر النضارة والبروفايلو (Profhilo)', durationMins: 30, depositAmount: 25, totalPrice: 130, desc: 'تحفيز الكولاجين العميق وشد البشرة' },
    { id: 'c4', name: 'إزالة الشعر بأحدث أجهزة الليزر', durationMins: 45, depositAmount: 15, totalPrice: 50, desc: 'تبريد عالي ونتائج فعالة وآمنة' },
    { id: 'c5', name: 'جلسات الهيدرافيشل لتنظيف البشرة العميق', durationMins: 50, depositAmount: 10, totalPrice: 40, desc: 'تنظيف المسام وتغذية طبقات الجلد' }
  ]
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState<BookingState>({
    tenantId: '00000000-0000-0000-0000-000000000000',
    category: 'dental',
    branchId: YEMEN_BRANCHES[0].id,
    branchName: YEMEN_BRANCHES[0].name,
    branchCity: YEMEN_BRANCHES[0].city,
    branchLat: YEMEN_BRANCHES[0].lat,
    branchLng: YEMEN_BRANCHES[0].lng,
    mediaKeys: [],
    paymentMethod: 'PAY_AT_CLINIC',
    patientName: '',
    patientPhone: ''
  });

  const updateData = (data: Partial<BookingState>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 6));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="flex flex-col">
      <div className="bg-slate-100 h-2 w-full">
        <div 
          className="bg-teal-600 h-2 transition-all duration-500 ease-in-out" 
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between text-xs sm:text-sm font-medium text-slate-500 overflow-x-auto">
        <span className={step >= 1 ? 'text-teal-700 font-bold' : ''}>1. الفرع والخريطة</span>
        <span className={step >= 2 ? 'text-teal-700 font-bold' : ''}>2. الخدمة والطبيب</span>
        <span className={step >= 3 ? 'text-teal-700 font-bold' : ''}>3. الموعد</span>
        <span className={step >= 4 ? 'text-teal-700 font-bold' : ''}>4. فحص الحالة</span>
        <span className={step >= 5 ? 'text-teal-700 font-bold' : ''}>5. التأكيد والسداد</span>
      </div>

      <div className="p-6 sm:p-8 flex-grow">
        {step === 1 && <Step1BranchLocation data={bookingData} update={updateData} next={nextStep} />}
        {step === 2 && <Step2ExpandedServices data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 3 && <Step3Schedule data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 4 && <Step4ConsultationMedia data={bookingData} update={updateData} next={nextStep} prev={prevStep} />}
        {step === 5 && <Step5ReviewCheckout data={bookingData} update={updateData} next={nextStep} prev={prevStep} setLoading={setLoading} loading={loading} />}
        {step === 6 && <Step6SuccessDirectMaps data={bookingData} />}
      </div>
    </div>
  );
}

function Step1BranchLocation({ data, update, next }: any) {
  const [branches, setBranches] = useState(YEMEN_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState(
    YEMEN_BRANCHES.find(b => b.id === data.branchId) || YEMEN_BRANCHES[0]
  );
  const [locating, setLocating] = useState(false);

  const handleSelectBranch = (b: any) => {
    setSelectedBranch(b);
    update({
      branchId: b.id,
      branchName: b.name,
      branchCity: b.city,
      branchLat: b.lat,
      branchLng: b.lng
    });
  };

  const locateUserInYemen = () => {
    setLocating(true);
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert("خاصية تحديد الموقع غير مدعومة في متصفحك");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const sorted = [...branches].map(b => ({
          ...b,
          distance: calculateDistance(latitude, longitude, b.lat, b.lng)
        })).sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));

        setBranches(sorted);
        handleSelectBranch(sorted[0]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert("يرجى تفعيل الـ GPS لتحديد أقرب فرع إليك تلقائياً");
      }
    );
  };

  const mapIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedBranch.lng - 0.015}%2C${selectedBranch.lat - 0.015}%2C${selectedBranch.lng + 0.015}%2C${selectedBranch.lat + 0.015}&layer=mapnik&marker=${selectedBranch.lat}%2C${selectedBranch.lng}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-teal-600 w-6 h-6" /> اختر الفرع وتصفح الموقع
          </h2>
          <p className="text-slate-500 text-sm mt-1">فروعنا المعتمدة في الجمهورية اليمنية (صنعاء، عدن)</p>
        </div>
        <button 
          onClick={locateUserInYemen}
          disabled={locating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl text-sm font-medium hover:bg-teal-100 transition shadow-sm"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          تحديد أقرب فرع لموقعي
        </button>
      </div>

      <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-300 shadow-inner">
        <div className="bg-slate-800 text-white text-xs px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-teal-400" />
            الموقع المباشر على الخريطة: {selectedBranch.name} ({selectedBranch.city})
          </span>
          <span className="text-slate-400">معاينة تفاعلية</span>
        </div>
        <div className="w-full h-60 sm:h-72 bg-slate-200 relative">
          <iframe 
            title="Clinic Location"
            src={mapIframeUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {branches.map(branch => {
          const isSelected = selectedBranch.id === branch.id;
          const dist = (branch as any).distance;
          return (
            <div 
              key={branch.id}
              onClick={() => handleSelectBranch(branch)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                isSelected ? 'border-teal-600 bg-teal-50/70 shadow-md ring-2 ring-teal-600/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                      {branch.city}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{branch.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {branch.address}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-400" /> {branch.phone}
                  </p>
                </div>
                {dist !== undefined && (
                  <span className="text-[11px] font-bold bg-teal-100 text-teal-800 px-2 py-1 rounded-full whitespace-nowrap">
                    يبعد {dist.toFixed(1)} كم
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={next}
        className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20"
      >
        تأكيد واختيار الفرع ({selectedBranch.name}) <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

function Step2ExpandedServices({ data, update, next, prev }: any) {
  const [activeTab, setActiveTab] = useState<'dental' | 'derma'>(data.category || 'dental');
  const [dbDoctors, setDbDoctors] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadDoctors = async () => {
      setLoadingDocs(true);
      try {
        const { data: doctorsData, error } = await supabase
          .from('Doctor')
          .select('*');

        if (isMounted) {
          if (!error && doctorsData && doctorsData.length > 0) {
            setDbDoctors(doctorsData);
          } else {
            setDbDoctors([
              { id: '1', name: 'د. سامي المقطري', specialty: 'استشاري جراحة وتجميل الفم والأسنان', category: 'dental' },
              { id: '2', name: 'د. مروة الشرجبي', specialty: 'أخصائية تقويم وتجميل الأسنان الرقمي', category: 'dental' },
              { id: '3', name: 'د. لمياء اليافعي', specialty: 'استشارية الأمراض الجلدية والليزر والحقن التجميلي', category: 'derma' },
              { id: '4', name: 'د. حسام العديني', specialty: 'أخصائي العلاج بالليزر والعناية بالبشرة والندبات', category: 'derma' }
            ]);
          }
        }
      } catch {
        if (isMounted) setDbDoctors([]);
      }
      if (isMounted) setLoadingDocs(false);
    };

    loadDoctors();
    return () => { isMounted = false; };
  }, []);

  const currentServices = CLINIC_SERVICES[activeTab];
  const eligibleDoctors = dbDoctors.filter(d => d.category === activeTab);

  const handleCategorySwitch = (cat: 'dental' | 'derma') => {
    setActiveTab(cat);
    update({ 
      category: cat, 
      serviceId: undefined, 
      serviceName: undefined,
      depositAmount: undefined,
      totalPrice: undefined,
      doctorId: undefined,
      doctorName: undefined
    });
  };

  const isComplete = data.serviceId && data.doctorId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">اختر القسم والخدمة المطلوبة</h2>
        <p className="text-slate-500 text-sm mt-1">نخبة من الاستشاريين وأحدث التقنيات الطبية الحديثة</p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-100 p-1.5 rounded-2xl">
        <button
          onClick={() => handleCategorySwitch('dental')}
          className={`py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'dental' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smile className="w-5 h-5 text-teal-600" /> قسم طب وجراحة الأسنان
        </button>
        <button
          onClick={() => handleCategorySwitch('derma')}
          className={`py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'derma' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-5 h-5 text-rose-500" /> قسم الجلدية والتجميل والليزر
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700 text-sm">الخدمات التخصصية المتاحة:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentServices.map(srv => {
            const isSelected = data.serviceId === srv.id;
            return (
              <div 
                key={srv.id}
                onClick={() => update({ 
                  serviceId: srv.id, 
                  serviceName: srv.name, 
                  depositAmount: srv.depositAmount,
                  totalPrice: srv.totalPrice
                })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  isSelected ? 'border-teal-600 bg-teal-50/60 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">{srv.name}</h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ${srv.totalPrice} تقريباً
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{srv.desc}</p>
                <div className="
