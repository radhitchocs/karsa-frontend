import { Suspense } from 'react';
import { ProjectorClient } from './ProjectorClient';

export default function ProjectorPage() {
  return (
    <Suspense>
      <ProjectorClient />
    </Suspense>
  );
}
