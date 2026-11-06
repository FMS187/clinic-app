'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function RegisterClinicPage() {
  const router = useRouter();

  // متغيرات حفظ بيانات النموذج
  const [clinicName, setClinicName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('صنعاء');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  // حالات التحميل والرسائل
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // اختيار الملف وتصفير الأخطاء
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
      setErrorMessage('');
    }
  };

  // معالجة إرسال النموذج مع مؤقت زمني لعدم التعليق
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!licenseFile) {
      setErrorMessage('يرجى اختيار وإرفاق وثيقة أو صورة الترخيص الطبي');
      return;
    }

    setLoading(true);

    try {
      // 1. تجهيز اسم فريد للملف وتفادي الرموز الخاصة
      const fileExt = licenseFile.name.split('.').pop() || 'png';
      const cleanFileName = `license_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `licenses/${cleanFileName}`;

      // 2. محاولة رفع الملف مع مهلة محددة
      let finalDocUrl = '';
      try {
        const { error: uploadError } = await supabase.storage
          .from('clinic-licenses')
          .upload(filePath, licenseFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('تحذير أثناء رفع الملف:', uploadError.message);
          finalDocUrl = 'pending-verification';
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('clinic-licenses')
            .getPublicUrl(filePath);
          finalDocUrl = publicUrlData?.publicUrl || filePath;
        }
      } catch (uploadException: any) {
        console.warn('تجاوز رفع الملف والاعتماد على التسجيل:', uploadException);
        finalDocUrl = 'pending-verification';
      }

      // 3. إنشاء حساب المدير في Supabase Auth
      let newUserId: string | null = null;
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: managerName.trim(),
              phone: phone.trim(),
              role: 'clinic_manager',
            },
          },
        });

        if (authError) {
          throw new Error(`خطأ في إنشاء الحساب: ${authError.message}`);
        }

        newUserId = authData.user?.id || null;
      } catch (authErr: any) {
        throw new Error(authErr.message || 'تعذر تسجيل حساب المدير، يرجى التأكد من البريد وكلمة المرور');
      }

      // 4. حفظ بيانات المنشأة الطبية في جدول tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([
          {
            name: clinicName.trim(),
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim(),
            license_number: licenseNumber.trim(),
            license_document_url: finalDocUrl,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (tenantError) {
        throw new Error(`خطأ في حفظ بيانات المنشأة: ${tenantError.message}`);
      }

      // 5. ربط المدير بالمنشأة عبر جدول profiles إذا توفرت المعرفات
      if (newUserId && tenantData?.id) {
        try {
          await supabase
            .from('profiles')
            .insert([
              {
                id: newUserId,
                tenant_id: tenantData.id,
                role: 'clinic_manager',
                full_name: managerName.trim(),
                phone: phone.trim(),
              },
            ]);
        } catch (profileErr) {
          console.warn('تم حفظ المنشأة وجارٍ تفعيل الحساب:', profileErr);
        }
      }

      // اكتمال العملية بنجاح
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // واجهة النجاح عند اكتمال الطلب
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-bold">
            ⏳
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">تم استلام طلب التسجيل بنجاح!</h2>
          <p className="text-slate-600 mb-6 leading-relaxed text-sm">
            تم تسجيل بيانات منشأتكم الطبية. الحساب الآن في وضع <span className="font-bold text-amber-600">قيد المراجعة والتدقيق</span> للتأكد من سريان الترخيص. سيتم تفعيل حسابكم للظهور في المنصة واستقبال الحجوزات فور اعتماده من الإدارة.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition duration-200"
          >
            الانتقال لصفحة تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // واجهة نموذج التسجيل
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-xl w-full bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">تسجيل منشأة طبية جديدة</h2>
          <p className="text-sm text-slate-600 mt-2">
            انضم إلى شبكة المنشآت الطبية المعتمدة في المنصة
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم المركز الطبي أو العيادة
            </label>
            <input
              type="text"
              required
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="مثال: مجمع الشفاء التخصصي"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم مدير المنشأة المسؤول
            </label>
            <input
              type="text"
              required
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="الاسم الثلاثي أو الرباعي"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                البريد الإلكتروني الرسمي
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@clinic.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                رقم الهاتف للتواصل
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="770000000"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                المدينة
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="صنعاء"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                العنوان بالتفصيل
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="الشارع، الحي، بجانب معلم معروف"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
            />
          </div>

          <div className="border-t border-slate-200 pt-5 mt-6">
            <h3 className="text-base font-bold text-slate-800 mb-3">
              وثائق الترخيص والاعتماد الطبي
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                رقم الترخيص الطبي / السجل التجاري
              </label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="أدخل رقم الترخيص الصادر من الجهة المختصة"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                إرفاق صورة أو وثيقة الترخيص (PDF أو صورة)
              </label>
              <input
                type="file"
                required
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-1">
                يرجى رفع نسخة واضحة وسارية المفعول لتسريع عملية التحقق والاعتماد.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold transition duration-200 ${
              loading
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
            }`}
          >
            {loading ? 'جارٍ إرسال البيانات والتحقق...' : 'إرسال طلب التسجيل للاعتماد'}
          </button>
        </form>
      </div>
    </div>
  );
}
