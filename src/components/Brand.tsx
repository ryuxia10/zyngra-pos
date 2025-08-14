export default function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "lg" ? 36 : size === "sm" ? 24 : 28;
  const textSize =
    size === "lg" ? "text-xl" : size === "sm" ? "text-base" : "text-lg";
  const subPad = size === "lg" ? "px-2 py-[2px]" : "px-1.5 py-[1px]";
  const gap = size === "lg" ? "gap-3" : "gap-2";

  return (
    <div className={`flex items-center ${gap}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="zyngraGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill="url(#zyngraGrad)"
        />
        <g fill="white" opacity="0.95">
          <path
            d="M20 19h24a3 3 0 0 1 3 3v26l-4-3-4 3-4-3-4 3-4-3-4 3V22a3 3 0 0 1 3-3z"
            opacity="0.25"
          />
          <path
            d="M22 24h20"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M22 30h12"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path d="M38 26l-9 12h7l-4 9 12-14h-8l2-7z" fill="white" />
        </g>
      </svg>

      <div className="flex items-center gap-2">
        <div className={`${textSize} font-bold tracking-tight`}>
          <span className="text-zinc-900 dark:text-white">Zyngra</span>{" "}
          <span className="text-indigo-600 dark:text-indigo-400">POS</span>
        </div>
        <span
          className={`rounded-full bg-zinc-900/10 dark:bg-white/10 text-[10px] ${subPad} leading-none`}
        >
          RDA
        </span>
      </div>
    </div>
  );
}
