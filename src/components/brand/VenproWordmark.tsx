export const VENPRO_LOGO_SRC = '/venpro-logo.png';

interface VenproWordmarkProps {
  className?: string;
  showTagline?: boolean;
  taglineClassName?: string;
}

export default function VenproWordmark({
  className = 'text-xl',
  showTagline = false,
  taglineClassName = 'text-[10px] leading-tight text-[#abc7ff] font-medium',
}: VenproWordmarkProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 font-extrabold text-white uppercase font-sans ${className}`}>
        <span>VEN</span>
        <span className="w-[3px] h-[0.8em] bg-[#50dcff] shrink-0" aria-hidden="true" />
        <span>PRO</span>
      </span>
      {showTagline && (
        <p className={taglineClassName}>Controla tu inventario</p>
      )}
    </div>
  );
}
