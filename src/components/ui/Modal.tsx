import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  SPRING_SHEET,
  SHEET_DISMISS_FRACTION,
  SHEET_DISMISS_VELOCITY,
  REDUCED_MOTION_TRANSITION,
} from '../../lib/motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const dragControls = useDragControls();

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  // Focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;

      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        first?.focus();
      });
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  const transition = shouldReduceMotion ? REDUCED_MOTION_TRANSITION : SPRING_SHEET;

  // Mobile: slide up/down. Desktop: fade + scale.
  const panelVariants = isMobile
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
      };

  return (
    <AnimatePresence>
      {open && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- backdrop click-to-close is progressive enhancement; keyboard users have ESC via document-level handler
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        >
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className={`
              ${sizeClasses[size]} w-full bg-surface-50 dark:bg-surface-900
              rounded-t-2xl sm:rounded-2xl shadow-xl
              max-h-[88vh] sm:max-h-[80vh] overflow-y-auto
            `}
            style={{
              paddingBottom: 'calc(16px + var(--safe-bottom))',
              touchAction: isMobile ? 'pan-y' : undefined,
            }}
            {...panelVariants}
            transition={transition}
            drag={isMobile ? 'y' : false}
            // drag="y" on the whole panel swallows touch scrolling — dismissal
            // drag must start from the handle/header only (dragControls)
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.05}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (!isMobile) return;
              const el = contentRef.current;
              const height = el ? el.offsetHeight : window.innerHeight * 0.88;
              if (
                info.offset.y > height * SHEET_DISMISS_FRACTION ||
                info.velocity.y > SHEET_DISMISS_VELOCITY
              ) {
                onClose();
              }
            }}
          >
            {/* Drag handle pill — mobile only; dismissal drag starts here */}
            {isMobile && (
              <div
                className="flex justify-center pt-3 pb-1"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
              </div>
            )}

            <div
              className="sticky top-0 flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 rounded-t-2xl sm:rounded-t-2xl z-10"
              style={isMobile ? { touchAction: 'none' } : undefined}
              onPointerDown={isMobile ? (e) => dragControls.start(e) : undefined}
            >
              <h2
                id="modal-title"
                className="text-lg font-semibold text-surface-900 dark:text-surface-100"
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center text-surface-500 dark:text-surface-400"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
