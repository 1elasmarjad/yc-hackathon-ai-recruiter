export function LandingBG() {
  return (
    <>
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 107, 44, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 44, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Diagonal accent lines */}
      <div className="absolute top-0 right-0 w-1/3 h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-20 right-20 w-[1px] h-[140%] bg-gradient-to-b from-transparent via-[#FF6B2C]/30 to-transparent rotate-[25deg]" />
        <div className="absolute -top-20 right-40 w-[1px] h-[140%] bg-gradient-to-b from-transparent via-[#FF6B2C]/20 to-transparent rotate-[25deg]" />
        <div className="absolute -top-20 right-60 w-[1px] h-[140%] bg-gradient-to-b from-transparent via-[#FF6B2C]/10 to-transparent rotate-[25deg]" />
      </div>

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}
