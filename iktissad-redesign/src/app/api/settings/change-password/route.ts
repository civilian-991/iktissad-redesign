import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<never>>(
      { error: parsed.error.message },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = parsed.data;
  const supabase = await createClient();

  // Get the currently authenticated user's email
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "تعذر التحقق من هوية المستخدم" },
      { status: 401 }
    );
  }

  // Verify the current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "كلمة المرور الحالية غير صحيحة" },
      { status: 400 }
    );
  }

  // Update to the new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json<ApiResponse<never>>(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<{ success: boolean }>>({
    data: { success: true },
  });
}
