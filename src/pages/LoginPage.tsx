import { useState, useEffect } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { motion } from 'framer-motion';

// Custom hook for responsive breakpoints
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

// Custom cursor component for desktop only
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      const target = e.target as HTMLElement;
      const isClickable = target.closest('a, button, [role="button"], input, textarea, select, [onclick]');
      setIsPointer(!!isClickable);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <motion.div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: isPointer ? 40 : 12,
          height: isPointer ? 40 : 12,
          borderRadius: '50%',
          background: isPointer
            ? 'rgba(16, 185, 129, 0.15)'
            : 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
          border: isPointer ? '2px solid rgba(16, 185, 129, 0.6)' : 'none',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: `translate(-50%, -50%) scale(${isClicking ? 0.8 : 1})`,
          transition: 'width 0.2s ease, height 0.2s ease, background 0.2s ease, border 0.2s ease, transform 0.1s ease',
          mixBlendMode: 'difference',
        }}
      />
      <motion.div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: isPointer ? 50 : 32,
          height: isPointer ? 50 : 32,
          borderRadius: '50%',
          border: `1.5px solid ${isPointer ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.5)'}`,
          pointerEvents: 'none',
          zIndex: 9998,
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.3s ease, height 0.3s ease, border 0.2s ease',
        }}
      />
    </>
  );
};

// CSS for custom scrollbar and cursor
const globalStyles = `
  @media (pointer: fine) {
    .auth-page-custom-cursor {
      cursor: none !important;
    }
    .auth-page-custom-cursor * {
      cursor: none !important;
    }

    html:has(.auth-page-custom-cursor)::-webkit-scrollbar,
    body:has(.auth-page-custom-cursor)::-webkit-scrollbar {
      width: 12px;
    }

    html:has(.auth-page-custom-cursor)::-webkit-scrollbar-track,
    body:has(.auth-page-custom-cursor)::-webkit-scrollbar-track {
      background: #050505;
    }

    html:has(.auth-page-custom-cursor)::-webkit-scrollbar-thumb,
    body:has(.auth-page-custom-cursor)::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #10b981 0%, #0d9488 100%);
      border-radius: 6px;
      border: 3px solid #050505;
    }

    html:has(.auth-page-custom-cursor)::-webkit-scrollbar-thumb:hover,
    body:has(.auth-page-custom-cursor)::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
    }

    html:has(.auth-page-custom-cursor),
    body:has(.auth-page-custom-cursor) {
      scrollbar-width: thin;
      scrollbar-color: #10b981 #050505;
    }
  }

  @media (pointer: coarse) {
    .auth-page-custom-cursor {
      cursor: auto !important;
    }
    .auth-page-custom-cursor * {
      cursor: auto !important;
    }
  }
`;

export const LoginPage = () => {
  const isDesktop = useMediaQuery('(pointer: fine)');

  // Inject global styles
  useEffect(() => {
    const styleId = 'auth-page-custom-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = globalStyles;
      document.head.appendChild(styleElement);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div className={isDesktop ? 'auth-page-custom-cursor' : ''}>
      {isDesktop && <CustomCursor />}
      <LoginForm />
    </div>
  );
};
