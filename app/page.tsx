import { DownlinkClient } from '@/components/downlink-client';
import { WaveGridBackground } from '@/components/wave-grid-background';

export default function HomePage() {
  return (
    <>
      <WaveGridBackground />
      <DownlinkClient />
    </>
  );
}
