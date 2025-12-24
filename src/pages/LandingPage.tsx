import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Zap,
  ArrowRight,
  Lock,
  Bell,
  Sparkles
} from 'lucide-react';
import Logo from '../assets/logo.svg';

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

      // Check if hovering over clickable element
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
      {/* Main cursor dot */}
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
      {/* Cursor trail/ring */}
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
        animate={{
          x: position.x - position.x,
          y: position.y - position.y,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      />
    </>
  );
};

// CSS for custom scrollbar and hiding default cursor (desktop only)
const globalStyles = `
  /* Custom scrollbar - only for devices with fine pointer (mouse) */
  @media (pointer: fine) {
    /* Hide default cursor on landing page */
    .landing-page-custom-cursor {
      cursor: none !important;
    }
    .landing-page-custom-cursor * {
      cursor: none !important;
    }

    /* Custom Scrollbar for html/body */
    html:has(.landing-page-custom-cursor)::-webkit-scrollbar,
    body:has(.landing-page-custom-cursor)::-webkit-scrollbar {
      width: 12px;
    }

    html:has(.landing-page-custom-cursor)::-webkit-scrollbar-track,
    body:has(.landing-page-custom-cursor)::-webkit-scrollbar-track {
      background: #050505;
    }

    html:has(.landing-page-custom-cursor)::-webkit-scrollbar-thumb,
    body:has(.landing-page-custom-cursor)::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #10b981 0%, #0d9488 100%);
      border-radius: 6px;
      border: 3px solid #050505;
    }

    html:has(.landing-page-custom-cursor)::-webkit-scrollbar-thumb:hover,
    body:has(.landing-page-custom-cursor)::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #34d399 0%, #10b981 100%);
    }

    /* Firefox scrollbar */
    html:has(.landing-page-custom-cursor),
    body:has(.landing-page-custom-cursor) {
      scrollbar-width: thin;
      scrollbar-color: #10b981 #050505;
    }
  }

  /* Touch devices - use default cursor and scrollbar */
  @media (pointer: coarse) {
    .landing-page-custom-cursor {
      cursor: auto !important;
    }
    .landing-page-custom-cursor * {
      cursor: auto !important;
    }
  }
`;

// Landing page specific styles to override global CSS
const landingStyles = {
  page: {
    background: '#050505',
    fontFamily: '"DM Sans", sans-serif',
    color: '#f1f5f9',
    minHeight: '100vh',
    overflowX: 'hidden' as const,
  },
  h1: {
    fontFamily: '"Syne", sans-serif',
    color: '#ffffff',
    fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: '1.5rem',
  },
  h2: {
    fontFamily: '"Syne", sans-serif',
    color: '#f1f5f9',
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: '1.5rem',
  },
  h3: {
    fontFamily: '"Syne", sans-serif',
    color: '#f1f5f9',
    fontSize: '1.25rem',
    fontWeight: 700,
    lineHeight: 1.4,
    marginBottom: '0.75rem',
  },
  text: {
    color: '#94a3b8',
    fontSize: '1rem',
    lineHeight: 1.7,
    marginBottom: 0,
  },
  textLarge: {
    color: '#94a3b8',
    fontSize: '1.125rem',
    lineHeight: 1.7,
    marginBottom: 0,
  },
  gradientText: {
    background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #34d399 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
};

// Floating particle component for background ambiance
const FloatingParticle = ({ delay, duration, size, left, top }: {
  delay: number;
  duration: number;
  size: number;
  left: string;
  top: string;
}) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left,
      top,
      background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)',
      filter: 'blur(1px)',
    }}
    animate={{
      y: [-20, 20, -20],
      x: [-10, 10, -10],
      opacity: [0.3, 0.6, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// 3D Isometric cube component for hero visual
const IsometricCube = ({
  size,
  color,
  delay,
  x,
  y
}: {
  size: number;
  color: string;
  delay: number;
  x: number;
  y: number;
}) => (
  <motion.div
    style={{
      position: 'absolute',
      left: x,
      top: y,
    }}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{
      opacity: 1,
      scale: 1,
      y: [0, -15, 0],
    }}
    transition={{
      opacity: { duration: 0.6, delay },
      scale: { duration: 0.6, delay },
      y: { duration: 3, delay: delay + 0.5, repeat: Infinity, ease: 'easeInOut' }
    }}
  >
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
        transform: 'rotateX(-20deg) rotateY(45deg)',
      }}
    >
      {/* Top face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
          transform: `translateZ(${size/2}px)`,
          borderRadius: 8,
          boxShadow: `0 0 30px ${color}66`,
        }}
      />
      {/* Front face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${color}cc 0%, ${color}66 100%)`,
          transform: `rotateX(-90deg) translateZ(${size/2}px)`,
          borderRadius: 8,
        }}
      />
      {/* Side face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, ${color}99 0%, ${color}44 100%)`,
          transform: `rotateY(90deg) translateZ(${size/2}px)`,
          borderRadius: 8,
        }}
      />
    </div>
  </motion.div>
);

// Feature card component - Neo-Noir Tech aesthetic
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        y: -6,
        transition: { duration: 0.3 }
      }}
      style={{
        position: 'relative',
        height: '100%',
      }}
    >
      {/* Glow effect on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: '-1px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(74,222,128,0.3) 0%, rgba(16,185,129,0.1) 50%, rgba(20,184,166,0.3) 100%)',
          filter: 'blur(8px)',
          zIndex: 0,
        }}
      />

      {/* Card container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          borderRadius: '20px',
          padding: '32px',
          background: 'linear-gradient(165deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.99) 100%)',
          border: '1px solid rgba(74,222,128,0.15)',
          backdropFilter: 'blur(10px)',
          boxShadow: `
            0 4px 24px -4px rgba(0,0,0,0.5),
            inset 0 1px 0 0 rgba(255,255,255,0.03)
          `,
        }}
      >
        {/* Icon container with glow */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            marginBottom: '28px',
            background: 'linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(74,222,128,0.08) 100%)',
            border: '1px solid rgba(74,222,128,0.25)',
            boxShadow: `
              0 0 20px -5px rgba(74,222,128,0.3),
              inset 0 1px 0 0 rgba(255,255,255,0.05)
            `,
          }}
        >
          <Icon
            style={{
              width: '28px',
              height: '28px',
              color: '#4ADE80',
              filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.4))'
            }}
          />
        </div>

        {/* Title - using div to avoid any h3 global styles */}
        <div
          style={{
            fontFamily: 'Syne, sans-serif',
            color: '#ffffff',
            fontSize: '22px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.4,
            marginBottom: '16px',
            paddingBottom: '4px',
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: '"DM Sans", sans-serif',
            color: '#9ca3af',
            fontSize: '15px',
            lineHeight: 1.7,
            letterSpacing: '0.01em',
          }}
        >
          {description}
        </div>

        {/* Decorative corner accent */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            opacity: 0.15,
          }}
        >
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0h12v2H2v10H0V0z" fill="#4ADE80"/>
            <path d="M32 32h-12v-2h10V20h2v12z" fill="#4ADE80"/>
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export const LandingPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isDesktop = useMediaQuery('(pointer: fine)');

  // Inject global styles for custom scrollbar and cursor
  useEffect(() => {
    const styleId = 'landing-page-custom-styles';
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = globalStyles;
      document.head.appendChild(styleElement);
    }

    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Generate particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    duration: 4 + Math.random() * 3,
    size: 4 + Math.random() * 8,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
  }));

  const features = [
    {
      icon: Zap,
      title: 'Real-time Messaging',
      description: 'Lightning-fast message delivery with live typing indicators. Your conversations flow naturally without any delays.',
    },
    {
      icon: Shield,
      title: 'End-to-End Security',
      description: 'Your conversations stay private with military-grade encryption. Only you and your recipients can read your messages.',
    },
    {
      icon: Users,
      title: 'Group Collaboration',
      description: 'Create channels, manage groups, and share files seamlessly. Perfect for teams of any size.',
    },
  ];

  return (
    <div
      ref={containerRef}
      className={isDesktop ? 'landing-page-custom-cursor' : ''}
      style={landingStyles.page}
    >
      {/* Custom cursor - only on desktop */}
      {isDesktop && <CustomCursor />}

      {/* Background gradient mesh */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(16,185,129,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 10%, rgba(20,184,166,0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 100%, rgba(16,185,129,0.08) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <FloatingParticle key={p.id} {...p} />
        ))}
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backdropFilter: 'blur(12px)',
          background: 'rgba(5,5,5,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            padding: isMobile ? '0.875rem 1rem' : '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : '0.75rem',
              textDecoration: 'none',
            }}
          >
            <img
              src={Logo}
              alt="Simpchat Logo"
              style={{
                width: isMobile ? '2.5rem' : '3rem',
                height: isMobile ? '2.5rem' : '3rem',
                filter: 'drop-shadow(0 0 10px rgba(74, 222, 128, 0.4))',
              }}
            />
          </Link>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
            <Link
              to="/login"
              style={{
                padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 1rem',
                fontSize: isMobile ? '0.813rem' : '0.875rem',
                fontWeight: 600,
                color: '#10b981',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: isMobile ? '0.5rem 0.875rem' : '0.625rem 1.25rem',
                fontSize: isMobile ? '0.813rem' : '0.875rem',
                fontWeight: 600,
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                color: '#050505',
                textDecoration: 'none',
                boxShadow: '0 0 20px rgba(16,185,129,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '5rem',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: isMobile ? '3rem 1rem' : '5rem 1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isTablet ? '1fr' : 'repeat(2, 1fr)',
              gap: isTablet ? '2rem' : '4rem',
              alignItems: 'center',
            }}
          >
            {/* Left content */}
            <div style={{ textAlign: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{ marginBottom: '1.5rem' }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10b981',
                  }}
                >
                  <Sparkles style={{ width: '1rem', height: '1rem' }} />
                  Simple. Secure. Seamless.
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={landingStyles.h1}
              >
                <span style={{ color: '#ffffff' }}>Connect.</span>
                <br />
                <span style={landingStyles.gradientText}>Chat.</span>
                <br />
                <span style={{ color: '#ffffff' }}>Simplify.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                style={{
                  ...landingStyles.textLarge,
                  marginBottom: '2.5rem',
                  maxWidth: '32rem',
                  margin: '0 auto 2.5rem auto',
                }}
              >
                Experience real-time messaging reimagined. Simpchat brings you
                instant communication with uncompromising security and elegant simplicity.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '1rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.875rem 1.75rem',
                    fontSize: '0.938rem',
                    fontWeight: 600,
                    borderRadius: '0.75rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                    color: '#050505',
                    boxShadow: '0 0 25px rgba(16,185,129,0.35)',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Start Chatting Free
                  <ArrowRight style={{ width: '1.125rem', height: '1.125rem' }} />
                </Link>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.875rem 1.75rem',
                    fontSize: '0.938rem',
                    fontWeight: 600,
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f1f5f9',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Open App
                </Link>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  gap: isMobile ? '0.75rem' : '2rem',
                  marginTop: '2.5rem',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock style={{ width: '1rem', height: '1rem', color: '#34d399' }} />
                  <span style={{ fontSize: isMobile ? '0.813rem' : '0.875rem', color: '#64748b' }}>End-to-end encrypted</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell style={{ width: '1rem', height: '1rem', color: '#34d399' }} />
                  <span style={{ fontSize: isMobile ? '0.813rem' : '0.875rem', color: '#64748b' }}>Real-time notifications</span>
                </div>
              </motion.div>
            </div>

            {/* Right visual - 3D isometric cubes (hidden on tablet/mobile) */}
            {!isTablet && (
            <div
              style={{
                position: 'relative',
                height: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Glow backdrop */}
                <div
                  style={{
                    position: 'absolute',
                    width: '20rem',
                    height: '20rem',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                  }}
                />

                {/* Isometric cubes */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    perspective: '1000px',
                  }}
                >
                  <IsometricCube size={100} color="#10b981" delay={0} x={180} y={120} />
                  <IsometricCube size={70} color="#14b8a6" delay={0.2} x={280} y={180} />
                  <IsometricCube size={50} color="#34d399" delay={0.4} x={220} y={250} />
                  <IsometricCube size={80} color="#10b981" delay={0.3} x={120} y={200} />
                  <IsometricCube size={60} color="#0d9488" delay={0.5} x={300} y={280} />
                  <IsometricCube size={40} color="#14b8a6" delay={0.6} x={160} y={300} />
                </div>

                {/* Floating chat bubble - top right */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  style={{
                    position: 'absolute',
                    top: '100px',
                    right: '20px',
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 20px',
                      borderRadius: '16px 16px 4px 16px',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.15) 100%)',
                      border: '1px solid rgba(16,185,129,0.4)',
                      backdropFilter: 'blur(8px)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#6ee7b7' }}>
                      Hey! Welcome to Simpchat
                    </span>
                  </div>
                </motion.div>

                {/* Floating chat bubble - bottom left */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  style={{
                    position: 'absolute',
                    bottom: '100px',
                    left: '20px',
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 20px',
                      borderRadius: '16px 16px 16px 4px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(8px)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                      Thanks! This is amazing
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: '2rem',
              height: '3.5rem',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '0.625rem',
              border: '2px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: '0.5rem',
                height: '1rem',
                borderRadius: '9999px',
                background: 'linear-gradient(180deg, #10b981 0%, #14b8a6 100%)',
                boxShadow: '0 0 8px rgba(16,185,129,0.5)',
              }}
            />
          </motion.div>
          <p style={{
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.4)',
            marginTop: '0.5rem',
            textAlign: 'center',
            fontWeight: 500,
          }}>
            Scroll
          </p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          position: 'relative',
          padding: isMobile ? '4rem 0' : '8rem 0',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: isMobile ? '0 1rem' : '0 1.5rem' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={landingStyles.h2}>
              Built for{' '}
              <span style={landingStyles.gradientText}>Modern Teams</span>
            </h2>
            <p
              style={{
                ...landingStyles.textLarge,
                maxWidth: '42rem',
                margin: '0 auto',
              }}
            >
              Everything you need for seamless communication, wrapped in an
              elegant interface that stays out of your way.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem'
          }}>
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ position: 'relative', padding: isMobile ? '4rem 0' : '8rem 0' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', padding: isMobile ? '0 1rem' : '0 1.5rem', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'relative',
              borderRadius: isMobile ? '1rem' : '1.5rem',
              padding: isMobile ? '2.5rem 1.5rem' : '4rem 3rem',
              overflow: 'hidden',
              background: 'linear-gradient(145deg, rgba(16,185,129,0.1) 0%, rgba(5,5,5,0.9) 100%)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            {/* Background glow */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                height: '50%',
                background: 'radial-gradient(ellipse at center top, rgba(16,185,129,0.15) 0%, transparent 70%)',
              }}
            />

            <h2 style={{ ...landingStyles.h2, position: 'relative' }}>
              Ready to simplify your conversations?
            </h2>
            <p
              style={{
                ...landingStyles.textLarge,
                position: 'relative',
                maxWidth: '32rem',
                margin: '0 auto 2.5rem auto',
              }}
            >
              Join thousands of users who have already made the switch to
              simpler, more secure messaging.
            </p>
            <Link
              to="/register"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                color: '#050505',
                boxShadow: '0 0 40px rgba(16,185,129,0.4)',
                textDecoration: 'none',
              }}
            >
              Get Started — It's Free
              <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          position: 'relative',
          padding: isMobile ? '2rem 0' : '3rem 0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: isMobile ? '0 1rem' : '0 1.5rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'space-between',
              gap: isMobile ? '1rem' : '1.5rem',
            }}
          >
            <img
              src={Logo}
              alt="Simpchat Logo"
              style={{
                width: '2.5rem',
                height: '2.5rem',
              }}
            />
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              © {new Date().getFullYear()} Simpchat. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
