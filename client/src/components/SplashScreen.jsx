import { useEffect, useRef, useState } from 'react';
import anime from 'animejs/lib/anime.es.js';

export default function SplashScreen({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);
  const lettersRef = useRef([]);
  const dotsRef = useRef([]);
  const logoRef = useRef(null);
  const text = 'Pattern Pilots';
  const letters = text.split('');
  const stormColor = '#4a5f7f';

  useEffect(() => {
    const els = lettersRef.current.filter(Boolean);
    if (!els.length) return;

    // Logo spring-in first
    anime({
      targets: logoRef.current,
      opacity: [0, 1],
      scale: [0.5, 1],
      duration: 400,
      easing: 'cubicBezier(0.34, 1.56, 0.64, 1)',
    });

    // Letters stagger in with blur + scale (anime.js signature effect)
    const letterAnim = anime({
      targets: els,
      opacity: [0, 1],
      translateY: [28, 0],
      scale: [0.3, 1],
      filter: ['blur(6px)', 'blur(0px)'],
      color: [['#a0a1a8', stormColor]],
      delay: anime.stagger(50, { start: 100 }),
      duration: 500,
      easing: 'cubicBezier(0.25, 0.46, 0.45, 0.94)',
      complete: () => {
        // Dots pulse in after letters are done
        anime({
          targets: dotsRef.current.filter(Boolean),
          opacity: [0, 1],
          scale: [0, 1],
          delay: anime.stagger(60),
          duration: 300,
          easing: 'cubicBezier(0.34, 1.56, 0.64, 1)',
          complete: () => {
            setTimeout(() => setFadeOut(true), 600);
          },
        });
      },
    });

    return () => letterAnim.pause();
  }, []);

  useEffect(() => {
    if (fadeOut) {
      // Fade out logo + letters together
      anime({
        targets: [logoRef.current, ...lettersRef.current.filter(Boolean), ...dotsRef.current.filter(Boolean)],
        opacity: [1, 0],
        translateY: [0, -12],
        scale: [1, 0.92],
        duration: 350,
        easing: 'cubicBezier(0.4, 0, 0.2, 1)',
      });
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [fadeOut, onComplete]);

  return (
    <div className={`fixed inset-0 bg-ink-950 flex items-center justify-center overflow-hidden z-50 transition-opacity duration-700 ${
      fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}>
      {/* Dot-grid background — anime.js aesthetic */}
      <div className="fixed inset-0 pointer-events-none anime-grid-bg opacity-[0.035]" />

      {/* Mirror shine sweep */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, transparent 40%, rgba(100,100,100,0.7) 40%, rgba(80,80,80,0.9) 50%, rgba(100,100,100,0.7) 60%, transparent 100%)',
          animation: 'mirrorShine 2.2s ease-in-out forwards',
          backgroundSize: '150% 100%',
        }} />

      <div className="relative z-10 flex flex-col items-center gap-14">

        {/* Logo — springs in */}
        <div ref={logoRef}
          className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center shadow-lg"
          style={{ opacity: 0, boxShadow: '0 0 32px rgb(var(--accent) / 0.4)' }}>
          <span className="text-ink-950 font-bold text-2xl" style={{ fontFamily: 'Syne' }}>PP</span>
        </div>

        {/* Letter stagger row */}
        <div className="flex justify-center gap-0.5 h-20 items-center relative">
          {letters.map((letter, index) => (
            <span
              key={index}
              ref={el => (lettersRef.current[index] = el)}
              className="text-5xl font-bold leading-none"
              style={{
                fontFamily: 'Syne',
                opacity: 0,
                color: stormColor,
                willChange: 'transform, opacity, filter',
              }}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </div>

        {/* Loading dots — stagger in after letters */}
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              ref={el => (dotsRef.current[i] = el)}
              className="w-2.5 h-2.5 rounded-full bg-accent"
              style={{
                opacity: 0,
                animation: `smoothPulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 0.25}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes smoothPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes mirrorShine {
          0%   { transform: translateX(-100%) scaleY(0.3); opacity: 0; }
          100% { transform: translateX(100%)  scaleY(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
