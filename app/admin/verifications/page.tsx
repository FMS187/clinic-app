'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface TenantVerification {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  license_number: string;
  license_document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at?: string;
}

export default function AdminVerificationPage() {
  const [tenants, setTenants] = useState<TenantVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalTenant, setRejectModalTenant] = useState<TenantVerification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // جلب المنشآت من قاعدة البيانات
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setTenants(data as TenantVerification[]);
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `فشل جلب البيانات: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // دالة اعتماد المنشأة الطبية
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setActionMessage(null);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', id);

      if (error) throw error;

      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'approved', rejection_reason: undefined } : t))
      );

      setActionMessage({ type: 'success', text: 'تم اعتماد المنشأة الطبية بنجاح وتفعيل ظهورها للمرضى!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `خطأ أثناء الاعتماد: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  // دالة تأكيد رفض المنشأة الطبية مع توضيح السبب
  const handleConfirmReject = async () => {
    if (!rejectModalTenant) return;
    if (!rejectionReason.trim()) {
      alert('يرجى كتابة سبب رفض الترخيص لإشعار المنشأة به.');
      return;
    }

    setProcessingId(rejectModalTenant.id);
    setActionMessage(null);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          verified_at: new Date().toISOString(),
        })
        .eq('id', rejectModalTenant.id);

      if (error) throw error;

      setTenants((prev) =>
        prev.map((t) =>
          t.id === rejectModalTenant.id
            ? { ...t, status: 'rejected', rejection_reason: rejectionReason.trim() }
            : t
        )
      );

      setActionMessage({ type: 'success', text: 'تم رفض طلب المنشأة وتوثيق سبب الرفض بنجاح.' });
      setRejectModalTenant(null);
      setRejectionReason('');
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `خطأ أثناء الرفض: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  // تصفية العيادات المعروضة بناءً على التبويب
  const filteredTenants = tenants.filter((tenant) => {
    if (filter === 'all') return true;
    return tenant.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              🛡️ لوحة اعتماد المنشآت الطبية
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              مراجعة التراخيص الرسمية والبت في طلبات انضمام العيادات والمراكز للمنصة
            </p>
          </div>

          <button
            onClick={fetchTenants}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            🔄 تحديث القائمة
          </button>
        </div>

        {/* رسائل التنبيه والنجاح */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-sm font-bold border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* تبويبات التصفية */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === 'pending'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ⏳ قيد المراجعة ({tenants.filter((t) => t.status === 'pending').length})
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === 'approved'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ✅ المعتمدة ({tenants.filter((t) => t.status === 'approved').length})
          </button>

          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === 'rejected'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ❌ المرفوضة ({tenants.filter((t) => t.status === 'rejected').length})
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filter === 'all'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            الكل ({tenants.length})
          </button>
        </div>

        {/* جدول عرض المنشآت */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            جارٍ تحميل بيانات المنشآت الطبية...
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800 p-8">
            <span className="text-4xl block mb-2">📋</span>
            <p className="text-slate-400 text-sm">لا توجد منشآت مطابقة لهذا التصنيف حالياً.</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-4 font-bold">اسم المنشأة</th>
                    <th className="p-4 font-bold">الموقع</th>
                    <th className="p-4 font-bold">رقم التواصل</th>
                    <th className="p-4 font-bold">رقم الترخيص</th>
                    <th className="p-4 font-bold">وثيقة الترخيص</th>
                    <th className="p-4 font-bold">الحالة الحالية</th>
                    <th className="p-4 font-bold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredTenants.map((t) => {
                    const isProcessing = processingId === t.id;
                    const hasValidDoc = t.license_document_url && t.license_document_url !== 'pending-document';

                    return (
                      <tr key={t.id} className="hover:bg-slate-750 transition">
                        <td className="p-4 font-bold text-white text-sm">
                          {t.name}
                          {t.rejection_reason && (
                            <span className="block text-[11px] text-rose-400 font-normal mt-1">
                              سبب الرفض: {t.rejection_reason}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-slate-300">
                          {t.city} - {t.address}
                        </td>

                        <td className="p-4 font-mono text-slate-300">
                          {t.phone}
                        </td>

                        <td className="p-4 font-mono font-bold text-amber-300">
                          {t.license_number || 'غير مدخل'}
                        </td>

                        <td className="p-4">
                          {hasValidDoc ? (
                            <a
                              href={t.license_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 rounded-lg text-xs font-bold transition"
                            >
                              📄 فتح الوثيقة
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px]">لا يوجد ملف</span>
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${
                              t.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : t.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {t.status === 'approved'
                              ? 'معتمدة ومفعلة'
                              : t.status === 'rejected'
                              ? 'مرفوضة'
                              : 'قيد المراجعة'}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {t.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(t.id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                              >
                                {isProcessing ? '...' : 'اعتماد'}
                              </button>
                            )}

                            {t.status !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setRejectModalTenant(t);
                                  setRejectionReason('');
                                }}
                                disabled={isProcessing}
                                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 font-bold rounded-lg transition disabled:opacity-50"
                              >
                                رفض
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* نافذة تحديد سبب الرفض */}
        {rejectModalTenant && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 border border-slate-700 p-6 rounded-3xl shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ⚠️ رفض طلب اعتماد المنشأة: ({rejectModalTenant.name})
              </h3>
              <p className="text-xs text-slate-400">
                يرجى كتابة سبب الرفض بوضوح ليتمكن مسؤولو المنشأة من تصحيح بياناتهم أو رفع وثيقة سارية المفعول:
              </p>

              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: رقم الترخيص الطبي غير مطابق للوثيقة المرفقة، أو الوثيقة منتهية الصلاحية."
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-rose-500"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTenant(null)}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-600 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={processingId === rejectModalTenant.id}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
                >
                  {processingId === rejectModalTenant.id ? 'جارٍ الرفض...' : 'تأكيد الرفض'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
