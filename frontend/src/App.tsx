export default function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-xl">
        <div className="inline-block px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full text-xs font-semibold mb-4 tracking-wider uppercase">
          Tiketa 2.0 Foundation
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Five Star Bus Co.</h1>
        <p className="text-slate-400 text-sm mb-6">Internal IT Service & Terminal Dispatch Engine</p>
        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 text-left text-xs font-mono text-emerald-400">
          <div>✓ PostgreSQL 16 (tiketa-postgres)</div>
          <div>✓ Redis 7 (tiketa-redis)</div>
          <div>✓ FastAPI 0.110 (tiketa-backend)</div>
          <div>✓ Strict TypeScript 5+ (tiketa-frontend)</div>
        </div>
      </div>
    </div>
  );
}
