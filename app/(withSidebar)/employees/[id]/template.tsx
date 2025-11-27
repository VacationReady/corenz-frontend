"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            // Start nearly visible to prevent white flash during scroll/navigation
            initial={{ opacity: 0.97, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                ease: [0.25, 0.4, 0.25, 1],
                duration: 0.2,
            }}
            className="w-full h-full"
            // Prevent paint issues during scroll
            style={{ 
                willChange: 'opacity, transform',
                backfaceVisibility: 'hidden',
            }}
        >
            {children}
        </motion.div>
    );
}
