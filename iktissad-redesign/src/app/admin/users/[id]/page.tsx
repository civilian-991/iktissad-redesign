/**
 * Admin Edit User Page — Server Wrapper
 * Generates metadata and renders the client component.
 */

import type { Metadata } from "next";
import UserEditClient from "./UserEditClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `تعديل المستخدم | لوحة التحكم`,
    description: `تعديل بيانات المستخدم ${id}`,
  };
}

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  return <UserEditClient userId={id} />;
}
