'use client';

import dynamic from 'next/dynamic';

const Relatorios = dynamic(() => import('@/components/Relatorios'), {
  ssr: false,
});

export default function RelatoriosPage() {
  return <Relatorios />;
}
