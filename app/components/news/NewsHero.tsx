"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import NewsTag from "../ui/NewsTag";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Share2,
  Bookmark,
  Eye,
  ArrowRight,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";

interface HeroPost {
  id: string;
  title: string;
  slug: string;
  content?: any;
  excerpt?: string;
  coverImage?: string;
  authorId?: string;
  author: {
    name: string | null;
    email: string;
    avatar?: string;
  };
  publishedAt: string | null;
  createdAt?: string;
  tags: string[];
  pinned: boolean;
  featured?: boolean;
  readTime?: number;
  views?: number;
  comments?: number;
  isBookmarked?: boolean;
  bookmarkCount?: number;
}

interface NewsHeroProps {
  posts: HeroPost[];
  autoPlayInterval?: number;
  onBookmark?: (post: HeroPost) => Promise<void> | void;
  onShare?: (post: HeroPost) => Promise<void> | void;
}

// Progress bar animation
function ProgressBar({ 
  isActive, 
  duration, 
  isPaused 
}: { 
  isActive: boolean; 
  duration: number; 
  isPaused: boolean;
}) {
  const progress = useMotionValue(0);

  useEffect(() => {
    if (!isActive) {
      progress.set(0);
      return;
    }

    if (isPaused) return;

    const controls = animate(progress, 100, {
      duration: duration / 1000,
      ease: "linear",
    });

    return () => controls.stop();
  }, [isActive, isPaused, duration, progress]);

  return (
    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-white to-white/80 rounded-full"
        style={{ width: progress.get() + "%" }}
        initial={{ width: "0%" }}
        animate={{ width: isActive && !isPaused ? "100%" : "0%" }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
    </div>
  );
}

export default function NewsHero({
  posts,
  autoPlayInterval = 7000,
  onBookmark,
  onShare,
}: NewsHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(0);

  const featuredPosts = posts.filter((post) => post.pinned || post.featured).slice(0, 5);

  useEffect(() => {
    if (isPaused || isHovered || featuredPosts.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % featuredPosts.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [currentIndex, isHovered, isPaused, featuredPosts.length, autoPlayInterval]);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % featuredPosts.length);
  }, [featuredPosts.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + featuredPosts.length) % featuredPosts.length);
  }, [featuredPosts.length]);

  if (featuredPosts.length === 0) return null;

  const currentPost = featuredPosts[currentIndex];

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning", emoji: "☀️", subtext: "Start your day informed" };
    if (hour < 17) return { greeting: "Good afternoon", emoji: "🌤️", subtext: "Stay in the loop" };
    if (hour < 21) return { greeting: "Good evening", emoji: "🌅", subtext: "Catch up on today" };
    return { greeting: "Good night", emoji: "🌙", subtext: "Quick updates before bed" };
  };

  const { greeting, emoji, subtext } = getTimeOfDayGreeting();

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 1.1,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.5 },
      },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      },
    }),
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full overflow-hidden rounded-3xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Container */}
      <div className="relative h-[520px] lg:h-[480px]">
        {/* Background Layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30 animate-gradient" />
        </div>

        {/* Image Carousel */}
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            {currentPost.coverImage ? (
              <>
                <img
                  src={currentPost.coverImage}
                  alt={currentPost.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600">
                <div 
                  className="absolute inset-0 opacity-50" 
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Content Grid */}
        <div className="absolute inset-0 flex flex-col lg:flex-row">
          {/* Left Content */}
          <div className="flex-1 flex flex-col justify-between p-6 lg:p-10 z-10">
            {/* Header */}
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <span className="text-3xl">{emoji}</span>
                <div>
                  <h2 className="text-white font-semibold text-lg">{greeting}</h2>
                  <p className="text-white/60 text-sm">{subtext}</p>
                </div>
              </motion.div>

              {/* Pause/Play Button */}
              {featuredPosts.length > 1 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all"
                >
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </motion.button>
              )}
            </div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPost.id}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-5 max-w-2xl"
              >
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentPost.pinned && (
                    <span className="px-3 py-1.5 bg-amber-500/90 text-amber-950 text-xs font-bold rounded-full shadow-lg shadow-amber-500/30">
                      📌 PINNED
                    </span>
                  )}
                  {currentPost.featured && (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-full shadow-lg shadow-violet-500/30">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      FEATURED
                    </span>
                  )}
                  {currentPost.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium rounded-full border border-white/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                  {currentPost.title}
                </h1>

                {/* Excerpt */}
                {currentPost.excerpt && (
                  <p className="text-white/70 text-lg line-clamp-2 leading-relaxed">
                    {currentPost.excerpt}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
                  <div className="flex items-center gap-2">
                    {currentPost.author.avatar ? (
                      <img
                        src={currentPost.author.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-white/70" />
                      </div>
                    )}
                    <span className="text-white/80 font-medium">
                      {currentPost.author.name || currentPost.author.email}
                    </span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  {currentPost.publishedAt && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(currentPost.publishedAt), { addSuffix: true })}
                    </span>
                  )}
                  {currentPost.views !== undefined && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        {currentPost.views.toLocaleString()} views
                      </span>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Link href={`/news/${currentPost.slug}`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "group flex items-center gap-2 px-6 py-3.5",
                        "bg-white text-slate-900 font-semibold rounded-xl",
                        "shadow-xl shadow-white/20",
                        "hover:shadow-2xl hover:shadow-white/30",
                        "transition-all duration-300"
                      )}
                    >
                      Read Story
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.preventDefault();
                      onShare?.(currentPost);
                    }}
                    className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/10 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.preventDefault();
                      onBookmark?.(currentPost);
                    }}
                    className={cn(
                      "p-3 rounded-xl backdrop-blur-md transition-all border",
                      currentPost.isBookmarked
                        ? "bg-amber-500/90 text-amber-950 border-amber-400"
                        : "bg-white/10 text-white hover:bg-white/20 border-white/10"
                    )}
                  >
                    <Bookmark className={cn("w-5 h-5", currentPost.isBookmarked && "fill-current")} />
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress Indicators */}
            {featuredPosts.length > 1 && (
              <div className="flex gap-2 mt-4">
                {featuredPosts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      index === currentIndex ? "w-12 bg-white" : "w-6 bg-white/30 hover:bg-white/50"
                    )}
                  >
                    {index === currentIndex && (
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: isPaused || isHovered ? "0%" : "100%" }}
                        transition={{ duration: autoPlayInterval / 1000, ease: "linear" }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Thumbnail Navigation */}
          {featuredPosts.length > 1 && (
            <div className="hidden lg:flex flex-col justify-center gap-3 p-6 w-80">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">
                More Featured
              </p>
              {featuredPosts.slice(0, 4).map((post, index) => (
                <motion.button
                  key={post.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-300",
                    index === currentIndex
                      ? "bg-white/20 backdrop-blur-md border border-white/30"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  )}
                >
                  {post.coverImage && (
                    <img
                      src={post.coverImage}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm line-clamp-2 transition-colors",
                      index === currentIndex ? "text-white" : "text-white/70 group-hover:text-white"
                    )}>
                      {post.title}
                    </p>
                    {post.publishedAt && (
                      <p className="text-xs text-white/40 mt-1">
                        {format(new Date(post.publishedAt), "MMM dd")}
                      </p>
                    )}
                  </div>
                  {index === currentIndex && (
                    <div className="w-1.5 h-8 bg-gradient-to-b from-violet-400 to-fuchsia-400 rounded-full" />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {featuredPosts.length > 1 && (
          <AnimatePresence>
            {isHovered && (
              <>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={nextSlide}
                  className="absolute right-4 lg:right-[340px] top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}
          </AnimatePresence>
        )}

        {/* Slide Counter Badge */}
        <div className="absolute bottom-6 right-6 lg:bottom-6 lg:right-[340px] z-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
          >
            <span className="text-white font-semibold">{currentIndex + 1}</span>
            <span className="text-white/50 mx-1">/</span>
            <span className="text-white/70">{featuredPosts.length}</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
