"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import NewsTag from "../ui/NewsTag";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Share2,
  Bookmark,
} from "lucide-react";

interface HeroPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  author: {
    name: string | null;
    email: string;
    avatar?: string;
  };
  publishedAt: string | null;
  tags: string[];
  pinned: boolean;
  featured?: boolean;
  readTime?: number;
  views?: number;
  comments?: number;
}

interface NewsHeroProps {
  posts: HeroPost[];
  autoPlayInterval?: number;
}

export default function NewsHero({
  posts,
  autoPlayInterval = 7000,
}: NewsHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const featuredPosts = posts.filter((post) => post.pinned || post.featured).slice(0, 5);

  useEffect(() => {
    if (!isHovered && featuredPosts.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredPosts.length);
      }, autoPlayInterval);
      return () => clearInterval(timer);
    }
  }, [currentIndex, isHovered, featuredPosts.length, autoPlayInterval]);
  
  if (featuredPosts.length === 0) return null;

  const currentPost = featuredPosts[currentIndex];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredPosts.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + featuredPosts.length) % featuredPosts.length
    );
  };

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning", emoji: "☀️" };
    if (hour < 17) return { greeting: "Good afternoon", emoji: "🌤️" };
    if (hour < 21) return { greeting: "Good evening", emoji: "🌅" };
    return { greeting: "Good night", emoji: "🌙" };
  };

  const { greeting, emoji } = getTimeOfDayGreeting();

  return (
    <div className="relative w-full overflow-hidden rounded-3xl mb-8">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-editorial-purple/10 via-editorial-blue/10 to-editorial-teal/10 animate-pulse" />
      
      {/* Mesh pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header with greeting */}
        <div className="absolute top-0 left-0 right-0 z-20 p-6 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-2xl" role="img" aria-label="greeting emoji">
                {emoji}
              </span>
              <span className="text-white font-medium text-lg">
                {greeting}, here&apos;s what&apos;s happening
              </span>
            </motion.div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-sm">
                📰 {featuredPosts.length} Featured
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Image Section */}
              <div className="relative lg:w-2/3 h-[400px] lg:h-[500px] overflow-hidden">
                {currentPost.coverImage ? (
                  <img
                    src={currentPost.coverImage}
                    alt={currentPost.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-editorial-purple via-editorial-blue to-editorial-teal opacity-80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              {/* Content Section */}
              <div className="relative lg:w-1/3 p-8 bg-card/95 backdrop-blur-xl flex flex-col justify-center">
                <div className="space-y-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {currentPost.pinned && (
                      <NewsTag label="Pinned" type="featured" size="sm" />
                    )}
                    {currentPost.tags.slice(0, 2).map((tag) => (
                      <NewsTag key={tag} label={tag} type="topic" size="sm" />
                    ))}
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                    {currentPost.title}
                  </h1>

                  {/* Excerpt */}
                  {currentPost.excerpt && (
                    <p className="text-muted-foreground line-clamp-3">
                      {currentPost.excerpt}
                    </p>
                  )}

                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{currentPost.author.name || currentPost.author.email}</span>
                    </div>
                    {currentPost.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(currentPost.publishedAt), "MMM dd")}</span>
                      </div>
                    )}
                    {currentPost.readTime && (
                      <div className="flex items-center gap-1">
                        <span>{currentPost.readTime} min read</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4">
                    <Link
                      href={`/news/${currentPost.slug}`}
                      className={cn(
                        "px-6 py-3 bg-primary text-primary-foreground rounded-full",
                        "font-medium hover:scale-105 transition-all duration-200",
                        "shadow-lg shadow-primary/25"
                      )}
                    >
                      Read Story →
                    </Link>
                    <button
                      className={cn(
                        "p-3 rounded-full bg-muted/80 hover:bg-muted",
                        "transition-all duration-200 hover:scale-105"
                      )}
                      aria-label="Share"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      className={cn(
                        "p-3 rounded-full bg-muted/80 hover:bg-muted",
                        "transition-all duration-200 hover:scale-105"
                      )}
                      aria-label="Bookmark"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {featuredPosts.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-30",
                "p-3 rounded-full bg-white/20 backdrop-blur-md",
                "text-white hover:bg-white/30 transition-all duration-200",
                "hover:scale-110"
              )}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-30",
                "p-3 rounded-full bg-white/20 backdrop-blur-md",
                "text-white hover:bg-white/30 transition-all duration-200",
                "hover:scale-110"
              )}
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Slide Indicators */}
        {featuredPosts.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {featuredPosts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "transition-all duration-300",
                  index === currentIndex
                    ? "w-8 h-2 bg-white rounded-full"
                    : "w-2 h-2 bg-white/50 rounded-full hover:bg-white/70"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
