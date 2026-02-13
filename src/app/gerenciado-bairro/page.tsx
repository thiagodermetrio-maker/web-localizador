'use client';

import dynamic from 'next/dynamic';

const GerenciarBairroMap = dynamic(() => import('@/components/GerenciarBairroMap'), {
  ssr: false,
});

export default function GerenciarBairro() {
  return <GerenciarBairroMap />;
}
