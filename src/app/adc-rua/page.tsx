'use client';

import dynamic from 'next/dynamic';

const MapDraw = dynamic(() => import('@/components/MapDraw'), {
  ssr: false,
});

export default function AdicionarRua() {
  return <MapDraw />;
}
