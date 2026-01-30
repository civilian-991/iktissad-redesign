'use client';

export default function ColorsPage() {
  const colorGroups = [
    {
      name: 'Primary Brand Blues',
      colors: [
        { name: 'brand', value: '#005B9F', css: 'bg-brand' },
        { name: 'brand-dark', value: '#004577', css: 'bg-brand-dark' },
        { name: 'brand-darker', value: '#00304f', css: 'bg-brand-darker' },
        { name: 'brand-light', value: '#0070c4', css: 'bg-brand-light' },
        { name: 'brand-lighter', value: '#3d9be0', css: 'bg-brand-lighter' },
        { name: 'brand-subtle', value: '#e8f4fc', css: 'bg-brand-subtle' },
      ]
    },
    {
      name: 'Gold & Precious Metals',
      colors: [
        { name: 'gold', value: '#c9a227', css: 'bg-gold' },
        { name: 'gold-bright', value: '#e0b830', css: 'bg-gold-bright' },
        { name: 'gold-light', value: '#f5d668', css: 'bg-gold-light' },
        { name: 'gold-muted', value: '#a68a2c', css: 'bg-gold-muted' },
        { name: 'copper', value: '#b5651d', css: 'bg-copper' },
        { name: 'bronze', value: '#7a5c3e', css: 'bg-bronze' },
      ]
    },
    {
      name: 'Editorial Paper Tones',
      colors: [
        { name: 'paper', value: '#fdfbf8', css: 'bg-paper' },
        { name: 'paper-warm', value: '#faf7f2', css: 'bg-paper-warm' },
        { name: 'cream', value: '#f5f1e8', css: 'bg-cream' },
        { name: 'ivory', value: '#eee9dc', css: 'bg-ivory' },
        { name: 'sand', value: '#e2d9c8', css: 'bg-sand' },
        { name: 'stone', value: '#c9bea8', css: 'bg-stone' },
      ]
    },
    {
      name: 'Ink & Text Colors',
      colors: [
        { name: 'ink', value: '#1a1612', css: 'bg-ink' },
        { name: 'ink-soft', value: '#2d2823', css: 'bg-ink-soft' },
        { name: 'charcoal', value: '#3d3730', css: 'bg-charcoal' },
        { name: 'graphite', value: '#5c5549', css: 'bg-graphite' },
        { name: 'pewter', value: '#7d7567', css: 'bg-pewter' },
        { name: 'silver', value: '#9e968a', css: 'bg-silver' },
      ]
    },
    {
      name: 'Semantic - Market Data',
      colors: [
        { name: 'profit', value: '#0f8a5f', css: 'bg-profit' },
        { name: 'profit-light', value: '#2db87a', css: 'bg-profit-light' },
        { name: 'loss', value: '#c93545', css: 'bg-loss' },
        { name: 'loss-light', value: '#e05565', css: 'bg-loss-light' },
        { name: 'warning', value: '#d4850a', css: 'bg-warning' },
        { name: 'warning-light', value: '#f0a82e', css: 'bg-warning-light' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-ink mb-2 font-[family-name:var(--font-display)]">
          Iktissad Color Palette
        </h1>
        <p className="text-graphite mb-8">Brand Color: #005B9F</p>

        {colorGroups.map((group) => (
          <div key={group.name} className="mb-12">
            <h2 className="text-xl font-bold text-ink mb-4 font-[family-name:var(--font-display)]">
              {group.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {group.colors.map((color) => (
                <div key={color.name} className="text-center">
                  <div
                    className="h-24 rounded-lg shadow-md mb-2 border border-sand"
                    style={{ backgroundColor: color.value }}
                  />
                  <p className="text-sm font-semibold text-ink">{color.name}</p>
                  <p className="text-xs text-graphite">{color.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Live Preview Section */}
        <div className="mt-16 p-8 bg-brand rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-4 font-[family-name:var(--font-display)]">
            Live Preview - Brand Blue Background
          </h2>
          <p className="text-white/80 mb-6">This is how text looks on the brand color</p>
          <div className="flex gap-4 flex-wrap">
            <button className="px-6 py-3 bg-gold text-brand-darker font-bold rounded">
              Gold Button
            </button>
            <button className="px-6 py-3 bg-white text-brand font-bold rounded">
              White Button
            </button>
            <button className="px-6 py-3 border-2 border-gold text-gold font-bold rounded">
              Outline Button
            </button>
          </div>
        </div>

        {/* Card Examples */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-card border-t-4 border-brand">
            <h3 className="font-bold text-ink mb-2">Brand Card</h3>
            <p className="text-graphite text-sm">Card with brand accent</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-card border-t-4 border-gold">
            <h3 className="font-bold text-ink mb-2">Gold Card</h3>
            <p className="text-graphite text-sm">Card with gold accent</p>
          </div>
          <div className="bg-brand-darker p-6 rounded-lg shadow-card">
            <h3 className="font-bold text-white mb-2">Dark Card</h3>
            <p className="text-white/70 text-sm">Card with dark background</p>
          </div>
        </div>
      </div>
    </div>
  );
}
