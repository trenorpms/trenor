'use client';

import { redirect } from 'next/navigation';

export default function TenantPageRedirect() {
  redirect('/tenant/overview');
}
