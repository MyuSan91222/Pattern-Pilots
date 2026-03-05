import { useEffect } from 'react';

export default function PageWrapper({ children }) {
  useEffect(() => {
    // Create intersection observer for scroll-based fade-in
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-fade-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px' // Trigger 100px before element comes fully into view
      }
    );

    // Observe all card elements
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
      observer.observe(card);
    });

    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [children]);

  return children;
}
