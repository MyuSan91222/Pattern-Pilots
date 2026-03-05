import { useEffect } from 'react';

export function useScrollFadeIn() {
  useEffect(() => {
    // Create intersection observer for scroll-based fade-in on cards
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Add animation class immediately when intersecting (no delays)
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-fade-in');
          } else {
            // Remove animation when leaving view so it can re-trigger on scroll back
            entry.target.classList.remove('scroll-fade-in');
          }
        });
      },
      { 
        threshold: [0, 0.25, 0.5, 0.75, 1], // More granular observation
        rootMargin: '100px 0px 100px 0px' // Trigger well before element is visible
      }
    );

    // Observe all card elements on the page
    const observeCards = () => {
      const cards = document.querySelectorAll('.card');
      cards.forEach((card) => {
        // Add to observer
        observer.observe(card);
      });
    };

    // Initial observation
    observeCards();

    // Set up a mutation observer to watch for new cards being added
    const mutationObserver = new MutationObserver(() => {
      observeCards();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}

