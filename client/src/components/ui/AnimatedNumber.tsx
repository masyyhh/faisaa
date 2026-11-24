import { useEffect, useState } from 'react';

export interface AnimatedNumberProps {
  value: number;
  duration?: number; // duration in ms (default: 850)
  decimals?: number; // decimal places (default: 2)
  currency?: string; // optional currency prefix (e.g. 'MVR', 'USD')
  prefix?: string; // custom prefix (e.g. '+', '-', '≈ $')
  suffix?: string; // custom suffix (e.g. '%', ' USD')
  hide?: boolean; // if true, renders '••••••••'
  className?: string;
  formatFn?: (val: number) => string;
}

// 3 cycles of digits 0-9 (30 items) to provide smooth vertical scrolling rotation
const REEL_DIGITS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
];

function ScrollDigit({
  char,
  digitIndex,
  duration = 850,
}: {
  char: string;
  digitIndex: number;
  duration?: number;
}) {
  const isDigit = /^[0-9]$/.test(char);
  const targetNum = isDigit ? parseInt(char, 10) : 0;
  const [activePos, setActivePos] = useState<number>(0);

  useEffect(() => {
    if (!isDigit) return;
    // Set to middle set position (10 + targetNum) to produce a mechanical reel roll
    const frame = setTimeout(() => {
      setActivePos(10 + targetNum);
    }, 25);
    return () => clearTimeout(frame);
  }, [targetNum, isDigit]);

  if (!isDigit) {
    return (
      <span className="inline-block leading-none select-none text-current">
        {char}
      </span>
    );
  }

  const translateYPercent = (activePos / REEL_DIGITS.length) * 100;

  return (
    <span
      className="inline-block overflow-hidden relative select-none tabular-nums font-variant-numeric"
      style={{
        height: '1.18em',
        lineHeight: 1,
        verticalAlign: '-0.14em',
        width: '1ch',
      }}
    >
      <span
        className="flex flex-col will-change-transform"
        style={{
          transform: `translateY(-${translateYPercent}%)`,
          transitionProperty: 'transform',
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: `${digitIndex * 30}ms`,
        }}
      >
        {REEL_DIGITS.map((n, idx) => (
          <span
            key={idx}
            className="flex items-center justify-center leading-none text-center"
            style={{ height: '1.18em', width: '1ch' }}
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export function AnimatedNumber({
  value,
  duration = 850,
  decimals = 2,
  currency,
  prefix = '',
  suffix = '',
  hide = false,
  className = '',
  formatFn,
}: AnimatedNumberProps) {
  if (hide) {
    return <span className={`tabular-nums select-none ${className}`}>••••••••</span>;
  }

  if (isNaN(value)) {
    return <span className={`tabular-nums ${className}`}>0.00</span>;
  }

  const formattedNum = formatFn
    ? formatFn(value)
    : value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  const currencyPrefix = currency ? `${currency} ` : '';
  const characters = formattedNum.split('');

  let digitCounter = 0;

  return (
    <span className={`inline-flex items-baseline tabular-nums tracking-tight font-variant-numeric ${className}`}>
      {prefix && <span className="inline-block mr-0.5 select-none">{prefix}</span>}
      {currencyPrefix && <span className="inline-block mr-1 select-none">{currencyPrefix}</span>}
      <span className="inline-flex items-baseline overflow-hidden leading-none">
        {characters.map((ch, i) => {
          const isDigit = /^[0-9]$/.test(ch);
          const currentDigitIdx = isDigit ? digitCounter++ : 0;
          return (
            <ScrollDigit
              key={`${i}-${ch}`}
              char={ch}
              digitIndex={currentDigitIdx}
              duration={duration}
            />
          );
        })}
      </span>
      {suffix && <span className="inline-block ml-0.5 select-none">{suffix}</span>}
    </span>
  );
}
export default AnimatedNumber;
