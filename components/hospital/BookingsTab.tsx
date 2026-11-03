'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Search, Clock, ShieldCheck, Filter } from 'lucide-react';

export interface BookingItem {
  id: string | number;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  deposit_amount?: number;
  discount_amount?: number;
  applied_coupon?: string;
  payment_method?: string;
}

interface BookingsTabProps {
  facilityName: string;
  bookings: BookingItem[];
  isDarkMode: boolean;
  formatMoney: (amountInUsd: number) => string;
}

export default function BookingsTab({
  facilityName,
  bookings,
  isDarkMode,
  formatMoney
}: BookingsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<'all' | 'today' | 'completed' | 'cancelled'>('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = useMemo(() => {
    let list = bookings;

    if (filterView === 'today') {
      list = list.filter(b => b.booking_date === todayStr);
    } else if (filterView === 'completed') {
      list = list.filter(b => b.status === 'completed');
    } else if (filterView === 'cancelled') {
      list = list.filter(b => b.status === 'cancelled');
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(b => 
        (b.patient_name || '').toLowerCase().includes(q) || 
        (b.patient_phone || '').includes(q) ||
        (b.doctor_name || '').toLowerCase().includes(q) ||
        (b.applied_coupon || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, filterView, searchQuery, todayStr]);

  return (
    <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* الترويسة الرقابية */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            سجل التدقيق والمراقبة الإدارية للحجوزات ({filteredBookings.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            شاشة إشرافية رقابية ومالية للقراءة فقط — التعديلات التشغيلية محصورة بمكتب الاستقبال
          </p>
        </div>

        {/* أدوات البحث والفلترة */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          
          <div className="flex rounded-xl p-1 border border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              onClick={() => setFilterView('all')}
              className={`px-2.5 py-1 rounded-lg transition ${filterView === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              الكل ({bookings.length})
            </button>
            <button
              onClick={() => setFilterView('today')}
              className={`px-2.5 py-1 rounded-lg transition ${filterView === 'today' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              اليوم ({bookings.filter(b => b.booking_date === todayStr).length})
            </button>
            <button
              onClick={() => setFilterView('completed')}
              className={`px-2.5 py-1 rounded-lg transition ${filterView === 'completed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              المكتملة
            </button>
            <button
              onClick={() => setFilterView('cancelled')}
              className={`px-2.5 py-1 rounded-lg transition ${filterView === 'cancelled' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              الملغاة
            </button>
          </div>

          <div className="relative flex-1 sm:w-52">
            <input
              type="text"
              placeholder="بحث بالاسم، الهاتف، أو الطبيب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs outline-none focus:border-teal-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

        </div>
      </div>

      {/* جدول الحجوزات الرقابي */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-slate-400 text-sm">لا توجد سجلات مطابقة لمعايير البحث الحالية.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className={`border-b ${isDarkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              <tr>
                <th className="p-3">المريض</th>
                <th className="p-3">الهاتف المسجل</th>
                <th className="p-3">الطبيب المعالج</th>
                <th className="p-3">تاريخ ووقت الزيارة</th>
                <th className="p-3">المبلغ المحصل</th>
                <th className="p-3">طريقة الدفع</th>
                <th className="p-3">الحالة التشغيلية</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredBookings.map((b) => {
                let cleanPhone = (b.patient_phone || '').replace(/[^0-9]/g, '');
                if (cleanPhone.startsWith('967')) cleanPhone = cleanPhone.slice(3);
                if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);

                return (
                  <tr key={b.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                    <td className={`p-3 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{b.patient_name}</td>
                    <td className="p-3 font-mono text-slate-400">+967 {cleanPhone}</td>
                    <td className="p-3 text-teal-500 font-bold">{b.doctor_name}</td>
                    <td className="p-3 font-medium">
                      <div className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{b.booking_date}</div>
                      <span className="text-xs text-slate-400">{b.booking_time}</span>
                    </td>
                    <td className="p-3">
                      {b.discount_amount && b.discount_amount > 0 ? (
                        <div>
                          <span className="font-mono font-black text-emerald-500 text-xs">
                            {formatMoney(b.deposit_amount || 0)}
                          </span>
                          <span className="text-[10px] text-teal-400 block mt-0.5">
                            خصم: -{formatMoney(b.discount_amount)} ({b.applied_coupon})
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold">
                          {formatMoney(b.deposit_amount || 20)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-slate-500 font-medium">
                        {b.payment_method === 'wallet' ? '💳 محفظة إلكترونية' : '💵 دفع نقدي بالعيادة'}
                      </span>
                    </td>
                    <td className="p-3">
                      {/* شارة حالة للقراءة فقط - غير قابلة للتغيير من الإدارة */}
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        b.status === 'completed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' :
                        b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' :
                        b.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' :
                        'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      }`}>
                        {b.status === 'completed' && '🩺 تم الكشف بنجاح'}
                        {b.status === 'confirmed' && '✅ موعد مؤكد'}
                        {b.status === 'cancelled' && '❌ ملغي'}
                        {(!b.status || b.status === 'pending') && '⏳ بانتظار الحضور'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
