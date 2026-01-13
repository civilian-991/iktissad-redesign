'use client';

import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const marketData = [
  { name: 'تاسي', value: '12,458.32', change: '+1.24%', up: true },
  { name: 'سوق دبي', value: '4,287.65', change: '+0.87%', up: true },
  { name: 'بورصة مصر', value: '28,934.21', change: '-0.32%', up: false },
  { name: 'بورصة الكويت', value: '7,892.45', change: '+0.54%', up: true },
  { name: 'بورصة قطر', value: '10,234.78', change: '+0.92%', up: true },
  { name: 'نفط برنت', value: '$82.45', change: '-0.18%', up: false },
  { name: 'ذهب', value: '$2,034.50', change: '+0.45%', up: true },
  { name: 'EUR/USD', value: '1.0892', change: '+0.12%', up: true },
];

export default function MarketTicker() {
  return (
    <div className="bg-obsidian border-b border-gold/10 overflow-hidden">
      <div className="container-editorial">
        <div className="flex items-center py-3">
          {/* Label */}
          <div className="flex-shrink-0 flex items-center gap-2 pl-6 border-l border-gold/20">
            <div className="w-2 h-2 rounded-full bg-profit animate-pulse" />
            <span className="text-gold text-xs font-[family-name:var(--font-display)] font-bold whitespace-nowrap">
              الأسواق الآن
            </span>
          </div>

          {/* Scrolling Ticker */}
          <div className="flex-1 overflow-hidden mr-6">
            <motion.div
              className="flex items-center gap-8"
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 30,
                  ease: 'linear',
                },
              }}
            >
              {[...marketData, ...marketData].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 whitespace-nowrap"
                >
                  <span className="text-white/60 text-xs font-[family-name:var(--font-display)]">
                    {item.name}
                  </span>
                  <span className="text-white text-xs font-[family-name:var(--font-accent)] font-semibold market-ticker">
                    {item.value}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-[family-name:var(--font-accent)] ${
                    item.up ? 'text-profit' : 'text-loss'
                  }`}>
                    {item.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {item.change}
                  </span>
                  <span className="w-px h-3 bg-gold/20" />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
