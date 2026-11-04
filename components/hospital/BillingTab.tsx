'use client';

import React, { useState } from 'react';
import { 
  CreditCard, Wallet, AlertTriangle, Copy, Check, 
  MessageSquareShare, Eye, X, Download, CheckCircle2 
} from 'lucide-react';

export interface CompletedBookingDetail {
  id: string | number;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  booking_date: string;
  consultation_fee?: number;
  platform_fee?: number;
}

interface BillingTabProps {
  facilityName: string;
  currentDebt: number;
  creditLimit: number;
  commissionRate: number;
  isSuspended: boolean;
  completedBookings?: CompletedBookingDetail[];
  isDarkMode: boolean;
  formatMoney: (amountInUsd: number) => string;
}

export default function BillingTab({
  facilityName,
  currentDebt = 0,
  creditLimit = 50,
  commissionRate = 2,
  isSuspended = false,
  completedBookings = [],
  isDarkMode,
  formatMoney
}: BillingTabProps) {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const usagePercent = Math.min(100, Math.round((currentDebt / (creditLimit || 1)) * 100));

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  const handleWhatsAppPaymentNotify = () => {
    const adminWhatsApp = '967770000000';
    const message = encodeURIComponent(
      `السلام عليكم إدارة المنصة الطبية،\n` +
      `نود إشعاركم بأنه تم تحويل دفعة سداد عمولات مستحقة:\n` +
      `• المنشأة: ${facilityName}\n` +
      `• المديونية الحالية: $${currentDebt}\n` +
      `مرفق لكم صورة إشعار التحويل البنكي للتكرم بتصفير الحساب.`
    );
    window.open(`https://api.whatsapp.com/send?phone=${adminWhatsApp}&text=${message}`, '_blank');
  };

  // تصدير التقرير المالي بصيغة Excel / CSV
  const handleExportCSV = () => {
    if (completedBookings.length === 0) {
      alert('لا توجد بيانات كشوفات لتصديرها.');
      return;
    }

    const headers = ['المريض', 'الهاتف', 'الطبيب', 'تاريخ الكشف', 'المبلغ المحصل ($)', 'عمولة المنصة ($)'];
    const rows = completedBookings.map(b => [
      `"${b.patient_name || ''}"`,
      `"${b.patient_phone || ''}"`,
      `"${b.doctor_name || ''}"`,
      `"${b.booking_date || ''}"`,
      `"${b.consultation_fee || 20}"`,
      `"${b.platform_fee || commissionRate}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_العمولات_${facilityName || 'المنشأة'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm max-w-3xl mx-auto space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* ترويسة التبويب */}
      <div className={`border-b pb-3 flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <CreditCard className="w-5 h-5 text-teal-600" /> كشف حساب الفوترة والعمولات المستحقة
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">تحسب العمولات تلقائياً عن الكشوفات المنجزة فقط بعد خصم الكوبونات</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          isSuspended || currentDebt >= creditLimit
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isSuspended || currentDebt >= creditLimit ? 'الحساب معلق مؤقتاً' : 'الحساب نشط'}
        </span>
      </div>

      {/* تنبيه في حال تجاوز السقف */}
      {(isSuspended || currentDebt >= creditLimit) && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>تجاوزت المديونية السقف الائتماني المسموح به. يرجى سداد العمولات لإعادة تفعيل الحجوزات للمرضى تلقائياً.</span>
        </div>
      )}

      {/* كروت الأرقام المالية */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* زر بطاقة المديونية */}
        <button
          type="button"
          onClick={() => setShowDetailsModal(true)}
          className={`p-4 rounded-2xl border text-right transition group relative overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-950 border-slate-800 hover:border-rose-500/50 hover:bg-slate-900' 
              : 'bg-slate-50 border-slate-200 hover:border-rose-400 hover:bg-rose-50/20'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400 font-bold block">إجمالي المديونية المستحقة:</span>
            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition" />
          </div>
          <span className="text-2xl font-black text-rose-500">{formatMoney(currentDebt)}</span>
          <span className="text-[10px] text-teal-600 block mt-1 font-bold group-hover:underline">
            اضغط لعرض تفاصيل الكشوفات ({completedBookings.length})
          </span>
        </button>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-xs text-slate-400 block font-bold mb-1">السقف الائتماني المحدد:</span>
          <span className={`text-2xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{formatMoney(creditLimit)}</span>
          <span className="text-[10px] text-slate-400 block mt-1">الحد الأقصى قبل الإيقاف</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-xs text-slate-400 block font-bold mb-1">عمولة الكشف الواحد:</span>
          <span className="text-2xl font-black text-teal-500">{formatMoney(commissionRate)}</span>
          <span className="text-[10px] text-slate-400 block mt-1">لكل مريض منجز</span>
        </div>
      </div>

      {/* شريط نسبة استهلاك السقف الائتماني */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-400">نسبة استهلاك السقف الائتماني:</span>
          <span className={usagePercent >= 100 ? 'text-rose-500' : usagePercent > 70 ? 'text-amber-500' : 'text-teal-500'}>
            {usagePercent}%
          </span>
        </div>
        <div className={`w-full h-3 rounded-full overflow-hidden border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <div
            className={`h-full transition-all duration-500 ${
              usagePercent >= 100 ? 'bg-rose-600' : usagePercent > 70 ? 'bg-amber-500' : 'bg-teal-600'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* حسابات سداد العمولات */}
      <div className={`p-5 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-teal-50/60 border-teal-200'}`}>
        <h4 className="font-bold text-sm flex items-center gap-1.5 text-teal-500">
          <Wallet className="w-4 h-4" /> حسابات المنصة المعتمدة لسداد العمولات
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          يرجى تحويل مبلغ العمولة المستحق لأحد الحسابات التالية، ثم إرسال صورة السند لإعادة تصفير الرصيد فوراً:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          
          <div className={`p-3 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-teal-200'}`}>
            <div>
              <span className="text-[10px] text-slate-400 block">🏦 بنك الكريمي (حاسب / حساب):</span>
              <strong className="font-mono text-teal-500 text-sm">3001234567</strong>
            </div>
            <button
              onClick={() => copyToClipboard('3001234567', 'kuraimi')}
              className="p-1.5 rounded-lg border border-teal-500/30 hover:bg-teal-500/10 transition text-slate-400 hover:text-teal-400"
              title="نسخ الرقم"
            >
              {copiedAccount === 'kuraimi' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className={`p-3 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-teal-200'}`}>
            <div>
              <span className="text-[10px] text-slate-400 block">🟢 محفظة ون كاش (OneCash):</span>
              <strong className="font-mono text-teal-500 text-sm">770000000</strong>
            </div>
            <button
              onClick={() => copyToClipboard('770000000', 'onecash')}
              className="p-1.5 rounded-lg border border-teal-500/30 hover:bg-teal-500/10 transition text-slate-400 hover:text-teal-400"
              title="نسخ الرقم"
            >
              {copiedAccount === 'onecash' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

        <button
          onClick={handleWhatsAppPaymentNotify}
          className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
        >
          <MessageSquareShare className="w-4 h-4" />
          إرسال سند التحويل وتأكيد السداد عبر الواتساب
        </button>

      </div>

      {/* نافذة تفاصيل الكشوفات المكتملة مع زر تصدير CSV */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col ${
            isDarkMode ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white text-slate-900'
          }`}>
            
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                  تفاصيل الكشوفات المكتملة كاش ({completedBookings.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  كافة الحالات التي تمت تسويتها وحُسبت عمولتها لصالح المنصة
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {completedBookings.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    title="تنزيل التقرير المالي بصيغة Excel/CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير Excel</span>
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {completedBookings.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-400">لا توجد كشوفات مستحقة معلقة، الحساب مصفر تماماً.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className={`border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      <tr>
                        <th className="p-2.5">المريض</th>
                        <th className="p-2.5">الطبيب</th>
                        <th className="p-2.5">تاريخ الكشف</th>
                        <th className="p-2.5">المبلغ المحصل</th>
                        <th className="p-2.5">عمولة المنصة</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {completedBookings.map((b) => (
                        <tr key={b.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="p-2.5 font-bold">
                            {b.patient_name}
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">{b.patient_phone}</span>
                          </td>
                          <td className="p-2.5 text-teal-500 font-medium">{b.doctor_name}</td>
                          <td className="p-2.5 font-mono text-slate-400">{b.booking_date}</td>
                          <td className="p-2.5 font-mono font-bold">
                            {formatMoney(b.consultation_fee || 20)}
                          </td>
                          <td className="p-2.5 font-mono font-black text-rose-500">
                            {formatMoney(b.platform_fee || commissionRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`border-t pt-3 flex justify-between items-center text-xs ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="font-bold text-slate-400">إجمالي العمولة المستحقة:</span>
              <span className="text-base font-black text-rose-500 font-mono">{formatMoney(currentDebt)}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
