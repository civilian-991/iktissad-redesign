/**
 * GET /api/admin/export/subscribers
 * Excel export for the subscribers table using exceljs.
 * Admin-only.
 */

import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all subscribers with plan info
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select(`
        id,
        name,
        email,
        phone,
        country_code,
        status,
        current_period_start,
        current_period_end,
        canceled_at,
        created_at,
        plan_id,
        subscription_plans (
          name_ar
        )
      `)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Iktissad Admin';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('المشتركون', {
      views: [{ rightToLeft: true }],
      properties: { defaultRowHeight: 20 },
    });

    // Column definitions
    sheet.columns = [
      { header: 'الاسم',             key: 'name',       width: 25 },
      { header: 'البريد الإلكتروني', key: 'email',      width: 35 },
      { header: 'الخطة',             key: 'plan',       width: 18 },
      { header: 'الحالة',            key: 'status',     width: 15 },
      { header: 'تاريخ البدء',       key: 'periodStart',width: 20 },
      { header: 'تاريخ الانتهاء',    key: 'periodEnd',  width: 20 },
      { header: 'الاتصال',           key: 'phone',      width: 20 },
    ];

    // Style header row (gold background, white bold text, RTL)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Arial' };
    headerRow.alignment = { horizontal: 'right', vertical: 'middle' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDA853' },
    };
    headerRow.height = 24;

    const STATUS_LABELS: Record<string, string> = {
      active:    'نشط',
      trialing:  'تجريبي',
      past_due:  'متأخر',
      canceled:  'ملغى',
      paused:    'موقوف',
      incomplete:'ناقص',
    };

    // Data rows: alternating white / cream
    (subscribers ?? []).forEach((sub: any, idx: number) => {
      const row = sheet.addRow({
        name:        sub.name ?? '',
        email:       sub.email ?? '',
        plan:        sub.subscription_plans?.name_ar ?? 'مجاني',
        status:      STATUS_LABELS[sub.status] ?? sub.status,
        periodStart: sub.current_period_start
          ? new Date(sub.current_period_start).toLocaleDateString('ar-SA')
          : '',
        periodEnd: sub.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString('ar-SA')
          : '',
        phone: sub.phone ?? '',
      });

      const fill: ExcelJS.Fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5EEDC' },
      };
      row.fill = fill;
      row.alignment = { horizontal: 'right', vertical: 'middle' };
      row.font = { name: 'Arial', size: 11 };
      row.height = 20;
    });

    // Auto column width (already set above, but commit)
    sheet.columns.forEach((col) => {
      if (col.width) col.width = col.width;
    });

    // Serialize to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="subscribers.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[export/subscribers]', err);
    return NextResponse.json(
      { error: err.message ?? 'Export failed' },
      { status: 500 }
    );
  }
}
