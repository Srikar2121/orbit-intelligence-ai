type Props = { variant?: "default" | "genz" | "codey" };

const PALETTES: Record<NonNullable<Props["variant"]>, [string, string, string]> = {
  default: ["#7C4DFF", "#00E5FF", "#A78BFA"],
  genz: ["#FF4D9D", "#FFD166", "#7C4DFF"],
  codey: ["#00E5FF", "#22C55E", "#0EA5E9"],
};

export function Blobs({ variant = "default" }: Props) {
  const [a, b, c] = PALETTES[variant];
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden transition-colors duration-700">
      <div className="blob animate-float" style={{ width: 500, height: 500, top: -150, left: -150, background: a }} />
      <div className="blob animate-float" style={{ width: 400, height: 400, top: '40%', right: -120, background: b, animationDelay: '2s' }} />
      <div className="blob animate-float" style={{ width: 450, height: 450, bottom: -180, left: '30%', background: c, animationDelay: '4s' }} />
    </div>
  );
}
