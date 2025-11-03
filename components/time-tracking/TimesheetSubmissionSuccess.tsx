'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check } from 'lucide-react';

interface TimesheetSubmissionSuccessProps {
  open: boolean;
  onClose: () => void;
  autoDismissMs?: number;
}

const sparkles = [
  { top: '12%', left: '18%', delay: 0 },
  { top: '24%', right: '14%', delay: 0.12 },
  { bottom: '18%', left: '25%', delay: 0.24 },
  { bottom: '8%', right: '22%', delay: 0.36 },
];

export default function TimesheetSubmissionSuccess({
  open,
  onClose,
  autoDismissMs = 3200,
}: TimesheetSubmissionSuccessProps) {
  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      onClose();
    }, autoDismissMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [open, autoDismissMs, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="timesheet-success"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_40px_120px_-30px_rgba(16,185,129,0.35)]"
            initial={{ scale: 0.8, opacity: 0, rotateX: -8 }}
            animate={{
              scale: 1,
              opacity: 1,
              rotateX: 0,
              transition: {
                type: 'spring',
                stiffness: 220,
                damping: 18,
                mass: 0.8,
              },
            }}
            exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 via-teal-400/10 to-blue-500/10" />
            <div className="relative px-8 pb-8 pt-10 text-center text-white">
              <motion.div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/90 shadow-[0_20px_60px_-25px_rgba(16,185,129,0.9)]"
                initial={{ scale: 0.75, rotate: -8, opacity: 0 }}
                animate={{
                  scale: [0.75, 1.05, 1],
                  rotate: [0, 6, 0],
                  opacity: 1,
                  transition: { duration: 0.6, ease: 'easeOut' },
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <Check className="h-10 w-10" strokeWidth={2.5} />
                </motion.div>
              </motion.div>

              <motion.h3
                className="mb-2 text-2xl font-semibold tracking-tight"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.35, ease: 'easeOut' }}
              >
                Timesheet submitted!
              </motion.h3>
              <motion.p
                className="mx-auto mb-6 max-w-xs text-sm text-slate-200/85"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.35, ease: 'easeOut' }}
              >
                Your timesheet is on its way for approval. We’ll ping you as soon as it’s been reviewed.
              </motion.p>

              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200/90"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.35, ease: 'easeOut' }}
              >
                <Bell className="h-4 w-4" />
                You’ll get a notification when a decision is made
              </motion.div>

              <motion.button
                type="button"
                onClick={onClose}
                className="mt-8 inline-flex items-center justify-center rounded-full bg-white/15 px-6 py-2.5 text-sm font-medium text-white shadow-[0_12px_40px_-24px_rgba(148,163,184,0.45)] backdrop-blur transition hover:bg-white/25"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.35, ease: 'easeOut' }}
              >
                Got it
              </motion.button>
            </div>

            {sparkles.map((sparkle, index) => (
              <motion.span
                key={index}
                className="absolute h-3 w-3 rounded-full bg-white/90"
                style={sparkle}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1, 0.4, 1],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: sparkle.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
