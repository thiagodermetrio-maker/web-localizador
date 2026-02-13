'use client';

import dynamic from 'next/dynamic';

const MapDrawArea = dynamic(() => import('@/components/MapDrawArea'), {
  ssr: false,
});

export default function AdicionarArea() {
  return <MapDrawArea />;
}
