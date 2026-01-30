'use client';

export default function ColorsPage() {
  const colorGroups = [
    {
      name: 'Brand Blues (Primary)',
      colors: [
        { name: 'brand-950', value: '#001a33' },
        { name: 'brand-900', value: '#002647' },
        { name: 'brand-800', value: '#003a6b' },
        { name: 'brand-700', value: '#004d8f' },
        { name: 'brand ★', value: '#005B9F' },
        { name: 'brand-500', value: '#0073c7' },
        { name: 'brand-400', value: '#2b8fd9' },
        { name: 'brand-300', value: '#5aabeb' },
        { name: 'brand-200', value: '#9dcaf5' },
        { name: 'brand-100', value: '#d4e9fc' },
        { name: 'brand-50', value: '#eef6fd' },
      ]
    },
    {
      name: 'Accent Amber (Secondary)',
      colors: [
        { name: 'accent-700', value: '#b45309' },
        { name: 'accent-600', value: '#d97706' },
        { name: 'accent ★', value: '#f59e0b' },
        { name: 'accent-400', value: '#fbbf24' },
        { name: 'accent-300', value: '#fcd34d' },
        { name: 'accent-200', value: '#fde68a' },
        { name: 'accent-100', value: '#fef3c7' },
      ]
    },
    {
      name: 'Slate Neutrals',
      colors: [
        { name: 'slate-950', value: '#020617' },
        { name: 'slate-900', value: '#0f172a' },
        { name: 'slate-800', value: '#1e293b' },
        { name: 'slate-700', value: '#334155' },
        { name: 'slate-600', value: '#475569' },
        { name: 'slate-500', value: '#64748b' },
        { name: 'slate-400', value: '#94a3b8' },
        { name: 'slate-300', value: '#cbd5e1' },
        { name: 'slate-200', value: '#e2e8f0' },
        { name: 'slate-100', value: '#f1f5f9' },
        { name: 'slate-50', value: '#f8fafc' },
      ]
    },
    {
      name: 'Semantic (Market Data)',
      colors: [
        { name: 'profit', value: '#059669' },
        { name: 'profit-light', value: '#10b981' },
        { name: 'loss', value: '#dc2626' },
        { name: 'loss-light', value: '#ef4444' },
        { name: 'warning', value: '#d97706' },
        { name: 'info', value: '#005B9F' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 font-[family-name:var(--font-display)]">
          Iktissad Color Palette
        </h1>
        <p className="text-slate-600 mb-8">Brand Color: #005B9F | Inspired by Bloomberg & Financial Times</p>

        {colorGroups.map((group) => (
          <div key={group.name} className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 mb-4 font-[family-name:var(--font-display)]">
              {group.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {group.colors.map((color) => (
                <div key={color.name} className="text-center">
                  <div
                    className="w-20 h-16 rounded-lg shadow-sm border border-slate-200"
                    style={{ backgroundColor: color.value }}
                  />
                  <p className="text-xs font-medium text-slate-700 mt-1">{color.name}</p>
                  <p className="text-[10px] text-slate-500">{color.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Preview Sections */}
        <div className="mt-12 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Live Preview</h2>

          {/* Brand Header */}
          <div className="bg-brand p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">Brand Blue Header</h3>
            <p className="text-white/80 mb-4">Primary brand color background</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-accent text-slate-900 font-bold rounded text-sm">
                Amber Button
              </button>
              <button className="px-4 py-2 bg-white text-brand font-bold rounded text-sm">
                White Button
              </button>
              <button className="px-4 py-2 border-2 border-white text-white font-bold rounded text-sm">
                Outline
              </button>
            </div>
          </div>

          {/* Dark Section */}
          <div className="bg-slate-900 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">Dark Section</h3>
            <p className="text-slate-400 mb-4">For video sections and dark themes</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-accent text-slate-900 font-bold rounded text-sm">
                Amber CTA
              </button>
              <button className="px-4 py-2 bg-brand text-white font-bold rounded text-sm">
                Brand Button
              </button>
            </div>
          </div>

          {/* Light Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-card border-t-4 border-brand">
              <h4 className="font-bold text-slate-900 mb-1">Brand Accent</h4>
              <p className="text-slate-600 text-sm">Card with blue top border</p>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-card border-t-4 border-accent">
              <h4 className="font-bold text-slate-900 mb-1">Amber Accent</h4>
              <p className="text-slate-600 text-sm">Card with amber top border</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1">Neutral Card</h4>
              <p className="text-slate-600 text-sm">Subtle gray background</p>
            </div>
          </div>

          {/* Market Data */}
          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-3">Market Data Colors</h4>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-profit"></span>
                <span className="text-profit font-bold">+2.45%</span>
                <span className="text-slate-500 text-sm">Profit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-loss"></span>
                <span className="text-loss font-bold">-1.23%</span>
                <span className="text-slate-500 text-sm">Loss</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-warning"></span>
                <span className="text-warning font-bold">Alert</span>
                <span className="text-slate-500 text-sm">Warning</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
