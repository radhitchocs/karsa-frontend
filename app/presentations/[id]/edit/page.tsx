import { Suspense } from "react";
import { EditClient } from "./EditClient";

export default function EditPage() {
  return (
    <Suspense>
      <EditClient />
    </Suspense>
  );
}
