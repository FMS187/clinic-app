'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function RegisterClinicPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // متغيرات حفظ البيانات المدخلة في الفورم
  const [clinicName, setClinicName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('صنعاء');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  // متغيرات إدارة حالة التحميل وظهور الرسائل
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // دالة التقاط الملف عند اختياره من الجهاز
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  // دالة إرسال البيانات وحفظ المنشأة
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // التحقق من رفع وثيقة الترخيص
      if (!licenseFile) {
        throw new Error('يرجى إرفاق صورة أو وثيقة الترخيص الطبي الرسمية');
      }

      // 1. تسجيل الحساب للمدير في نظام المصادقة (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: managerName,
            phone: phone,
            role: 'clinic_manager',
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('تعذر إتمام التسجيل، يرجى إعادة المحاولة.');
      }

      const userId = authData.user.id;

      // 2. رفع وثيقة الترخيص الطبي لمجلد التخزين (Storage Bucket)
      const fileExtension = licenseFile.name.split('.').pop();
      const uniqueFileName = `${userId}-${Date.now()}.${fileExtension}`;
      const filePath = `licenses/${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('clinic-licenses')
        .upload(filePath, licenseFile);

      if (uploadError) {
        throw uploadError;
      }

      // 3. استخراج الرابط العام للوثيقة
      const { data: publicUrlData } = supabase.storage
        .from('clinic-licenses')
        .getPublicUrl(filePath);

      const finalDocumentUrl = publicUrlData ? publicUrlData.publicUrl : filePath;

      // 4. إدخال المنشأة الجديدة في جدول tenants بحالة قيد المراجعة (pending)
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([
          {
            name: clinicName,
            phone: phone,
            city: city,
            address: address,
            license_number: licenseNumber,
            license_document_url: finalDocumentUrl,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (tenantError) {
        throw tenantError;
      }

      // 5. ربط حساب المدير الحالي بالمنشأة عبر جدول profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            tenant_id: tenantData.id,
            role: 'clinic_manager',
            full_name: managerName,
            phone: phone,
          },
        ]);

      if (profileError) {
        throw profileError;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // شاشة النجاح بعد اكتمال التسجيل
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl font-bold">
            ⏳
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">تم تقديم طلب التسجيل بنجاح!</h2>
          <p className="text-slate-600 mb-6 leading-relaxed text-sm">
            تم استلام بيانات منشأتكم الطبية وملف الترخيص. الحساب حالياً في وضع <span className="font-bold text-amber-600">قيد المراجعة والتدقيق</span> للتأكد من سريان الترخيص. سيتم إشعاركم وتفعيل الحساب للظهور في المنصة فور اعتماده من الإدارة.
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

  // شاشة فورم التسجيل
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
          <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 text-red-700 text-sm rounded-lg">
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
            {loading ? 'جارٍ رفع الوثائق وتسجيل المنشأة...' : 'إرسال طلب التسجيل للاعتماد'}
          </button>
        </form>
      </div>
    </div>
  );
}
