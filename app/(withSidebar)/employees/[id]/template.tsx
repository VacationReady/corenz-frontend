"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                ease: [0.25, 0.4, 0.25, 1],
                duration: 0.4,
            }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}
