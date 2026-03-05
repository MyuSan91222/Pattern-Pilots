/**
 * SkipToMain Component - Accessibility feature for keyboard users
 * Allows users to skip repetitive navigation and jump directly to main content
 */
export default function SkipToMain() {
  const handleSkip = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="skip-to-main text-white font-semibold text-sm"
    >
      Skip to main content
    </a>
  );
}
