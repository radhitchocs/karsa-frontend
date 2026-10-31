'use client';

export function ConnectionBanner({ disconnected }: { disconnected: boolean }) {
  if (!disconnected) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 bg-yellow-400 border-b-2 border-black px-4 py-2 text-sm font-semibold text-black text-center shadow-[0_4px_0_0_#000]"
    >
      Koneksi terputus — mencoba menghubungkan kembali…
    </div>
  );
}
