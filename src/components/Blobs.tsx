export function Blobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="blob animate-float" style={{ width: 500, height: 500, top: -150, left: -150, background: '#7C4DFF' }} />
      <div className="blob animate-float" style={{ width: 400, height: 400, top: '40%', right: -120, background: '#00E5FF', animationDelay: '2s' }} />
      <div className="blob animate-float" style={{ width: 450, height: 450, bottom: -180, left: '30%', background: '#FF4D9D', animationDelay: '4s' }} />
    </div>
  );
}
