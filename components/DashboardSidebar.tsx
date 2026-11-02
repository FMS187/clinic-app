'use client';

import React, { useState } from 'react';
import { 
  Shield, Building2, UserCheck, Calendar, CreditCard, 
  AlertTriangle, Stethoscope, Wallet, Settings, LogOut, 
  Menu, X, CheckSquare, Tag, Users, LayoutDashboard, ChevronRight
} from 'lucide-react';

export type UserRole = 'admin' | 'facility_manager' | 'receptionist';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  userName?: string;
  facilityName?: string;
  onLogout: () => void;
  badgeCounts?: {
    pendingBookings?: number;
    uncollectedDebt?: number;
    cancelledAudits?: number;
  };
}

export default function DashboardSidebar({
  role,
  activeTab,
  setActiveTab,
  userName = 'المستخدم',
  facilityName,
  onLogout,
  badgeCounts = {}
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // عناصر القائمة حسب الرتبة
  const getMenuItems = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'overview', label: 'المؤشرات والنمو', icon: LayoutDashboard },
          { id: 'billing', label: 'الفوترة والتحصيل', icon: CreditCard, badge: badgeCounts.uncollectedDebt ? `$${badgeCounts.uncollectedDebt}` : undefined, badgeColor: 'bg-rose-500' },
          { id: 'cancelled_audit', label: 'تدقيق الإلغاءات', icon: AlertTriangle, badge: badgeCounts.cancelledAudits, badgeColor: 'bg-amber-500' },
          { id: 'facilities', label: 'إدارة المنشآت', icon: Building2 },
          { id: 'bookings', label: 'كافة الحجوزات', icon: Calendar },
          { id: 'coupons', label: 'العروض والكوبونات', icon: Tag },
          { id: 'settings', label: 'إعدادات المنصة', icon: Settings },
        ];

      case 'facility_manager':
        return [
          { id: 'bookings', label: 'جدول المواعيد', icon: Calendar, badge: badgeCounts.pendingBookings, badgeColor: 'bg-teal-500' },
          { id: 'billing', label: 'الفوترة والعمولة', icon: CreditCard, badge: badgeCounts.uncollectedDebt ? `$${badgeCounts.uncollectedDebt}` : undefined, badgeColor: 'bg-rose-500' },
          { id: 'wallets', label: 'محافظ الدفع', icon: Wallet },
          { id: 'doctors', label: 'كادر الأطباء', icon: Stethoscope },
          { id: 'settings', label: 'بيانات المنشأة', icon: Settings },
        ];

      case 'receptionist':
        return [
          { id: 'checkin', label: 'تأكيد الحضور (PIN)', icon: CheckSquare },
          { id: 'today_bookings', label: 'مواعيد اليوم', icon: Calendar, badge: badgeCounts.pendingBookings, badgeColor: 'bg-teal-500' },
          { id: 'all_bookings', label: 'سجل الحجوزات', icon: Users },
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const getRoleHeader = () => {
    if (role === 'admin') {
      return {
        title: 'إدارة المنصة المركزية',
        badge: 'Super Admin',
        icon: Shield,
        color: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
      };
    }
    if (role === 'facility_manager') {
      return {
        title: facilityName || 'إدارة المركز الطبي',
        badge: 'مدير المنشأة',
        icon: Building2,
        color: 'text-teal-400 bg-teal-400/10 border-teal-400/20'
      };
    }
    return {
      title: facilityName || 'استقبال العيادات',
      badge: 'موظف استقبال',
      icon: UserCheck,
      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    };
  };

  const header = getRoleHeader();
  const HeaderIcon = header.icon;

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setIsOpen(false); // إغلاق القائمة فوراً عند الاختيار
  };

  return (
    <>
      {/* زر عائم وثابت لفتح القائمة على الهواتف والشاشات */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-2 hover:bg-slate-800 transition active:scale-95"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5 text-teal-400" />
          <span className="text-xs font-bold hidden sm:inline">القائمة</span>
        </button>
      </div>

      {/* خلفية معتمة تظهر عند فتح القائمة، والنقر عليها يغلقها فوراً */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300"
        />
      )}

      {/* هيكل القائمة الجانبية كشريط Drawer منبثق فوق الصفحة بالكامل */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 sm:w-80 bg-slate-900 border-l border-slate-800 text-white flex flex-col z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ترويسة القائمة مع زر إغلاق صريح */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${header.color}`}>
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-black text-sm truncate">{header.title}</h2>
              <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {header.badge}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            title="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* عناصر التنقل */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs font-bold">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono text-white ${item.badgeColor || 'bg-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* أسفل القائمة: المستخدم وزر تسجيل الخروج */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="mb-3 px-1 truncate">
            <p className="text-[10px] text-slate-400">الحساب الحالي:</p>
            <p className="text-xs font-bold text-slate-200 truncate">{userName}</p>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
