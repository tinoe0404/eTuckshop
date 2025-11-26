export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-futuristic p-4">
      {/* Optional floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-glow-purple/40 rounded-full floating-particle blur-sm" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-3 h-3 bg-glow-magenta/30 rounded-full floating-particle blur-sm" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-glow-cyan/40 rounded-full floating-particle blur-sm" style={{ animationDelay: '4s' }} />
        <div className="absolute bottom-20 right-1/3 w-1.5 h-1.5 bg-glow-pink/30 rounded-full floating-particle blur-sm" style={{ animationDelay: '3s' }} />
      </div>

      {/* Auth container */}
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  );
}