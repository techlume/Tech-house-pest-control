import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Universal Scroll reveal observer for sections, cards, buttons, titles & grid items
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const revealSelector = '.sf-reveal, .sf-reveal-left, .sf-reveal-right, .sf-risk-card, .sf-calc-card, .sf-process-card, .sf-faq-item, .sf-section-title, .sf-allotment-btn, .sf-plan-card, header, footer';
    const revealElements = document.querySelectorAll(revealSelector);
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="sf-scroll-top"
      aria-label="Scroll to top"
      title="Back to Top"
    >
      <ChevronUp size={22} />
    </button>
  );
}
