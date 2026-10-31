import { Suspense } from 'react';
import { ParticipantClient } from './ParticipantClient';

export default function ParticipantPage() {
  return (
    <Suspense>
      <ParticipantClient />
    </Suspense>
  );
}
