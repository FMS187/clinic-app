'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Building2,
  Stethoscope,
  Calendar,
  Clock,
  Camera,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Phone
} from 'lucide-react';

interface FacilityItem {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  whatsapp_number?: string;
  facility_type?: string;
  is_active?: boolean;
}

interface DoctorItem {
  id: string;
  name: string;
  specialty: string;
  consultation_fee: number;
  facility_id?: string;
}

const AVAILABLE_HOURS = [
  '09:00 صباحاً',
  '10:00 صباحاً',
  '11:00 صباحاً',
  '04:00 عصراً',
  '05:00 مساءً',
  '06:00 مساءً',
  '07:00 مساءً',
  '08:00 مساءً',
];

export default function BookingWizardPage() {
  const router = useRouter();

  // خطوة الحجز الحالية (من 1 إلى 6)
  const [step, setStep] = useState<number>(1);

  // البيانات المحملة من السيرفر
  const [clinics, setClinics] = useState<FacilityItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // مدخلات واختيارات المريض
  const [selectedClinic, setSelectedClinic] = useState<FacilityItem | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bookingTime, setBookingTime] = useState<string>(AVAILABLE_HOURS[0]);
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [medicalNotes, setMedicalNotes] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [paymentOption, setPaymentOption] = useState<'cash' | 'online'>('cash');

  // نتيجة الحجز النهائي والرمز السري
  const [completedBookingPin, setCompletedBookingPin] = useState<string | null>(null);

  // 1. جلب المنشآت الطبية المعتمدة والنشطة من جدول ClinicFacility
  useEffect(() => {
    async function loadActiveFacilities() {
      setLoadingData(true);
      setErrorMessage('');

      try {
        const { data, error } = await supabase
          .from('ClinicFacility')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          setClinics(data as FacilityItem[]);
        } else {
          // محاولة جلب بديلة في حال لم تكن حقول is_active مفعلة
          const { data: fallbackData } = await supabase
            .from('ClinicFacility')
            .select('*')
            .order('name', { ascending: true });
          if (fallbackData) {
            setClinics(fallbackData as FacilityItem[]);
          }
        }
      } catch (err: any) {
        setErrorMessage(
          err.message || 'تعذر تحميل قائمة العيادات المعتمدة، يرجى المحاولة لاحقاً.'
        );
      } finally {
        setLoadingData(false);
      }
    }

    loadActiveFacilities();
  }, []);

  // 2. تجهيز قائمة الأطباء عند اختيار المنشأة
  useEffect(() => {
    async function loadDoctorsForClinic() {
      if (!selectedClinic) {
        setDoctors([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('Doctor')
          .select('*')
          .eq('facility_id', selectedClinic.id);

        if (!error && data && data.length > 0) {
          setDoctors(data as DoctorItem[]);
          setSelectedDoctor(data[0] as DoctorItem);
        } else {
          // طبيب عام افتراضي للمنشأة
          const defaultDoc: DoctorItem = {
            id: 'general-doc',
            name: 'طبيب العيادة العام',
            specialty: 'كشف واستشارة طبية عامة',
            consultation_fee: 20,
            facility_id: selectedClinic.id,
          };
          setDoctors([defaultDoc]);
          setSelectedDoctor(defaultDoc);
        }
      } catch {
        const defaultDoc: DoctorItem = {
          id: 'general-doc',
          name: 'طبيب العيادة العام',
          specialty: 'كشف واستشارة طبية عامة',
          consultation_fee: 20,
          facility_id: selectedClinic.id,
        };
        setDoctors([defaultDoc]);
        setSelectedDoctor(defaultDoc);
      }
    }

    loadDoctorsForClinic();
  }, [selectedClinic]);

  // دالة التقاط ملف الفحص
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  // دالة تأكيد وإرسال الحجز النهائي
  const handleFinalSubmit = async () => {
    if (!selectedClinic) {
      setErrorMessage('يرجى اختيار المنشأة الطبية أولاً');
      return;
    }
    if (!patientName.trim() || !patientPhone.trim()) {
      setErrorMessage('يرجى إدخال اسم المريض ورقم الجوال للتواصل');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    // توليد رمز PIN عشوائي من 4 خانات لتأكيد الحضور
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      let uploadedPhotoUrl = '';

      // رفع الصورة السحابية إن وجدت
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split('.').pop() || 'jpg';
          const fileName = `preop_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          const filePath = `booking-attachments/${fileName}`;

          const { error: photoErr } = await supabase.storage
            .from('clinic-licenses')
            .upload(filePath, photoFile);

          if (!photoErr) {
            const { data: urlData } = supabase.storage
              .from('clinic-licenses')
              .getPublicUrl(filePath);
            uploadedPhotoUrl = urlData?.publicUrl || filePath;
          }
        } catch {
          console.warn('تجاوز رفع الصورة وحفظ الحجز');
        }
      }

      // حفظ الحجز في جدول Booking
      const newBookingRecord = {
        facility_id: selectedClinic.id,
        facility_name: selectedClinic.name,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        doctor_name: selectedDoctor?.name || 'طبيب عام',
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'pending',
        checkin_pin: generatedPin,
        deposit_amount: 20,
        payment_method: paymentOption,
        medical_notes: medicalNotes.trim() || null,
        preop_photo_url: uploadedPhotoUrl || null,
      };

      const { data, error } = await supabase
        .from('Booking')
        .insert([newBookingRecord])
        .select()
        .single();

      if (error) {
        throw new Error(`خطأ أثناء تسجيل الحجز: ${error.message}`);
      }

      setCompletedBookingPin(generatedPin);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء تأكيد الحجز، يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  // واجهة اكتمال الحجز وعرض الرمز السري
  if (completedBookingPin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-4xl">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">تم تأكيد حجز موعدك بنجاح!</h2>
            <p className="text-xs text-slate-400 mt-2">
              يرجى الاحتفاظ برمز الـ PIN وإبرازه لموظف استقبال العيادة عند وصولك
            </p>
          </div>

          <div className="p-6 bg-slate-950 border-2 border-amber-500/50 rounded-2xl">
            <span className="text-xs text-amber-400 block font-bold mb-1">رمز تأكيد الحضور (PIN):</span>
            <div className="text-4xl font-mono font-black text-amber-300 tracking-widest">
              {completedBookingPin}
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl text-xs text-slate-300 text-right space-y-2 border border-slate-800">
            <div><strong>المنشأة الطبية:</strong> {selectedClinic?.name}</div>
            <div><strong>الطبيب:</strong> {selectedDoctor?.name} ({selectedDoctor?.specialty})</div>
            <div><strong>الموعد:</strong> {bookingDate} - {bookingTime}</div>
            <div><strong>المريض:</strong> {patientName} ({patientPhone})</div>
          </div>

          <button
            onClick={() => {
              setCompletedBookingPin(null);
              setStep(1);
              setSelectedClinic(null);
              setSelectedDoctor(null);
              setPatientName('');
              setPatientPhone('');
              setMedicalNotes('');
              setPhotoFile(null);
            }}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition shadow-lg shadow-teal-600/20"
          >
            حجز موعد طبي جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* رأس المعالج */}
        <div className="text-center space-y-2">
          <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-full text-xs font-bold inline-block">
            منصة الحجز الطبي الموحد
          </span>
          <h1 className="text-3xl font-black text-white">حجز موعد لدى منشأة طبية معتمدة</h1>
          <p className="text-xs text-slate-400">
            اختر العيادة المعتمدة واحجز كشفك الطبي بكل سهولة
          </p>
        </div>

        {/* شريط خطوات الحجز الستة */}
        <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs">
          {[
            { num: 1, title: 'المنشأة' },
            { num: 2, title: 'الطبيب' },
            { num: 3, title: 'الموعد' },
            { num: 4, title: 'البيانات' },
            { num: 5, title: 'المرفقات' },
            { num: 6, title: 'التأكيد' },
          ].map((item) => (
            <div
              key={item.num}
              className={`flex flex-col items-center gap-1 ${
                step === item.num
                  ? 'text-teal-400 font-bold'
                  : step > item.num
                  ? 'text-emerald-400'
                  : 'text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${
                  step === item.num
                    ? 'border-teal-500 bg-teal-500/20 text-teal-300'
                    : step > item.num
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-500'
                }`}
              >
                {step > item.num ? '✓' : item.num}
              </div>
              <span className="hidden sm:inline text-[11px]">{item.title}</span>
            </div>
          ))}
        </div>

        {/* شريط الأخطاء */}
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* محتوى الخطوات */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">

          {/* الخطوة 1: اختيار المنشأة الطبية */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Building2 className="w-5 h-5 text-teal-500" />
                <h2 className="text-base font-bold text-white">الخطوة 1: اختر المنشأة الطبية المعتمدة</h2>
              </div>

              {loadingData ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                  جارٍ تحميل قائمة العيادات المعتمدة...
                </div>
              ) : clinics.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <Building2 className="w-8 h-8 mx-auto text-slate-600" />
                  <p>لا توجد منشآت طبية معتمدة متاحة للحجز حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {clinics.map((clinic) => {
                    const isSelected = selectedClinic?.id === clinic.id;
                    return (
                      <div
                        key={clinic.id}
                        onClick={() => setSelectedClinic(clinic)}
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-500/10 border-teal-500 text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-sm flex items-center gap-2 text-white">
                            {clinic.name}
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] rounded-full">
                              معتمدة رسمياً ✓
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {clinic.city} - {clinic.address}
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-teal-500 bg-teal-500 text-slate-950 font-bold text-xs'
                              : 'border-slate-700'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* الخطوة 2: اختيار الطبيب */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Stethoscope className="w-5 h-5 text-teal-500" />
                <h2 className="text-base font-bold text-white">الخطوة 2: اختر الطبيب المعالج</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-teal-500/10 border-teal-500 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-white">{doc.name}</div>
                        <div className="text-xs text-teal-400">{doc.specialty}</div>
                      </div>

                      <div className="text-left font-mono text-xs font-bold text-emerald-400">
                        {doc.consultation_fee || 20} $
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* الخطوة 3: تحديد التاريخ والوقت */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Calendar className="w-5 h-5 text-teal-500" />
                <h2 className="text-base font-bold text-white">الخطوة 3: تحديد يوم وساعة الموعد</h2>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  تاريخ الحجز المطلوب:
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-300">
                  الأوقات المتاحة للحجز:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AVAILABLE_HOURS.map((hour) => {
                    const isSelected = bookingTime === hour;
                    return (
                      <button
                        type="button"
                        key={hour}
                        onClick={() => setBookingTime(hour)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition border ${
                          isSelected
                            ? 'bg-teal-600 border-teal-500 text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {hour}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* الخطوة 4: بيانات المريض الشخصية */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-5 h-5 text-teal-500" />
                <h2 className="text-base font-bold text-white">الخطوة 4: بيانات المريض للتواصل</h2>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">اسم المريض الرباعي:</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله الشامي"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">رقم الهاتف (واتساب):</label>
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="770000000"
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">
                  وصف موجز للحالة أو الأعراض (اختياري):
                </label>
                <textarea
                  rows={3}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="أدخل أي ملاحظات تساعد الطبيب في تقييم الموعد..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* الخطوة 5: رفع الفحوصات أو الصور المسبقة */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Camera className="w-5 h-5 text-teal-500" />
                <h2 className="text-base font-bold text-white">الخطوة 5: إرفاق تحاليل أو صور سابقة (اختياري)</h2>
              </div>

              <div className="p-6 border-2 border-dashed border-slate-700 rounded-2xl text-center space-y-3 bg-slate-950/40">
                <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  يمكنك رفع صورة لتقرير سابق أو تحليل مخبري لاطلاع الطبيب قبل الحضور
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePhotoUpload}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600/20 file:text-teal-400 hover:file:bg-teal-600 hover:file:text-white cursor-pointer"
                />
                {photoFile && (
                  <div className="text-xs text-emerald-400 font-bold pt-2">
                    ✓ تم اختيار الملف: {photoFile.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* الخطوة 6: طريقة الدفع ومراجعة التأكيد */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <CreditCard className="w-5 h-5 text-teal-500" />
                <h2 className="text-base font-bold text-white">الخطوة 6: تأكيد الحجز وخيار الدفع</h2>
              </div>

              {/* ملخص الحجز */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="text-teal-400 font-bold text-sm border-b border-slate-800 pb-2">
                  ملخص تفاصيل الموعد الطبي:
                </div>
                <div><strong>المنشأة الطبية:</strong> {selectedClinic?.name} ({selectedClinic?.city})</div>
                <div><strong>الطبيب:</strong> {selectedDoctor?.name} - {selectedDoctor?.specialty}</div>
                <div><strong>الموعد:</strong> {bookingDate} الساعة {bookingTime}</div>
                <div><strong>المريض:</strong> {patientName} - {patientPhone}</div>
              </div>

              {/* خيارات الدفع */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">اختر طريقة السداد:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentOption('cash')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition text-xs font-bold flex items-center justify-between ${
                      paymentOption === 'cash'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>💵 دفع نقدي عند الحضور للاستقبال</span>
                    <span>{paymentOption === 'cash' ? '✓' : ''}</span>
                  </div>

                  <div
                    onClick={() => setPaymentOption('online')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition text-xs font-bold flex items-center justify-between ${
                      paymentOption === 'online'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>💳 محفظة إلكترونية / دفع أونلاين</span>
                    <span>{paymentOption === 'online' ? '✓' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* أزرار التنقل (السابق / التالي / التأكيد النهائي) */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-800 mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => prev - 1)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <ChevronRight className="w-4 h-4" /> الخطوة السابقة
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !selectedClinic) {
                    setErrorMessage('يرجى اختيار العيادة للمتابعة');
                    return;
                  }
                  if (step === 4 && (!patientName.trim() || !patientPhone.trim())) {
                    setErrorMessage('يرجى كتابة الاسم ورقم الهاتف للمتابعة');
                    return;
                  }
                  setErrorMessage('');
                  setStep((prev) => prev + 1);
                }}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/20"
              >
                المتابعة للخطوة التالية <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارٍ تأكيد الحجز وإصدار PIN...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> تأكيد الحجز وإصدار التذكرة
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
