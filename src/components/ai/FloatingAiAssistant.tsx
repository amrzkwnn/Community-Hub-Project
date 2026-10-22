'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { 
  Sparkles, 
  Send, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  HelpCircle,
  Calendar,
  Repeat,
  Wrench,
  MapPin,
  RefreshCw,
  X,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { AiSearchResultCard } from '@/types';

export interface ChatEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
  cards?: AiSearchResultCard[];
}

const SUGGESTED_PROMPTS_EN = [
  {
    icon: MapPin,
    title: 'Report Hazards',
    text: 'How do I report a flash flood or pothole on the Resilience Map?',
    targetTab: 'resilience',
  },
  {
    icon: Calendar,
    title: 'Upcoming Events',
    text: 'What community events and activities are happening this month?',
    targetTab: 'home',
  },
  {
    icon: Repeat,
    title: 'Circular Exchange',
    text: 'How does the Circular Exchange work and what items are available?',
    targetTab: 'exchange',
  },
  {
    icon: Wrench,
    title: 'Local Services',
    text: 'Where can I find plumbing, tutoring, or home repair services in Elmina?',
    targetTab: 'services',
  },
  {
    icon: ShieldCheck,
    title: 'Auxiliary Police',
    text: 'What is the 24/7 hotline for Elmina Auxiliary Police and how are patrols scheduled?',
    targetTab: 'home',
  },
  {
    icon: HelpCircle,
    title: 'Township Guidelines',
    text: 'What are the official community bylaws and verification rules for residents?',
    targetTab: 'feed',
  },
];

const SUGGESTED_PROMPTS_BM = [
  {
    icon: MapPin,
    title: 'Lapor Aduan',
    text: 'Bagaimana cara melaporkan banjir kilat atau jalan rosak di Peta Ketahanan?',
    targetTab: 'resilience',
  },
  {
    icon: Calendar,
    title: 'Acara Komuniti',
    text: 'Apakah aktiviti dan program komuniti yang dijadualkan bulan ini?',
    targetTab: 'home',
  },
  {
    icon: Repeat,
    title: 'Circular Exchange',
    text: 'Bagaimana cara menyumbang atau menukar barangan di Circular Exchange?',
    targetTab: 'exchange',
  },
  {
    icon: Wrench,
    title: 'Servis Tempatan',
    text: 'Bagaimana mencari perkhidmatan paip, kelas tuisyen atau bantuan di Elmina?',
    targetTab: 'services',
  },
  {
    icon: ShieldCheck,
    title: 'Polis Bantuan',
    text: 'Apakah nombor kecemasan Polis Bantuan Elmina dan waktu rondaan keselamatan?',
    targetTab: 'home',
  },
  {
    icon: HelpCircle,
    title: 'Panduan Komuniti',
    text: 'Apakah peraturan komuniti dan proses pengesahan aduan penduduk?',
    targetTab: 'feed',
  },
];

type AnimationPhase = 'closed' | 'opening' | 'open' | 'closing';

export interface StoredBubblePosition {
  edge: 'left' | 'right' | 'top' | 'bottom';
  ratio: number; // 0 to 1 along the safe boundary
}

const STORAGE_KEY = 'tesdh_ai_bubble_position';
const BUBBLE_SIZE = 58;
const DRAG_THRESHOLD = 7; // 7px movement threshold to distinguish drag from click

export const getSafeBounds = () => {
  if (typeof window === 'undefined') {
    return { leftSafe: 24, rightSafe: 300, topSafe: 80, bottomSafe: 600, isMobile: false };
  }
  const isMobile = window.innerWidth < 640;
  const leftSafe = isMobile ? 16 : 24;
  const rightSafe = Math.max(leftSafe, window.innerWidth - BUBBLE_SIZE - (isMobile ? 16 : 24));
  const topSafe = 84; // Clear top header & search controls safely
  const bottomSafe = Math.max(topSafe, window.innerHeight - BUBBLE_SIZE - (isMobile ? 84 : 24)); // Clear BottomNav on mobile
  return { leftSafe, rightSafe, topSafe, bottomSafe, isMobile };
};

export const getCoordsFromPosition = (pos: StoredBubblePosition): { x: number; y: number } => {
  const { leftSafe, rightSafe, topSafe, bottomSafe } = getSafeBounds();
  const clampedRatio = Math.max(0, Math.min(1, Number.isFinite(pos.ratio) ? pos.ratio : 1));

  switch (pos.edge) {
    case 'left':
      return {
        x: leftSafe,
        y: topSafe + clampedRatio * Math.max(0, bottomSafe - topSafe),
      };
    case 'right':
      return {
        x: rightSafe,
        y: topSafe + clampedRatio * Math.max(0, bottomSafe - topSafe),
      };
    case 'top':
      return {
        x: leftSafe + clampedRatio * Math.max(0, rightSafe - leftSafe),
        y: topSafe,
      };
    case 'bottom':
      return {
        x: leftSafe + clampedRatio * Math.max(0, rightSafe - leftSafe),
        y: bottomSafe,
      };
    default:
      return { x: rightSafe, y: bottomSafe };
  }
};

export const snapToNearestEdge = (
  currentX: number,
  currentY: number
): {
  coords: { x: number; y: number };
  saved: StoredBubblePosition;
} => {
  const { leftSafe, rightSafe, topSafe, bottomSafe } = getSafeBounds();

  // Center of bubble
  const centerX = currentX + BUBBLE_SIZE / 2;
  const centerY = currentY + BUBBLE_SIZE / 2;

  // Distances to safe edges
  const distLeft = Math.abs(centerX - (leftSafe + BUBBLE_SIZE / 2));
  const distRight = Math.abs((rightSafe + BUBBLE_SIZE / 2) - centerX);
  const distTop = Math.abs(centerY - (topSafe + BUBBLE_SIZE / 2));
  const distBottom = Math.abs((bottomSafe + BUBBLE_SIZE / 2) - centerY);

  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  let edge: StoredBubblePosition['edge'] = 'right';
  let snappedX = rightSafe;
  let snappedY = bottomSafe;
  let ratio = 1;

  if (minDist === distLeft) {
    edge = 'left';
    snappedX = leftSafe;
    snappedY = Math.max(topSafe, Math.min(bottomSafe, currentY));
    const rangeY = bottomSafe - topSafe;
    ratio = rangeY > 0 ? (snappedY - topSafe) / rangeY : 0.85;
  } else if (minDist === distRight) {
    edge = 'right';
    snappedX = rightSafe;
    snappedY = Math.max(topSafe, Math.min(bottomSafe, currentY));
    const rangeY = bottomSafe - topSafe;
    ratio = rangeY > 0 ? (snappedY - topSafe) / rangeY : 0.85;
  } else if (minDist === distTop) {
    edge = 'top';
    snappedY = topSafe;
    snappedX = Math.max(leftSafe, Math.min(rightSafe, currentX));
    const rangeX = rightSafe - leftSafe;
    ratio = rangeX > 0 ? (snappedX - leftSafe) / rangeX : 0.5;
  } else {
    edge = 'bottom';
    snappedY = bottomSafe;
    snappedX = Math.max(leftSafe, Math.min(rightSafe, currentX));
    const rangeX = rightSafe - leftSafe;
    ratio = rangeX > 0 ? (snappedX - leftSafe) / rangeX : 0.85;
  }

  return {
    coords: { x: snappedX, y: snappedY },
    saved: { edge, ratio: Math.max(0, Math.min(1, ratio)) },
  };
};

export default function FloatingAiAssistant() {
  const { currentUser, language, setLanguage, setActiveTab, navigateToItem } = useApp();

  // Animation & Dialog Open State
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('closed');
  const [transformOriginCoords, setTransformOriginCoords] = useState({
    deltaX: 0,
    deltaY: 0,
    scaleX: 0.12,
    scaleY: 0.09,
  });

  // Persistent Conversation State
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dragging and Snapping State
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);
  const [currentEdge, setCurrentEdge] = useState<StoredBubblePosition['edge']>('right');
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [dragAnnouncement, setDragAnnouncement] = useState<string | null>(null);

  // Drag interaction refs (avoids unnecessary re-renders while tracking pointer)
  const dragStartPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerDownRef = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);
  const snapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // DOM References
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isMalay = language === 'bm' || language === 'ms-MY';
  const suggestedPrompts = isMalay ? SUGGESTED_PROMPTS_BM : SUGGESTED_PROMPTS_EN;

  // Load saved position on mount (prevents SSR hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw) as StoredBubblePosition;
        if (parsed && parsed.edge && typeof parsed.ratio === 'number') {
          const coords = getCoordsFromPosition(parsed);
          setBubblePos(coords);
          setCurrentEdge(parsed.edge);
          return;
        }
      }
    } catch {}

    // Default: bottom-right
    const defaultCoords = getCoordsFromPosition({ edge: 'right', ratio: 1 });
    setBubblePos(defaultCoords);
    setCurrentEdge('right');
  }, []);

  // Recalculate on window resize / orientation change
  useEffect(() => {
    const handleResize = () => {
      try {
        const savedRaw = localStorage.getItem(STORAGE_KEY);
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw) as StoredBubblePosition;
          if (parsed && parsed.edge && typeof parsed.ratio === 'number') {
            const coords = getCoordsFromPosition(parsed);
            setBubblePos(coords);
            setCurrentEdge(parsed.edge);
            return;
          }
        }
      } catch {}

      const defaultCoords = getCoordsFromPosition({ edge: 'right', ratio: 1 });
      setBubblePos(defaultCoords);
      setCurrentEdge('right');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute exact delta from center of viewport to bubble position
  const calculateTransformDelta = useCallback((customPos?: { x: number; y: number } | null) => {
    if (typeof window === 'undefined') return { deltaX: 0, deltaY: 0, scaleX: 0.12, scaleY: 0.09 };

    const isMobile = window.innerWidth < 640;
    const bubbleSize = BUBBLE_SIZE;

    let bubbleCenterX: number;
    let bubbleCenterY: number;

    const targetPos = customPos || bubblePos;

    if (targetPos && Number.isFinite(targetPos.x) && Number.isFinite(targetPos.y)) {
      bubbleCenterX = targetPos.x + bubbleSize / 2;
      bubbleCenterY = targetPos.y + bubbleSize / 2;
    } else if (launcherRef.current) {
      const rect = launcherRef.current.getBoundingClientRect();
      bubbleCenterX = rect.left + rect.width / 2;
      bubbleCenterY = rect.top + rect.height / 2;
    } else {
      const bottomOffset = isMobile ? 80 : 24;
      const rightOffset = isMobile ? 16 : 24;
      bubbleCenterX = window.innerWidth - rightOffset - bubbleSize / 2;
      bubbleCenterY = window.innerHeight - bottomOffset - bubbleSize / 2;
    }

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    const deltaX = bubbleCenterX - viewportCenterX;
    const deltaY = bubbleCenterY - viewportCenterY;

    const windowWidth = isMobile ? Math.min(window.innerWidth - 24, 480) : 480;
    const windowHeight = isMobile
      ? Math.min(window.innerHeight - 32, 640)
      : Math.min(window.innerHeight * 0.78, 680);

    const scaleX = Math.max(0.05, bubbleSize / windowWidth);
    const scaleY = Math.max(0.05, bubbleSize / windowHeight);

    return { deltaX, deltaY, scaleX, scaleY };
  }, [bubblePos]);

  // Open Assistant with Shared-Element Morph
  const openAssistant = useCallback(() => {
    // Prevent duplicate triggers if already opening or open
    if (animationPhase === 'opening' || animationPhase === 'open') return;

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    const coords = calculateTransformDelta(bubblePos);
    setTransformOriginCoords(coords);

    // Step 1: Mount the overlay in initial collapsed bubble state (State A)
    setIsOpen(true);
    setIsExpanded(false);
    setAnimationPhase('opening');

    // Lock page background scroll
    try {
      document.body.style.overflow = 'hidden';
    } catch {}

    // Step 2: Complete opening sequence after 380ms
    animationTimerRef.current = setTimeout(() => {
      setAnimationPhase('open');
      inputRef.current?.focus();
    }, 400);
  }, [animationPhase, bubblePos, calculateTransformDelta]);

  // Two-phase mount effect: forces browser layout paint of State A before transitioning to State B
  useEffect(() => {
    if (animationPhase === 'opening' && !isExpanded) {
      // Force a DOM layout reflow on modalRef so the browser commits the collapsed state
      if (modalRef.current) {
        void modalRef.current.offsetHeight;
      }
      const rafId = requestAnimationFrame(() => {
        setIsExpanded(true);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [animationPhase, isExpanded]);

  // Close Assistant with Morph Shrink back to bubble
  const closeAssistant = useCallback(() => {
    // Prevent duplicate triggers if already closing or closed
    if (animationPhase === 'closing' || animationPhase === 'closed') return;

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    const coords = calculateTransformDelta(bubblePos);
    setTransformOriginCoords(coords);

    // Step 1: Trigger collapse back to bubble State A
    setAnimationPhase('closing');
    setIsExpanded(false);

    // Unlock page background scroll
    try {
      document.body.style.overflow = '';
    } catch {}

    // Step 2: Unmount modal after transition completes (300ms)
    animationTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setAnimationPhase('closed');
      // Restore focus to floating launcher button
      launcherRef.current?.focus();
    }, 300);
  }, [animationPhase, bubblePos, calculateTransformDelta]);

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // only left click / primary touch
    dragStartPointerRef.current = { x: e.clientX, y: e.clientY };
    const initialPos = bubblePos || getCoordsFromPosition({ edge: 'right', ratio: 1 });
    dragStartPosRef.current = { ...initialPos };
    isPointerDownRef.current = true;
    hasDraggedRef.current = false;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - dragStartPointerRef.current.x;
    const dy = e.clientY - dragStartPointerRef.current.y;
    const distance = Math.hypot(dx, dy);

    if (!hasDraggedRef.current) {
      if (distance >= DRAG_THRESHOLD) {
        hasDraggedRef.current = true;
        setIsDragging(true);
        setIsSnapping(false);
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      }
    }

    if (hasDraggedRef.current) {
      e.preventDefault();
      const { leftSafe, rightSafe, topSafe, bottomSafe } = getSafeBounds();
      const rawX = dragStartPosRef.current.x + dx;
      const rawY = dragStartPosRef.current.y + dy;
      const clampedX = Math.max(leftSafe - 8, Math.min(rightSafe + 8, rawX));
      const clampedY = Math.max(topSafe - 8, Math.min(bottomSafe + 8, rawY));
      setBubblePos({ x: clampedX, y: clampedY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasDraggedRef.current) {
      justDraggedRef.current = true;
      hasDraggedRef.current = false;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 150);

      setIsDragging(false);
      setIsSnapping(true);

      const currentX = bubblePos ? bubblePos.x : dragStartPosRef.current.x;
      const currentY = bubblePos ? bubblePos.y : dragStartPosRef.current.y;

      const { coords, saved } = snapToNearestEdge(currentX, currentY);
      setBubblePos(coords);
      setCurrentEdge(saved.edge);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      } catch {}

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const snapDuration = prefersReducedMotion ? 0 : 300;

      snapTimerRef.current = setTimeout(() => {
        setIsSnapping(false);
      }, snapDuration);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isPointerDownRef.current) {
      isPointerDownRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      if (hasDraggedRef.current) {
        hasDraggedRef.current = false;
        setIsDragging(false);
        setIsSnapping(true);
        const currentX = bubblePos ? bubblePos.x : dragStartPosRef.current.x;
        const currentY = bubblePos ? bubblePos.y : dragStartPosRef.current.y;
        const { coords, saved } = snapToNearestEdge(currentX, currentY);
        setBubblePos(coords);
        setCurrentEdge(saved.edge);
        setTimeout(() => setIsSnapping(false), 300);
      }
    }
  };

  const handleLauncherClick = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    openAssistant();
  };

  const handleLauncherKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAssistant();
      return;
    }

    let targetEdge: StoredBubblePosition['edge'] | null = null;
    if (e.key === 'ArrowLeft') targetEdge = 'left';
    else if (e.key === 'ArrowRight') targetEdge = 'right';
    else if (e.key === 'ArrowUp') targetEdge = 'top';
    else if (e.key === 'ArrowDown') targetEdge = 'bottom';

    if (targetEdge) {
      e.preventDefault();
      setIsSnapping(true);
      const newSaved: StoredBubblePosition = {
        edge: targetEdge,
        ratio: targetEdge === 'left' || targetEdge === 'right' ? 0.85 : 0.5,
      };
      const newCoords = getCoordsFromPosition(newSaved);
      setBubblePos(newCoords);
      setCurrentEdge(targetEdge);
      setDragAnnouncement(`Repositioned to ${targetEdge} edge.`);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSaved));
      } catch {}
      setTimeout(() => setIsSnapping(false), 300);
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (animationPhase === 'open' || animationPhase === 'opening')) {
        closeAssistant();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [animationPhase, closeAssistant]);

  // Auto-scroll conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      try {
        document.body.style.overflow = '';
      } catch {}
    };
  }, []);

  // Textarea auto-resize helper
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    if (!textarea.value.trim()) {
      textarea.style.height = '22px';
      textarea.style.overflowY = 'hidden';
      return;
    }
    textarea.style.height = 'auto';
    const maxHeight = 120;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 1000);
    setInputValue(val);
    adjustTextareaHeight(e.target);
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = '22px';
      inputRef.current.style.overflowY = 'hidden';
      inputRef.current.focus();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setInputValue('');

    // Reset textarea height to compact 1-line state
    if (inputRef.current) {
      inputRef.current.style.height = '22px';
      inputRef.current.style.overflowY = 'hidden';
    }

    const userMessage: ChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tesdh-session': currentUser.id,
        },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          preferredLanguage: isMalay ? 'bm' : 'en',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorText = data.answer || data.error || 'Failed to receive response from AI Assistant.';
        const errorEntry: ChatEntry = {
          id: `ai-err-${Date.now()}`,
          role: 'model',
          text: errorText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorEntry]);
        setErrorMessage(errorText);
      } else {
        const assistantMessage: ChatEntry = {
          id: `ai-${Date.now()}`,
          role: 'model',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cards: Array.isArray(data.cards) ? data.cards : undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const networkErrorEntry: ChatEntry = {
        id: `ai-neterr-${Date.now()}`,
        role: 'model',
        text: isMalay
          ? 'Ralat komunikasi rangkaian. Sila semak sambungan internet anda dan cuba lagi.'
          : 'Network communication error. Please check your internet connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, networkErrorEntry]);
      setErrorMessage(networkErrorEntry.text);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Parses markdown and renders interactive navigation tokens:
   * e.g. [Resilience Map], [Community Feed], [Circular Exchange], [Local Services], [Home]
   */
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');

    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <div key={lIdx} className="h-1.5" />;
          }

          const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
          const lineClean = isBullet ? line.trim().substring(2) : line;

          const parts = lineClean.split(/(\[[^\]]+\]|\*\*[^*]+\*\*)/g);

          const renderedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-slate-900 dark:text-slate-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }

            if (part.startsWith('[') && part.endsWith(']')) {
              const label = part.slice(1, -1);
              const labelLower = label.toLowerCase();

              let targetTab: string | null = null;
              if (labelLower.includes('resilience') || labelLower.includes('peta ketahanan') || labelLower.includes('map')) {
                targetTab = 'resilience';
              } else if (labelLower.includes('feed') || labelLower.includes('announcement') || labelLower.includes('pengumuman')) {
                targetTab = 'feed';
              } else if (labelLower.includes('exchange') || labelLower.includes('circular') || labelLower.includes('barter')) {
                targetTab = 'exchange';
              } else if (labelLower.includes('service') || labelLower.includes('perkhidmatan')) {
                targetTab = 'services';
              } else if (labelLower.includes('event') || labelLower.includes('home') || labelLower.includes('acara')) {
                targetTab = 'home';
              } else if (labelLower.includes('setting') || labelLower.includes('tetapan')) {
                targetTab = 'settings';
              }

              if (targetTab) {
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => {
                      setActiveTab(targetTab!);
                    }}
                    className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 text-[#BA1B1D] dark:text-rose-300 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors cursor-pointer"
                    title={`Navigate to ${label}`}
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </button>
                );
              }

              return (
                <span key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">
                  {label}
                </span>
              );
            }

            return <span key={pIdx}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#BA1B1D] dark:bg-rose-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">{renderedLine}</div>
              </div>
            );
          }

          return <p key={lIdx}>{renderedLine}</p>;
        })}
      </div>
    );
  };

  /**
   * Renders interactive AI search result cards with direct-navigation actions.
   */
  const renderResultCard = (card: AiSearchResultCard) => {
    let typeIcon = Repeat;
    let badgeBg = 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    let typeLabel = 'Exchange';

    if (card.type === 'incident_report_draft') {
      typeIcon = AlertTriangle;
      badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      typeLabel = isMalay ? 'Cadangan Laporan' : 'Suggested Report';
    } else if (card.type === 'incident') {
      typeIcon = AlertTriangle;
      badgeBg = card.isVerified
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      typeLabel = card.category || 'Incident';
    } else if (card.type === 'service' || card.type === 'request') {
      typeIcon = Wrench;
      badgeBg = card.type === 'request'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      typeLabel = card.type === 'request' ? (isMalay ? 'Bantuan' : 'Help Request') : (isMalay ? 'Servis' : 'Local Service');
    } else if (card.type === 'event') {
      typeIcon = Calendar;
      badgeBg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      typeLabel = isMalay ? 'Acara Komuniti' : 'Community Event';
    } else if (card.type === 'exchange') {
      typeIcon = Repeat;
      const isGiveaway = card.price?.toLowerCase().includes('giveaway') || card.price?.toLowerCase().includes('free');
      badgeBg = isGiveaway
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        : 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      typeLabel = isGiveaway ? (isMalay ? 'Sumbangan Percuma' : 'Free Giveaway') : (isMalay ? 'Pertukaran' : 'Item Exchange');
    }

    const Icon = typeIcon;

    return (
      <div
        key={card.id}
        className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#1A1D21] p-3 shadow-xs hover:border-[#BA1B1D]/40 dark:hover:border-rose-500/40 transition-all text-left flex flex-col gap-2 group"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeBg}`}>
              <Icon className="w-3 h-3 shrink-0" />
              <span>{typeLabel}</span>
            </span>

            {card.type === 'incident_report_draft' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span>{isMalay ? 'Sahkan Lokasi di Peta' : 'Review & Confirm Location'}</span>
              </span>
            )}

            {card.type === 'incident' && (
              card.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span>{isMalay ? 'Disahkan Pengurusan' : 'Verified by Management'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <span>{isMalay ? 'Aduan Belum Disahkan' : 'Unverified Report'}</span>
                </span>
              )
            )}

            {card.price && card.type !== 'exchange' && (
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-900/60">
                {card.price}
              </span>
            )}
          </div>

          {card.date && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
              {card.date}
            </span>
          )}
        </div>

        <div className="flex gap-2.5 items-start">
          {card.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.thumbnail}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-[#BA1B1D] dark:group-hover:text-rose-400 transition-colors">
              {card.title}
            </h4>
            {card.location && (
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                <span>{card.location}</span>
              </p>
            )}
            {card.matchReason ? (
              <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/40 mt-1 line-clamp-2 leading-relaxed font-medium">
                💡 {card.matchReason}
              </p>
            ) : (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {card.descriptionSnippet}
              </p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          {card.price ? (
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[190px]">
              {card.price}
            </span>
          ) : <span />}

          <button
            type="button"
            onClick={() => {
              closeAssistant();
              navigateToItem(card.navigationTarget);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#BA1B1D] hover:bg-[#9E1315] text-white text-[11px] font-bold shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer shrink-0 ml-auto"
            title={`${card.actionLabel}: ${card.title}`}
          >
            <span>{card.actionLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Determine dynamic morph transform styles based on isExpanded
  const modalTransform = isExpanded
    ? 'translate(-50%, -50%) scale(1, 1)'
    : `translate(calc(-50% + ${transformOriginCoords.deltaX}px), calc(-50% + ${transformOriginCoords.deltaY}px)) scale(${transformOriginCoords.scaleX}, ${transformOriginCoords.scaleY})`;

  const modalBorderRadius = isExpanded ? '24px' : '9999px';

  return (
    <>
      {/* 1. Floating Chat Bubble Launcher (Draggable & Edge-Snapping) */}
      {!isOpen && (
        <div 
          className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] sm:bottom-6 right-4 sm:right-6 z-40 select-none group touch-none`}
          style={
            isMounted && bubblePos
              ? {
                  left: `${bubblePos.x}px`,
                  top: `${bubblePos.y}px`,
                  bottom: 'auto',
                  right: 'auto',
                  transition: isDragging
                    ? 'none'
                    : isSnapping
                    ? 'left 300ms cubic-bezier(0.16, 1, 0.3, 1), top 300ms cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'none',
                }
              : undefined
          }
        >
          {/* Tooltip on hover (desktop), hidden during dragging */}
          {!isDragging && (
            <div
              role="tooltip"
              aria-hidden="true"
              className={`hidden sm:block absolute px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-semibold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none backdrop-blur-xs z-50 ${
                currentEdge === 'left'
                  ? 'left-full ml-3 top-1/2 -translate-y-1/2 -translate-x-1.5 group-hover:translate-x-0'
                  : currentEdge === 'top'
                  ? 'top-full mt-3 left-1/2 -translate-x-1/2 -translate-y-1.5 group-hover:translate-y-0'
                  : currentEdge === 'bottom'
                  ? 'bottom-full mb-3 left-1/2 -translate-x-1/2 translate-y-1.5 group-hover:translate-y-0'
                  : 'right-full mr-3 top-1/2 -translate-y-1/2 translate-x-1.5 group-hover:translate-x-0'
              }`}
            >
              AI Assistant
              {/* Tooltip caret */}
              <span
                className={`absolute border-4 border-transparent ${
                  currentEdge === 'left'
                    ? 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-900/90 dark:border-r-slate-100/95'
                    : currentEdge === 'top'
                    ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-900/90 dark:border-b-slate-100/95'
                    : currentEdge === 'bottom'
                    ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-900/90 dark:border-t-slate-100/95'
                    : 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-900/90 dark:border-l-slate-100/95'
                }`}
              />
            </div>
          )}

          {/* Floating Bubble Button */}
          <button
            ref={launcherRef}
            type="button"
            onClick={handleLauncherClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onKeyDown={handleLauncherKeyDown}
            aria-label="Open AI Assistant"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className={`w-[58px] h-[58px] rounded-full bg-[#BA1B1D] text-white flex items-center justify-center border border-white/20 dark:border-white/10 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 relative transition-transform duration-200 select-none ${
              isDragging
                ? 'cursor-grabbing scale-110 shadow-2xl shadow-rose-950/40 ring-4 ring-rose-500/30'
                : 'cursor-grab hover:bg-[#9E1315] shadow-lg shadow-rose-950/25 hover:shadow-xl hover:shadow-rose-900/35 hover:scale-105 active:scale-95'
            }`}
          >
            <Sparkles
              className={`w-6 h-6 text-white transition-transform duration-200 ${
                isDragging ? 'rotate-12 scale-110' : 'group-hover:rotate-12'
              }`}
            />
            <span className="sr-only">Open AI Assistant</span>
          </button>

          {/* Screen reader live region for keyboard repositioning */}
          <span className="sr-only" aria-live="polite">
            {dragAnnouncement}
          </span>
        </div>
      )}

      {/* 2. Overlay Backdrop */}
      {isOpen && (
        <div
          onClick={closeAssistant}
          aria-hidden="true"
          className={`fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/65 backdrop-blur-xs transition-opacity duration-[380ms] ${
            isExpanded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 3. Morphing Chat Window (Shared-Element Bubble-to-Window) */}
      {isOpen && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="AI Assistant"
          style={{
            transform: modalTransform,
            borderRadius: modalBorderRadius,
            transition: animationPhase === 'closing'
              ? 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 280ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms ease-in'
              : 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 380ms ease-out',
          }}
          className="ai-assistant-modal-surface fixed left-1/2 top-1/2 z-50 w-[calc(100vw-24px)] sm:w-[480px] max-w-[480px] h-[620px] sm:h-[660px] max-h-[calc(100dvh-32px)] sm:max-h-[80vh] bg-white dark:bg-[#15181C] border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col will-change-transform"
        >
          {/* Inner Content Container: fades in when expanding, fades out immediately on closing */}
          <div
            className={`w-full h-full flex flex-col min-h-0 overflow-hidden transition-opacity ${
              isExpanded
                ? 'opacity-100 duration-200 delay-150'
                : 'opacity-0 duration-100'
            }`}
          >
            {/* Region 1: Header Bar */}
            <header className="shrink-0 bg-white dark:bg-[#15181C] border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xs z-10 select-none">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#BA1B1D] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      AI Assistant
                    </h2>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isMalay ? 'Panduan Komuniti Elmina' : 'Elmina Township Guide'}
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Language Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      !isMalay
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ms-MY')}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      isMalay
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    BM
                  </button>
                </div>

                {/* Clear Chat Button */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isMalay ? 'Padam Sembang' : 'Clear Chat'}
                    aria-label="Clear chat"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={closeAssistant}
                  aria-label="Close AI Assistant"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Region 1b: Privacy Shield Notice */}
            <div className="shrink-0 bg-slate-100/80 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/80 px-3.5 py-1 text-[10.5px] text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">
                  <strong>{isMalay ? 'Privasi Aktif:' : 'Privacy Shield:'}</strong>{' '}
                  {isMalay ? 'Data peribadi dirahsiakan' : 'Resident PII masked · Zero persistence'}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-slate-500 text-[10px] shrink-0 font-mono">
                <span>Hotline:</span>
                <strong className="text-[#BA1B1D] dark:text-rose-400">03-7845 2222</strong>
              </div>
            </div>

            {/* Region 2: Conversation Stream (Scrollable Area) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Welcome Card */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs flex gap-3.5 items-start">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 text-[#BA1B1D] dark:text-rose-300 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {isMalay
                          ? `Hai, ${currentUser.displayName || currentUser.fullName}!`
                          : `Hello, ${currentUser.displayName || currentUser.fullName}!`}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {isMalay
                          ? 'Saya sedia membantu anda mencari pengumuman rasmi, acara komuniti, panduan lapor isu Peta Ketahanan, atau semakan Circular Exchange.'
                          : 'I am here to help you navigate community announcements, upcoming events, reporting issues on the Resilience Map, or finding local services.'}
                      </p>
                    </div>
                  </div>

                  {/* Suggested Question Chips */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                      {isMalay ? 'Cadangan Soalan' : 'Suggested Questions'}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {suggestedPrompts.map((prompt, idx) => {
                        const Icon = prompt.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(prompt.text)}
                            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#17191D] hover:border-[#BA1B1D]/40 dark:hover:border-rose-500/40 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-left transition-all duration-150 cursor-pointer shadow-2xs group flex items-start gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#BA1B1D] group-hover:text-white transition-colors flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11.5px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#BA1B1D] dark:group-hover:text-rose-400 transition-colors">
                                {prompt.title}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                {prompt.text}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 items-start ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Assistant Avatar */}
                      {msg.role === 'model' && (
                        <div className="w-7 h-7 rounded-lg bg-[#BA1B1D] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Message Bubble Card */}
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 shadow-2xs ${
                          msg.role === 'user'
                            ? 'bg-[#BA1B1D] text-white rounded-br-xs'
                            : msg.isError
                            ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/80 text-rose-950 dark:text-rose-200 rounded-bl-xs'
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs'
                        }`}
                      >
                        {/* Meta */}
                        <div className="flex items-center justify-between gap-3 mb-1 text-[9.5px] opacity-75">
                          <span className="font-bold">
                            {msg.role === 'user'
                              ? currentUser.displayName || currentUser.fullName
                              : 'AI Assistant'}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>

                        {/* Content */}
                        {msg.role === 'user' ? (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.text}
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {renderFormattedText(msg.text)}
                            {msg.cards && msg.cards.length > 0 && (
                              <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                                {msg.cards.map((card) => renderResultCard(card))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Retry action on error */}
                        {msg.isError && (
                          <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
                            <span className="text-[10.5px] text-rose-700 dark:text-rose-300 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {isMalay ? 'Gagal memproses' : 'Could not process query'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                                if (lastUserMsg) {
                                  handleSendMessage(lastUserMsg.text);
                                }
                              }}
                              className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>{isMalay ? 'Cuba Semula' : 'Retry'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {msg.role === 'user' && (
                        <img
                          src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                          alt={currentUser.fullName}
                          className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 mt-0.5"
                        />
                      )}
                    </div>
                  ))}

                  {/* Unified Thinking Animation */}
                  {isLoading && (
                    <div className="flex gap-2.5 items-start justify-start animate-in fade-in duration-150">
                      <div className="w-7 h-7 rounded-lg bg-[#BA1B1D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-bl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#BA1B1D] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#BA1B1D] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#BA1B1D] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {isMalay ? 'Sedang memproses...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Region 3: Composer Box (Anchored at Bottom, Compact Single-Line Default) */}
            <div className="shrink-0 bg-white dark:bg-[#15181C] border-t border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs z-10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="space-y-1"
              >
                {/* Compact Input Pill Container (44-48px height when empty) */}
                <div 
                  className={`relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 focus-within:border-[#BA1B1D] focus-within:ring-2 focus-within:ring-[#BA1B1D]/20 transition-all px-3 py-1.5 flex ${
                    inputValue.includes('\n') || (inputRef.current && inputRef.current.scrollHeight > 36)
                      ? 'items-end'
                      : 'items-center'
                  } gap-2 min-h-[44px] sm:min-h-[46px]`}
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder={isMalay ? 'Tanya AI Assistant...' : 'Ask AI Assistant...'}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-0 focus:outline-hidden resize-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-5 py-0.5 px-0 h-[22px] min-h-[22px] max-h-[120px] overflow-hidden"
                  />

                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      inputValue.trim() && !isLoading
                        ? 'bg-[#BA1B1D] hover:bg-[#991517] text-white shadow-2xs scale-100'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed scale-95 opacity-60'
                    }`}
                    title={isMalay ? 'Hantar' : 'Send'}
                    aria-label={isMalay ? 'Hantar mesej' : 'Send message'}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Footer notes */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
                  <span>Enter to send · Shift+Enter for new line</span>
                  <span className={`${inputValue.length > 900 ? 'text-amber-600 font-bold' : ''}`}>
                    {inputValue.length}/1000
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
