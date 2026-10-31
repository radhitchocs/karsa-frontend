import Image from 'next/image';

/** Karsa logo + wordmark. Use in lobby/waiting screens for all three POVs. */
export function KarsaWordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const logoSize = size === 'lg' ? 72 : size === 'md' ? 38 : 32;
  const textClass =
    size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-4xl' : 'text-xl';

  return (
    <div className="flex flex-row items-center gap-2">
      <Image
        src="/faveicon.svg"
        alt=""
        aria-hidden="true"
        width={logoSize}
        height={logoSize}
      />
      <span className={`font-black tracking-tight ${textClass}`}>Karsa</span>
    </div>
  );
}
