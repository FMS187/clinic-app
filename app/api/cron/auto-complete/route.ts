import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. استدعاء دالة قاعدة البيانات للإغلاق التلقائي واحتساب العمولات
    const { error } = await supabase.rpc('auto_complete_expired_bookings');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم فحص وإغلاق الحجوزات المنتهية واحتساب العمولات بنجاح.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
