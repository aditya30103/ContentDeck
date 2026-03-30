// Shared framer-motion constants for gesture thresholds, spring configs, and reduced-motion.

export const SHEET_DISMISS_FRACTION = 0.4; // 40% of sheet height triggers dismiss
export const SHEET_DISMISS_VELOCITY = 500; // px/s velocity triggers dismiss
export const SWIPE_DISMISS_OFFSET = 80; // px horizontal offset triggers dismiss
export const SWIPE_DISMISS_VELOCITY = 400; // px/s horizontal velocity triggers dismiss

export const SPRING_SHEET = { type: 'spring' as const, damping: 30, stiffness: 300 };

// Use for useReducedMotion() — replaces spring with instant transition
export const REDUCED_MOTION_TRANSITION = { duration: 0 };
