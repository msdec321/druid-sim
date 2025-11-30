import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Spell } from '../../types';
import styles from './SpellTooltip.module.css';

interface SpellTooltipProps {
  spell: Spell;
  children: React.ReactNode;
}

export function SpellTooltip({ spell, children }: SpellTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = (e: React.MouseEvent) => {
    // Position tooltip to the right of cursor with some offset
    const offset = 15;
    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // Keep tooltip within viewport
    const tooltipWidth = 300; // approximate max width
    const tooltipHeight = 400; // approximate max height

    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - offset;
    }

    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - 10;
    }

    setPosition({ x, y });
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (spell.tooltip) {
      updatePosition(e);
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Don't render tooltip wrapper if no tooltip image
  if (!spell.tooltip) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={updatePosition}
    >
      {children}

      {isVisible && createPortal(
        <div
          className={styles.tooltip}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <img
            src={spell.tooltip}
            alt={`${spell.name} tooltip`}
            className={styles.tooltipImage}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
