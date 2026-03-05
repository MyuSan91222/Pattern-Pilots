/**
 * Anime.js powered animation utilities
 * Inspired by animejs.com — stagger, spring physics, scroll reveals
 */
import anime from 'animejs/lib/anime.es.js';

// ─── Easing presets ────────────────────────────────────────────────────────────
export const ease = {
  spring:  'cubicBezier(0.34, 1.56, 0.64, 1)',  // Overshoot spring
  expo:    'cubicBezier(0.16, 1, 0.3, 1)',        // Expo out (fast → settle)
  soft:    'cubicBezier(0.25, 0.46, 0.45, 0.94)', // Soft ease
  sharp:   'cubicBezier(0.4, 0, 0.2, 1)',          // Material sharp
};

// ─── Stagger entrance (anime.js signature effect) ──────────────────────────────
export function staggerIn(targets, {
  delay    = 60,
  duration = 650,
  distance = 18,
  easing   = ease.expo,
  scale    = true,
} = {}) {
  if (!targets || (targets.length !== undefined && targets.length === 0)) return;
  return anime({
    targets,
    opacity:    [0, 1],
    translateY: [distance, 0],
    ...(scale ? { scale: [0.95, 1] } : {}),
    delay:    anime.stagger(delay),
    duration,
    easing,
  });
}

// ─── Spring entrance (single element, overshoot bounce) ───────────────────────
export function springIn(targets, {
  delay    = 0,
  duration = 700,
  distance = 24,
} = {}) {
  if (!targets) return;
  return anime({
    targets,
    opacity:    [0, 1],
    translateY: [distance, 0],
    scale:      [0.9, 1],
    delay,
    duration,
    easing: ease.spring,
  });
}

// ─── Stagger from center (grid reveal) ────────────────────────────────────────
export function gridStaggerIn(targets, {
  delay    = 80,
  duration = 700,
  from     = 'center',
} = {}) {
  if (!targets || (targets.length !== undefined && targets.length === 0)) return;
  return anime({
    targets,
    opacity:    [0, 1],
    translateY: [20, 0],
    scale:      [0.9, 1],
    delay:    anime.stagger(delay, { from }),
    duration,
    easing:   ease.spring,
  });
}

// ─── Letter stagger reveal ────────────────────────────────────────────────────
export function letterStaggerIn(targets, {
  delay    = 70,
  duration = 600,
} = {}) {
  if (!targets || (targets.length !== undefined && targets.length === 0)) return;
  return anime({
    targets,
    opacity:    [0, 1],
    translateY: [20, 0],
    scale:      [0.3, 1],
    filter:     ['blur(4px)', 'blur(0px)'],
    delay:    anime.stagger(delay),
    duration,
    easing:   ease.soft,
  });
}

// ─── Counter animation ────────────────────────────────────────────────────────
export function counterUp(element, from, to, {
  duration = 1100,
  round    = true,
} = {}) {
  if (!element) return;
  const obj = { count: from };
  return anime({
    targets:  obj,
    count:    to,
    duration,
    easing:   'easeOutExpo',
    update() {
      element.textContent = round ? Math.round(obj.count) : obj.count.toFixed(1);
    },
  });
}

// ─── Slide in from left (for sidebars, panels) ────────────────────────────────
export function slideInLeft(targets, { delay = 0, duration = 500 } = {}) {
  if (!targets) return;
  return anime({
    targets,
    opacity:    [0, 1],
    translateX: [-24, 0],
    delay,
    duration,
    easing: ease.expo,
  });
}

// ─── Progress bar fill ────────────────────────────────────────────────────────
export function fillBar(targets, percent, { delay = 0, duration = 900 } = {}) {
  if (!targets) return;
  return anime({
    targets,
    width: [`0%`, `${percent}%`],
    delay,
    duration,
    easing: ease.expo,
  });
}

// ─── Scroll-triggered stagger: call once container enters viewport ────────────
export function observeStagger(container, itemSelector = '[data-stagger]', options = {}) {
  if (!container) return;
  const items = container.querySelectorAll(itemSelector);
  if (!items.length) return;

  // Set initial invisible state
  items.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px) scale(0.96)';
  });

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      staggerIn(items, options);
      observer.unobserve(container);
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  observer.observe(container);
  return () => observer.disconnect();
}

export default anime;
