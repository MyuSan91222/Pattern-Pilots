import { useEffect, useRef, useState } from 'react';
import { staggerIn, springIn } from '../utils/animations';

// ─── Original hook: triggers CSS class on scroll ───────────────────────────────
export function useScrollAnimation(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      ...options,
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

// ─── Anime.js spring entrance on scroll ────────────────────────────────────────
// Attach ref to a container — it springs in when it enters the viewport.
export function useAnimeIn({
  delay    = 0,
  duration = 700,
  distance = 22,
} = {}) {
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Start invisible
    el.style.opacity = '0';
    el.style.transform = `translateY(${distance}px) scale(0.93)`;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        springIn(el, { delay, duration, distance });
        observer.unobserve(el);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, duration, distance]);

  return ref;
}

// ─── Anime.js stagger: animates [data-stagger] children on scroll ──────────────
// Attach ref to the parent container — children with [data-stagger] stagger in.
export function useStaggerAnimation({
  delay    = 65,
  duration = 650,
  distance = 18,
} = {}) {
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll('[data-stagger]');
    if (!items.length) return;

    // Start invisible
    items.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = `translateY(${distance}px) scale(0.96)`;
    });

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        staggerIn(items, { delay, duration, distance });
        observer.unobserve(container);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    observer.observe(container);
    return () => observer.disconnect();
  }, [delay, duration, distance]);

  return ref;
}
