'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, Trash2, Calendar, Phone, 
  MapPin, Shield, Lock, Stethoscope, 
  Clock, AlertCircle, Loader2, LogOut, Mail
} from 'lucide-react';

interface Doctor {
  id: string | number;
  name: string;
  specialty: string;
  category: 'dental' | 'derma';
  branch: string;
  phone?: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // حقول تسجيل الدخول بالإيميل
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // تبويبات لوحة التحكم
  const [activeTab, setActiveTab] = useState<'doctors' | 'bookings'>('doctors');

  // بيانات الأطباء والحجوزات
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // نموذج إضافة طبيب
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialty: '',
    category: 'dental' as 'dental' | 'derma',
    branch: 'صنعاء - فرع حدة',
    phone: ''
  });

  // فحص الجلسة عند التحميل
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDoctors();
        fetchBookings();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchDoctors();
      fetchBookings();
    }
  }, [user]);

  // تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(
        error.message === 'Invalid login credentials' 
          ? 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني وكلمة المرور.' 
          : error.message
      );
    }
    setAuthSubmitting(false);
  };

  // تسجيل الخروج
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // جلب الأطباء من قاعدة البيانات
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    const { data, error } = await supabase
      .from('Doctor')
      .select('*')
      .order('id', { ascending: false });

    if (data && !error) setDoctors(data);
    setLoadingDoctors(false);
  };

  // جلب الحجوزات من قاعدة البيانات
  const fetchBookings = async () => {
    setLoadingBookings(true);
    const { data, error } = await supabase
      .from('Booking')
      .select('*')
      .order('id', { ascending: false });

    if (data && !error) setBookings(data);
    setLoadingBookings(false);
  };

  // إضافة طبيب جديد
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.specialty) return;

    const { data, error } = await supabase
      .from('Doctor')
      .insert([newDoctor])
      .select();

    if (data && !error) {
      setDoctors([data[0], ...doctors]);
      setNewDoctor({
        name: '',
        specialty: '',
        category: 'dental',
        branch: 'صنعاء - فرع حدة',
        phone: ''
      });
      alert('تم حفظ بيانات الطبيب بنجاح');
    } else {
      alert('تعذر حفظ البيانات، يرجى التحقق من الاتصال');
    }
  };

  // حذف طبيب
  const handleDeleteDoctor = async (id: string | number) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الطبيب؟')) return;
    const { error } = await supabase.from('Doctor').delete().eq('id', id);
    if (!error) {
      setDoctors(doctors.filter(d => d.id !== id));
    }
  };

  if (loadingAuth) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </main>
    );
  }

  // واجهة تسجيل الدخول المخصصة بالبريد الإلكتروني فقط
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-teal-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">بوابة دخول إدارة العيادات</h1>
          <p className="text-slate-400 text-xs sm:text-sm mb-6">سجل الدخول لإدارة الكادر الطبي ومتابعة الحجوزات</p>

          <form onSubmit={handleEmailSignIn} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">البريد الإلكتروني للعيادة</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
