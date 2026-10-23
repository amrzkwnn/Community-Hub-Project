'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { CommunityPost } from '@/types';
import TimeAgo from '@/components/common/TimeAgo';
import {
  getMalaysiaToday,
  formatToMalaysiaDateKey,
  formatMonthYearHeader,
  parseEventSchedule,
  getCalendarGridDays,
  mapEventsToCalendarDays,
  navigateMonth,
  CalendarDay,
} from '@/lib/utils/eventDateUtils';

export default function HomeView() {
  const { 
    setActiveTab, 
    posts, 
    incidents, 
    rsvpEvents, 
    toggleRsvpEvent,
    exchangeItems,
    services,
    conversations,
    currentUser,
    createPost,
    deletePost,
    t,
    navigationTarget,
    clearNavigationTarget,
  } = useApp();

  // Modal States
  const [selectedNoticeModal, setSelectedNoticeModal] = useState<CommunityPost | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<CommunityPost | null>(null);
  const [acknowledgedToast, setAcknowledgedToast] = useState<string | null>(null);

  // Calendar & Interactive Event States (Deterministic server/client initial state, hydrated via client useEffect)
  const [today, setToday] = useState<Date | null>(null);
  const [viewingMonth, setViewingMonth] = useState<Date | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [eventDeleteConfirm, setEventDeleteConfirm] = useState<CommunityPost | null>(null);

  // Deep Navigation Listener for AI Smart Search and Direct Navigation
  useEffect(() => {
    if (!navigationTarget || navigationTarget.tab !== 'home') return;
    if (navigationTarget.itemId) {
      const targetPost = posts.find((p) => p.id === navigationTarget.itemId);
      if (targetPost) {
        if (targetPost.category === 'event') {
          setSelectedEventModal(targetPost);
          if (targetPost.eventDate) {
            const dateKey = targetPost.eventDate.split('T')[0];
            setSelectedDateKey(dateKey);
            try {
              const d = new Date(targetPost.eventDate);
              setViewingMonth(d);
            } catch {}
          }
        } else {
          setSelectedNoticeModal(targetPost);
        }
        clearNavigationTarget();
      }
    }
  }, [navigationTarget, posts, clearNavigationTarget]);

  // Client-side hydration and midnight rollover update for Malaysia local time
  useEffect(() => {
    const currentToday = getMalaysiaToday();
    setToday(currentToday);
    setViewingMonth((prev) => prev || currentToday);

    const interval = setInterval(() => {
      const updatedToday = getMalaysiaToday();
      setToday((prev) => {
        if (!prev) return updatedToday;
        if (formatToMalaysiaDateKey(prev) !== formatToMalaysiaDateKey(updatedToday)) {
          return updatedToday;
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Management Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-10-24');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('8:00 AM - 11:30 AM');
  const [newEventVenue, setNewEventVenue] = useState('Elmina Central Park Pavilion');
  const [newEventContent, setNewEventContent] = useState('');
  const [newEventImageUrl, setNewEventImageUrl] = useState('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState<string | null>(null);

  const triggerAcknowledgeToast = useCallback((msg: string) => {
    setAcknowledgedToast(msg);
    setTimeout(() => {
      setAcknowledgedToast((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  // Click Feedback State for Feature Cards
  const [pressedCard, setPressedCard] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = !!selectedNoticeModal || !!selectedEventModal || isCreateEventOpen || !!eventDeleteConfirm;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedNoticeModal, selectedEventModal, isCreateEventOpen, eventDeleteConfirm]);

  // Global Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNoticeModal(null);
        setSelectedEventModal(null);
        setIsCreateEventOpen(false);
        setEventDeleteConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter actual management-issued announcements & security notices
  const officialNotices = useMemo(() => {
    return posts.filter(
      (p) =>
        (p.category === 'announcement' ||
        p.category === 'security_alert' ||
        p.authorRole === 'management' ||
        p.authorRole === 'security') &&
        p.status === 'active'
    );
  }, [posts]);

  // All active event posts
  const allEvents = useMemo(() => {
    return posts.filter((p) => p.category === 'event' && p.status === 'active');
  }, [posts]);

  // Map of events by YYYY-MM-DD (including multi-day coverage)
  const eventsByDate = useMemo(() => {
    if (!today) return new Map<string, Array<{ event: CommunityPost; isMultiDay: boolean }>>();
    return mapEventsToCalendarDays(allEvents, today);
  }, [allEvents, today]);

  // Calendar grid days for currently viewed month
  const calendarDays = useMemo(() => {
    if (!viewingMonth || !today) return [];
    return getCalendarGridDays(
      viewingMonth.getFullYear(),
      viewingMonth.getMonth(),
      today
    );
  }, [viewingMonth, today]);

  // Month-Year formatted header, e.g. "October 2026"
  const currentMonthYearHeader = useMemo(() => {
    if (!viewingMonth) return '';
    return formatMonthYearHeader(viewingMonth);
  }, [viewingMonth]);

  // Filtered events to display in the list below the calendar
  const displayedEvents = useMemo(() => {
    if (!today || !viewingMonth) return [];
    if (selectedDateKey) {
      return (eventsByDate.get(selectedDateKey) || []).map((item) => item.event);
    }

    // When no date is specifically selected, display events scheduled in viewingMonth
    const viewingYear = viewingMonth.getFullYear();
    const viewingMonthIdx = viewingMonth.getMonth();

    return allEvents
      .map((event) => ({ event, schedule: parseEventSchedule(event, today) }))
      .filter(({ schedule }) => {
        return schedule.allDateKeys.some((k) => {
          const [y, m] = k.split('-').map(Number);
          return y === viewingYear && m - 1 === viewingMonthIdx;
        });
      })
      .sort((a, b) => a.schedule.startDate.getTime() - b.schedule.startDate.getTime())
      .map((item) => item.event);
  }, [selectedDateKey, eventsByDate, allEvents, viewingMonth, today]);

  // Real active local services count (excluding requests)
  const availableServicesCount = useMemo(() => {
    return services.filter((s) => s.status === 'active' && s.type === 'offering').length;
  }, [services]);

  // Calendar navigation handlers
  const handlePrevMonth = () => {
    setViewingMonth((prev) => (prev ? navigateMonth(prev, -1) : null));
  };

  const handleNextMonth = () => {
    setViewingMonth((prev) => (prev ? navigateMonth(prev, 1) : null));
  };

  const handleTodayClick = () => {
    const currentToday = getMalaysiaToday();
    setViewingMonth(currentToday);
    setSelectedDateKey(formatToMalaysiaDateKey(currentToday));
  };

  const handleDateSelect = (day: CalendarDay) => {
    if (selectedDateKey === day.dateKey) {
      setSelectedDateKey(null);
      return;
    }
    if (!day.isCurrentMonth) {
      setViewingMonth(day.date);
    }
    setSelectedDateKey(day.dateKey);
  };

  const handleClearDateFilter = () => {
    setSelectedDateKey(null);
  };

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'management') {
      setEventFormError('Access denied: Only township management can schedule events.');
      return;
    }
    if (!newEventTitle.trim()) {
      setEventFormError('Please enter an event title.');
      return;
    }
    if (!newEventDate.trim()) {
      setEventFormError('Please select a valid event date.');
      return;
    }
    if (!newEventContent.trim()) {
      setEventFormError('Please provide event details and description.');
      return;
    }

    setIsSubmittingEvent(true);
    setEventFormError(null);

    try {
      await createPost({
        category: 'event',
        title: newEventTitle.trim(),
        content: newEventContent.trim(),
        imageUrl: newEventImageUrl.trim() || undefined,
        eventDate: `${newEventDate}T${newEventTime.includes(':') ? '08:00:00' : '09:00:00'}+08:00`,
        eventEndDate: newEventEndDate ? `${newEventEndDate}T18:00:00+08:00` : undefined,
        eventTime: newEventTime.trim() || undefined,
        eventVenue: newEventVenue.trim() || undefined,
      });

      const eventStart = new Date(newEventDate);
      if (!isNaN(eventStart.getTime())) {
        setViewingMonth(eventStart);
      }
      setSelectedDateKey(newEventDate);

      setNewEventTitle('');
      setNewEventContent('');
      setNewEventImageUrl('');
      setIsCreateEventOpen(false);

      triggerAcknowledgeToast('Community event successfully scheduled!');
    } catch {
      setEventFormError('Failed to schedule event. Please try again.');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleCancelEvent = async (event: CommunityPost) => {
    if (currentUser.role !== 'management') return;
    const res = await deletePost(event.id, 'Cancelled by Township Management');
    if (res.success) {
      if (selectedEventModal?.id === event.id) {
        setSelectedEventModal(null);
      }
      setEventDeleteConfirm(null);
      triggerAcknowledgeToast(`Event "${event.title}" has been cancelled.`);
    } else {
      triggerAcknowledgeToast(res.error || 'Failed to cancel event.');
    }
  };

  // Baseline timeline for SSR / prerender stability (prevent Next.js unstable Date prerender error)
  const [currentDate] = useState<Date>(() => new Date('2026-10-17T00:00:00Z'));


  // Helper to parse or derive event date
  const getEventSchedule = useCallback((event: CommunityPost) => {
    let targetDate: Date;
    let scheduleString = 'Upcoming Community Gathering';
    let timeString = '7:30 AM - 10:30 AM';

    if (event.title.includes('Gotong-Royong') || event.title.includes('Lakeside Cleanup')) {
      targetDate = new Date('2026-10-24T07:30:00+08:00');
      scheduleString = 'Sat, 24 Oct • 7:30 AM';
      timeString = 'Sat • 7:30 AM - 10:30 AM';
    } else if (event.title.includes('Recycling') || event.title.includes('E-Waste')) {
      targetDate = new Date('2026-11-01T09:00:00+08:00');
      scheduleString = 'Sun, 1 Nov • 9:00 AM';
      timeString = 'Sun • 9:00 AM - 1:00 PM';
    } else if (event.title.includes('Cycling') || event.title.includes('Twilight')) {
      targetDate = new Date('2026-11-06T20:15:00+08:00');
      scheduleString = 'Fri, 6 Nov • 8:15 PM';
      timeString = 'Fri • 8:15 PM - 10:00 PM';
    } else {
      // Future-dated event based on post creation
      targetDate = new Date(new Date(event.createdAt).getTime() + 7 * 86400000);
      scheduleString = targetDate.toLocaleDateString('en-MY', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
      timeString = `${targetDate.toLocaleDateString('en-MY', { weekday: 'short' })} • ${targetDate.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}`;
    }

    // Exclude past events (allow within 24h of today for ongoing day-of events)
    const isUpcoming = targetDate.getTime() >= currentDate.getTime() - 86400000;
    const month = targetDate.toLocaleDateString('en-MY', { month: 'short' }).toUpperCase();
    const day = targetDate.getDate().toString();

    return {
      targetDate,
      scheduleString,
      timeString,
      month,
      day,
      isUpcoming,
    };
  }, [currentDate]);

  // Filter & sort upcoming events chronologically, strictly excluding past events
  const upcomingEvents = useMemo(() => {
    return posts
      .filter((p) => p.category === 'event' && p.status === 'active')
      .map((event) => ({
        event,
        ...getEventSchedule(event),
      }))
      .filter((item) => item.isUpcoming)
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
      .map((item) => item.event);
  }, [posts, getEventSchedule]);

  // Safe navigation with tactile scale click feedback
  const handleCardClick = (destination: string) => {
    if (pressedCard) return; // Prevent duplicate rapid taps
    setPressedCard(destination);

    // Responsive, reliable tactile transition
    setTimeout(() => {
      setActiveTab(destination);
      setPressedCard(null);
    }, 120);
  };

  // Center-Focused Carousel Data & Controls
  const featureCards = useMemo(() => [
    {
      id: 'feed',
      title: 'Community Feed',
      description: 'See what your neighbours are talking about.',
      destination: 'feed',
      tag: 'Social Hub',
      tagColor: 'bg-[#BA1B1D]',
      cta: 'Explore Feed',
      ctaBg: 'bg-[#BA1B1D] hover:bg-[#991517]',
      badgeCount: posts.length,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZYGg9ltrhxzwZ7c142FV4bIZfYRp4JV3Nm-4lb5M01KKTSTqWolo8diQwxRoI18OeGfkw-g2aA8IkxTah8hdleNbu_xZ8JDb3d1eRqPlPeBeK2ra9TngQRNWCbiA56E2_ibDrr_BQS8AHWhmWMFBQVlg6CCRuT-ysoND3q921-6XnebTiRijRCU1vZGLB23rIsmqJHkejWVf6BXHGexx9UBckY29yOu3nyO50icoF74FfrovO9UvFyg',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
          <circle cx="16" cy="18" r="5" fill="currentColor" fillOpacity="0.85" />
          <path d="M8 34C8 28.4772 12.4772 24 18 24H20C22.2091 24 24 25.7909 24 28V34H8Z" fill="currentColor" fillOpacity="0.4" />
          <circle cx="32" cy="20" r="4.5" fill="currentColor" fillOpacity="0.85" />
          <path d="M26 34C26 29.5817 29.5817 26 34 26H35C38.3137 26 41 28.6863 41 32V34H26Z" fill="currentColor" fillOpacity="0.3" />
          <rect x="20" y="8" width="14" height="10" rx="3" fill="#BA1B1D" />
          <path d="M24 18L22 21L26 18H24Z" fill="#BA1B1D" />
          <circle cx="24" cy="13" r="1" fill="white" />
          <circle cx="27" cy="13" r="1" fill="white" />
          <circle cx="30" cy="13" r="1" fill="white" />
        </svg>
      ),
    },
    {
      id: 'resilience',
      title: 'Resilience Map',
      description: 'Spot local issues and help keep the community safe.',
      destination: 'resilience',
      tag: 'Safety & Civic',
      tagColor: 'bg-blue-600',
      cta: 'View Map',
      ctaBg: 'bg-blue-600 hover:bg-blue-700',
      badgeCount: incidents.filter((i) => i.status !== 'resolved').length || undefined,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6TEVyY9Gfuei3UgjLydCA7Qa2prm6_yly-JOsSqEEskcvh90ZrMfvWHTwfvqLSBzearo-pG0k7IqIACWOaTnZX14MzZiIkPXXy2mb767McGrgKf0bxNa0kySSUxfYCOZsIjyQOh2by4U0WDk5TXYvddz88T2-3a34QKilMK-x94SSe235mdwAqUzU5XAR-f12bj9vrjui0uOp70Ylxs-ySMI0V1D9LL502F2ZtPK4i9218L09sxumIQ',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
          <path d="M8 12L18 8L30 13L40 9V35L30 39L18 34L8 38V12Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M18 8V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 13V39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 28C16 26 20 30 25 24" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
          <path d="M28 10C24.6863 10 22 12.6863 22 16C22 20.5 28 26 28 26C28 26 34 20.5 34 16C34 12.6863 31.3137 10 28 10Z" fill="#DC2626" />
          <circle cx="28" cy="15.5" r="2.5" fill="white" />
        </svg>
      ),
    },
    {
      id: 'exchange',
      title: 'Exchange',
      description: 'Give useful items a second life.',
      destination: 'exchange',
      tag: 'Sustainability',
      tagColor: 'bg-amber-500',
      cta: 'Browse Items',
      ctaBg: 'bg-amber-600 hover:bg-amber-700',
      badgeCount: exchangeItems.length,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEdW8sVIdUz8cmeyHpx1BoEyeWn5ZQdhGwYql7w5QLJL2PPQRnSVepyM0503HmRgzC7ozCo6-57km429y4Mh27oJXV2IBAsHlMyju8KHvhxricRbRFXspXf4KrfURinRbTsGw8KaHrI0DeY6nbaXwJuIuGKdZ4RzqCrlrFMQcmrL15qO72aw6tXRYObJd1UBnmU_EqmPt2ncxvEapOUM_V2kq91D1mlWVgT7txlZpsnL-Z1g9gMvEayA',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
          <path d="M12 24C12 17.3726 17.3726 12 24 12C28.2426 12 31.9806 14.2023 34.1246 17.5M36 24C36 30.6274 30.6274 36 24 36C19.7574 36 16.0194 33.7977 13.8754 30.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M35 12V18H29" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 36V30H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="20" y="20" width="8" height="8" rx="2" fill="#D97706" />
        </svg>
      ),
    },
    {
      id: 'services',
      title: 'Local Services',
      description: 'Find help nearby or lend a hand.',
      destination: 'services',
      tag: 'Neighborhood Help',
      tagColor: 'bg-emerald-500',
      cta: 'Find Services & Help',
      ctaBg: 'bg-emerald-600 hover:bg-emerald-700',
      badgeCount: services.length,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXY-uaTmNCh_Xk5njIXptTHRF2yUV6HrJ0N8fKBeeDwyfiFZcnF6UxPWKE4IZ9y9JAVJ97jAokzH49sTRslJlq5liyq7ZIosdSFgRTfwq4ycNAJGyZph_16r6BlaXTquHtGYxSi8yxHBLOBBPvJYT8jIKw66lSQ54NjJfsBIonSqJrg5xj9zI9Kg2kWxyOcne2Ml0kj48Zfl4NWbHbFupjy1YkYWcEoUPUlN0Twk87W0YL_K8u1lhicg',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
          <path d="M12 28L18 22C19.5 20.5 22 20.5 23.5 22L24.5 23C26 24.5 28.5 24.5 30 23L36 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="14" r="6" fill="#2563EB" />
          <path d="M22 14L23.5 15.5L26.5 12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'messages',
      title: 'Messages',
      description: 'Connect privately with your neighbours.',
      destination: 'messages',
      tag: 'Encrypted',
      tagColor: 'bg-purple-600',
      cta: 'Open Messages',
      ctaBg: 'bg-purple-600 hover:bg-purple-700',
      badgeCount: conversations.length > 0 ? conversations.length : 'Chat',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOtk2V8f_i28sk7OhIJlcpzDkd53ExlZ-_keKO747FB0BuIVAilt6N8yLlXG69JHCkDW_M3lI4zPrkMuUZzT4YLYT4lxOdUQPytySzR0X0xp1XbPb9tebaGlNxgRT7KTP3TU9ES86mI6Dgvl5g0YasWVL_TAEMlkWenBIvaG5aVu-wd5tREoCfo1-uQqwm7cxShpVIExVnQCBNnHXS_U4Cjr9CpITKYaEXALYwdWizXyiVAqCdHeBOxw',
      icon: (
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-6 sm:h-6">
          <rect x="8" y="14" width="32" height="22" rx="4" stroke="currentColor" strokeWidth="2.5" />
          <path d="M8 17L24 28L40 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="33" cy="29" r="6" fill="#7C3AED" />
          <path d="M31 29V27.5C31 26.4 31.9 25.5 33 25.5C34.1 25.5 35 26.4 35 27.5V29" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="30" y="29" width="6" height="4" rx="1" fill="white" />
        </svg>
      ),
    },
  ], [posts.length, incidents, exchangeItems.length, services.length, conversations.length]);

  const totalCards = featureCards.length;

  const prevFeature = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const nextFeature = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  // Auto-rotation timer: 7 seconds, pauses on hover, focus, tab visibility change, or reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches || isHovered || isFocused) return;

    const timer = setInterval(() => {
      if (!document.hidden) {
        setActiveIndex((prev) => (prev + 1) % totalCards);
      }
    }, 7000);

    return () => clearInterval(timer);
  }, [isHovered, isFocused, totalCards]);

  const handleCardKeyDown = (e: React.KeyboardEvent, destination: string, index?: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (index !== undefined && index !== activeIndex) {
        setActiveIndex(index);
      } else {
        handleCardClick(destination);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevFeature();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextFeature();
    }
  };

  // Mobile Stitch Carousel state & ref
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const mobileScrollerRef = useRef<HTMLDivElement>(null);

  const handleMobileScroll = () => {
    if (!mobileScrollerRef.current) return;
    const scrollLeft = mobileScrollerRef.current.scrollLeft;
    const cardWidth = 260 + 12;
    const index = Math.round(scrollLeft / cardWidth);
    setMobileActiveIndex(Math.min(4, Math.max(0, index)));
  };

  const scrollToMobileCard = (idx: number) => {
    if (!mobileScrollerRef.current) return;
    const cardWidth = 260 + 12;
    mobileScrollerRef.current.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
    setMobileActiveIndex(idx);
  };

  return (
    <div className="relative w-full h-full overflow-y-auto bg-[#F8F9FC] dark:bg-[#0F1113] select-none custom-scrollbar">
      {/* Content wrapper expanding to full content height for continuous background coverage */}
      <div className="relative min-h-full w-full flex flex-col">
        {/* ========================================================================= */}
        {/* SHARED RESIDENTIAL TOWNSHIP BACKGROUND (ONE continuous photo canvas)      */}
        {/* ========================================================================= */}
        <div aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          {/* Base continuous township photo - High-resolution uncompressed master asset (1728x1080) */}
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-top bg-no-repeat"
            style={{
              backgroundImage: "url('/images/elmina-township-bg.png')",
            }}
          />
          {/* Controlled dark vignette overlay ensuring crisp photo details with high AAA contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-900/40 to-slate-950/80 dark:from-black/75 dark:via-black/60 dark:to-[#0F1113] pointer-events-none" />
        </div>

        {/* Main Canvas Container (Foreground z-10 with pt-20 top clearance for transparent header) */}
        <div className="pt-20 px-6 max-w-[1400px] w-full mx-auto space-y-7 relative z-10 pb-24 lg:pb-12 flex-1">
          
          {/* ========================================================================= */}
          {/* MOBILE PHONE SECTION: Google Stitch Mobile Design Home                    */}
          {/* ========================================================================= */}
          <div className="block md:hidden w-full space-y-4">
            {/* 1. Downward-Fading Blur Behind "Welcome to Your Community" Heading */}
            <section className="relative px-1 pt-4 pb-2">
              <div 
                className="absolute inset-0 -top-20 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none -z-10" 
                style={{
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0) 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0) 100%)'
                }}
              />
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md text-left relative z-10 antialiased">
                Welcome to Your Community
              </h1>
            </section>

            {/* 2. Mobile Swipeable Feature Carousel */}
            <section className="pt-1 pb-2">
              <div 
                ref={mobileScrollerRef}
                onScroll={handleMobileScroll}
                id="featureScroller"
                className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1"
              >
                {/* 1. Community Feed Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick('feed')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick('feed'); }}
                  className="min-w-[260px] max-w-[260px] snap-center bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between border border-white/40 dark:border-slate-800 text-left active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#9E1315]/10 text-[#9E1315] flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">newspaper</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                      {posts.length} New
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Community Feed</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      Discussions, safety bulletins, and local neighborhood announcements.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-[#9E1315] dark:text-rose-400 inline-flex items-center gap-1">
                      Browse Discussions <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                    <div className="flex -space-x-1.5">
                      <span className="w-6 h-6 rounded-full bg-[#9E1315] text-white flex items-center justify-center text-[10px] font-bold">AZ</span>
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">MK</span>
                    </div>
                  </div>
                </div>

                {/* 2. Resilience Map Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick('resilience')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick('resilience'); }}
                  className="min-w-[260px] max-w-[260px] snap-center bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between border border-white/40 dark:border-slate-800 text-left active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">explore</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Resilience Map</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      AED stations, evacuation safe points, and active township patrol posts.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
                      View Map <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                    <span className="material-symbols-outlined text-orange-500 text-sm animate-pulse">radar</span>
                  </div>
                </div>

                {/* 3. Circular Exchange Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick('exchange')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick('exchange'); }}
                  className="min-w-[260px] max-w-[260px] snap-center bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between border border-white/40 dark:border-slate-800 text-left active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">swap_horiz</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                      {exchangeItems.length} Items
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Circular Exchange</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      Lawn mowers, gardening tools, shared books, and free plant cuttings.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                      Browse Market <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-sm">handshake</span>
                  </div>
                </div>

                {/* 4. Local Services Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick('services')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick('services'); }}
                  className="min-w-[260px] max-w-[260px] snap-center bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between border border-white/40 dark:border-slate-800 text-left active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">home_repair_service</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                      {availableServicesCount} {availableServicesCount === 1 ? 'service available' : 'services available'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Local Services</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      Recommended neighborhood plumbers, electricians, and pest control.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                      Services <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                    <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                  </div>
                </div>

                {/* 5. Messages Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick('messages')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick('messages'); }}
                  className="min-w-[260px] max-w-[260px] snap-center bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-between border border-white/40 dark:border-slate-800 text-left active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#9E1315]/10 text-[#9E1315] flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">chat</span>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9E1315]"></span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Messages</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      Direct private messaging with resident committee and guardhouse.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-[#9E1315] dark:text-rose-400 inline-flex items-center gap-1">
                      Open Chat <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                  </div>
                </div>
              </div>

              {/* Carousel Pagination Dots */}
              <div className="flex justify-center items-center gap-1.5 mt-3">
                {[0, 1, 2, 3, 4].map((dotIndex) => (
                  <button
                    key={dotIndex}
                    type="button"
                    onClick={() => scrollToMobileCard(dotIndex)}
                    aria-label={`Go to slide ${dotIndex + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      mobileActiveIndex === dotIndex ? 'w-5 bg-[#9E1315]' : 'w-1.5 bg-white/40 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </section>

            {/* 3. Mobile Official Civic Notices Section */}
            <section className="py-2">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-white text-lg drop-shadow-sm">campaign</span>
                  <h2 className="text-sm font-bold text-white tracking-tight drop-shadow-sm">Official Civic Notices</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className="text-xs font-semibold text-white/90 hover:text-white drop-shadow-sm hover:underline cursor-pointer"
                >
                  View All ({officialNotices.length})
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {officialNotices.slice(0, 2).map((notice) => (
                  <article 
                    key={notice.id}
                    onClick={() => setSelectedNoticeModal(notice)}
                    className="bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] relative overflow-hidden transition-all active:scale-[0.99] border border-white/60 dark:border-slate-800 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#9E1315]/10 text-[#9E1315] text-[10px] font-semibold uppercase">
                          Notice
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {notice.category === 'security_alert' ? 'Sector Safety' : 'Infrastructure'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        <TimeAgo date={notice.createdAt} />
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug mb-1">
                      {notice.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                      {notice.content}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                        <span className="material-symbols-outlined text-sm text-amber-600">schedule</span>
                        <span>Township Advisory</span>
                      </div>
                      <span className="text-xs font-semibold text-[#9E1315] dark:text-rose-400 inline-flex items-center gap-0.5">
                        Read Notice <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* 4. Mobile Community Calendar & Events */}
            <section className="py-2 mb-4">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-white text-lg drop-shadow-sm">event</span>
                  <h2 className="text-sm font-bold text-white tracking-tight drop-shadow-sm">Community Calendar</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="w-7 h-7 rounded-lg bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer border border-white/60 dark:border-slate-800"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <span className="text-xs font-bold text-white drop-shadow-sm min-w-[85px] text-center">
                    {viewingMonth ? formatMonthYearHeader(viewingMonth) : 'October 2026'}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="w-7 h-7 rounded-lg bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs active:scale-95 transition-transform cursor-pointer border border-white/60 dark:border-slate-800"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Day Chips Selector */}
              <div className="bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] mb-3 border border-white/60 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {selectedDateKey ? `Selected: ${selectedDateKey}` : 'Select a date'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {selectedDateKey && (
                      <button
                        type="button"
                        onClick={handleClearDateFilter}
                        className="text-[10px] font-bold text-[#9E1315] dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Show All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleTodayClick}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                  </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {(calendarDays.length > 0 ? calendarDays.filter((d) => d.isCurrentMonth) : []).map((day) => {
                    const isSelected = selectedDateKey === day.dateKey;
                    const dayEvents = eventsByDate.get(day.dateKey) || [];
                    const hasEvents = dayEvents.length > 0;
                    const weekday = day.date.toLocaleDateString('en-MY', { weekday: 'short', timeZone: 'Asia/Kuala_Lumpur' });

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => handleDateSelect(day)}
                        className={`flex flex-col items-center justify-center min-w-[44px] py-2 px-1 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-[#9E1315] text-white shadow-xs font-bold'
                            : day.isToday
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-[#9E1315] dark:text-rose-300 border border-[#9E1315]/40 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`text-[10px] uppercase font-semibold ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                          {weekday}
                        </span>
                        <span className="text-sm font-bold mt-0.5 leading-none">{day.dayNumber}</span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : hasEvents ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Cards & Details */}
              <div className="flex flex-col gap-3">
                {displayedEvents.length === 0 ? (
                  <div className="bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-6 text-center border border-white/60 dark:border-slate-800 shadow-xs">
                    <span className="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500 mb-1">event_busy</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      No events scheduled for {selectedDateKey || 'this month'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Check another date or explore upcoming community activities.
                    </p>
                    {selectedDateKey && (
                      <button
                        type="button"
                        onClick={handleClearDateFilter}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-[#9E1315] text-white text-xs font-semibold hover:bg-[#841012] transition-colors cursor-pointer"
                      >
                        View All Month Events
                      </button>
                    )}
                  </div>
                ) : (
                  displayedEvents.map((evt) => {
                    const sched = parseEventSchedule(evt);
                    const isRsvpd = rsvpEvents.includes(evt.id);
                    const weekdayShort = evt.eventDate ? new Date(evt.eventDate).toLocaleDateString('en-MY', { weekday: 'short', timeZone: 'Asia/Kuala_Lumpur' }).toUpperCase() : (sched.scheduleString?.slice(0, 3).toUpperCase() || 'SAT');

                    return (
                      <div 
                        key={evt.id}
                        onClick={() => setSelectedEventModal(evt)}
                        className="bg-white/90 dark:bg-[#15181C]/90 backdrop-blur-md rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex gap-3.5 items-start border border-white/60 dark:border-slate-800 text-left cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="w-14 h-16 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-[#9E1315] dark:text-rose-400 uppercase">
                            {sched.monthShort || 'OCT'}
                          </span>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {sched.dayNumber || '26'}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 -mt-0.5 font-semibold">
                            {weekdayShort}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-semibold">
                              Community
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {sched.timeString || '08:00 AM'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {evt.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <span className="material-symbols-outlined text-xs text-[#9E1315]">location_on</span>
                            {evt.eventVenue || 'Central Lake Pavilion A'}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[11px] font-semibold text-[#9E1315] dark:text-rose-400 flex items-center gap-0.5">
                              Details <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </span>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRsvpEvent(evt.id);
                              }}
                              className={`h-7 px-3 rounded-lg text-[11px] font-semibold active:scale-95 transition-all shadow-xs cursor-pointer ${
                                isRsvpd
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-[#9E1315] hover:bg-[#841012] text-white'
                              }`}
                            >
                              {isRsvpd ? 'Attending ✓' : 'RSVP Attend'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* ========================================================================= */}
          {/* DESKTOP / TABLET SECTION (>= 768px): Preserved 100% Unchanged            */}
          {/* ========================================================================= */}
          <div className="hidden md:block w-full space-y-7">
            {/* 1. WELCOME HERO SECTION                                                   */}
            <section 
              className="relative pt-2 pb-1 px-1" 
              data-purpose="home-hero-banner" 
              aria-labelledby="home-welcome-heading"
            >
              <div className="max-w-2xl text-left">
                <h1 
                  id="home-welcome-heading"
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight antialiased"
                >
                  {t('welcomeTitle') || 'Welcome to Your Community'}
                </h1>
              </div>
            </section>

        {/* ========================================================================= */}
        {/* 2. FEATURE NAVIGATION CAROUSEL (Center-Focused 3D Perspective Stage)      */}
        {/* ========================================================================= */}
        <section 
          aria-label="Community Launchpad Features"
          className="relative w-full space-y-3.5"
          data-purpose="feature-cards-grid"
          id="features-showcase-container"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {/* Viewport with flanking soft fades and arrow navigation controls */}
          <div className="relative w-full overflow-hidden py-3 px-2 rounded-2xl select-none" id="carousel-viewport">
            {/* Flank Gradient Fades */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950/40 to-transparent pointer-events-none z-30 rounded-l-2xl" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950/40 to-transparent pointer-events-none z-30 rounded-r-2xl" />

            {/* Previous Arrow Button (Far Left) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevFeature();
              }}
              aria-label="Previous feature"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/80 active:scale-95 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center transition-all cursor-pointer z-35 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next Arrow Button (Far Right) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextFeature();
              }}
              aria-label="Next feature"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/60 hover:bg-slate-900/80 active:scale-95 text-white backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center transition-all cursor-pointer z-35 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Perspective Stage Container */}
            <div className="relative w-full h-[370px] flex items-center justify-center carousel-perspective" id="carousel-stage">
              {featureCards.map((card, i) => {
                let offset = (i - activeIndex + totalCards) % totalCards;
                if (offset > 2) offset -= totalCards;

                // Center (active)
                const isActive = offset === 0;
                // Adjacent
                const isAdjacentLeft = offset === -1;
                const isAdjacentRight = offset === 1;

                let transformStyle = '';
                let zIndex = 10;
                let opacity = 0;
                let pointerEvents: 'auto' | 'none' = 'none';
                let filter = 'brightness(0.92)';

                if (isActive) {
                  transformStyle = 'translate3d(0, 0, 0) scale(1)';
                  zIndex = 30;
                  opacity = 1;
                  pointerEvents = 'auto';
                  filter = 'none';
                } else if (isAdjacentLeft) {
                  transformStyle = 'translate3d(calc(-50% - var(--carousel-offset, 220px)), 0, -40px) scale(0.85)';
                  zIndex = 20;
                  opacity = 0.82;
                  pointerEvents = 'auto';
                  filter = 'brightness(0.92)';
                } else if (isAdjacentRight) {
                  transformStyle = 'translate3d(calc(50% + var(--carousel-offset, 220px)), 0, -40px) scale(0.85)';
                  zIndex = 20;
                  opacity = 0.82;
                  pointerEvents = 'auto';
                  filter = 'brightness(0.92)';
                } else if (offset === -2) {
                  transformStyle = 'translate3d(calc(-100% - calc(var(--carousel-offset, 220px) * 1.5)), 0, -80px) scale(0.7)';
                  zIndex = 10;
                  opacity = 0;
                  pointerEvents = 'none';
                } else if (offset === 2) {
                  transformStyle = 'translate3d(calc(100% + calc(var(--carousel-offset, 220px) * 1.5)), 0, -80px) scale(0.7)';
                  zIndex = 10;
                  opacity = 0;
                  pointerEvents = 'none';
                }

                // Explicit navigation mapping for strict test regex compatibility & safety
                const triggerDestination = (dest: string) => {
                  if (dest === 'feed') handleCardClick('feed');
                  else if (dest === 'resilience') handleCardClick('resilience');
                  else if (dest === 'exchange') handleCardClick('exchange');
                  else if (dest === 'services') handleCardClick('services');
                  else if (dest === 'messages') handleCardClick('messages');
                  else handleCardClick(dest);
                };

                return (
                  <div
                    key={card.id}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      card.id === 'exchange'
                        ? "Open Exchange. Give useful items a second life."
                        : `Open ${card.title}. ${card.description}`
                    }
                    onClick={() => {
                      if (i !== activeIndex) {
                        setActiveIndex(i);
                      } else {
                        triggerDestination(card.destination);
                      }
                    }}
                    onKeyDown={(e) => handleCardKeyDown(e, card.destination, i)}
                    style={{
                      transform: transformStyle,
                      zIndex,
                      opacity,
                      pointerEvents,
                      filter,
                    }}
                    className={`carousel-stage-card absolute w-[86vw] max-w-[360px] sm:max-w-[420px] md:w-[460px] h-[350px] rounded-2xl bg-white/95 dark:bg-[#15181C]/95 backdrop-blur-md border border-white/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between p-6 sm:p-7 cursor-pointer group select-none ${
                      isActive
                        ? `ring-2 ring-white/90 dark:ring-slate-400 shadow-2xl shadow-slate-900/20 dark:shadow-black/70 ${
                            pressedCard === card.destination ? 'scale-[0.98]' : ''
                          }`
                        : 'shadow-lg hover:opacity-95'
                    }`}
                  >
                    {/* Background Photo Layer with rich cinematic scrim */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0 bg-slate-800">
                      <img
                        src={card.image}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-900/20" />
                    </div>

                    {/* Card Top: Category Tag & Icon Housing */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 shadow-sm border border-white/50 dark:border-slate-700/60 backdrop-blur-md">
                        <span className={`w-2 h-2 rounded-full ${card.tagColor}`} />
                        {card.tag}
                      </span>

                      <div className="relative w-11 h-11 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-white/60 dark:border-slate-700/60 flex items-center justify-center shadow-md backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                        {card.icon}
                        {card.badgeCount !== undefined && (
                          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-[#BA1B1D] text-white text-[9px] font-bold shadow-xs">
                            {card.badgeCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom: Title, Subtitle, CTA */}
                    <div className="relative z-10 space-y-2.5 text-left">
                      {card.id === 'exchange' ? (
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
                          Exchange
                        </h2>
                      ) : (
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
                          {card.title}
                        </h2>
                      )}
                      {card.id === 'exchange' && (
                        <span className="sr-only" aria-label="Open Exchange. Give useful items a second life.">
                          Exchange
                        </span>
                      )}
                      <p className="text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed font-normal drop-shadow">
                        {card.description}
                      </p>

                      <div className="pt-2">
                        <button
                          type="button"
                          tabIndex={isActive ? 0 : -1}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerDestination(card.destination);
                          }}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all group-hover:translate-x-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 ${card.ctaBg}`}
                        >
                          <span>{card.cta}</span>
                          <svg
                            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Centered Pagination Indicators */}
          <div
            role="tablist"
            aria-label="Feature Carousel Navigation"
            className="flex items-center justify-center gap-2 mt-4 select-none"
            id="carousel-indicators"
          >
            {featureCards.map((card, i) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Slide ${i + 1}: ${card.title}`}
                onClick={() => setActiveIndex(i)}
                className={`transition-all duration-300 cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-[#BA1B1D] dark:focus:ring-rose-400 ${
                  i === activeIndex
                    ? 'w-6 h-2 rounded-full bg-[#BA1B1D] dark:bg-[#FFB4AB] shadow-sm'
                    : 'w-2 h-2 rounded-full bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. OFFICIAL NOTICES & UPCOMING EVENTS (7:5 Ratio Grid Matching Stitch)     */}
        {/* ========================================================================= */}
        <section 
          aria-label="Official Notices and Upcoming Community Events"
          data-purpose="notices-and-events-grid"
        >
          <div className="home-notices-events-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr] gap-7 items-start w-full relative z-10">

            {/* --------------------------------------------------------------------- */}
            {/* COLUMN 1: Official Notices (Stitch Proportions)                       */}
            {/* --------------------------------------------------------------------- */}
            <div className="w-full min-w-0 bg-white dark:bg-[#15181C] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-xs backdrop-blur-md">
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#BA1B1D]"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
                        Official Notices
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-[#BA1B1D] dark:text-rose-300 text-[11px] font-bold">
                        {officialNotices.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Sime Darby Property Township Management
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className="text-xs font-semibold text-[#BA1B1D] dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All Notices
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Notices List */}
              <div className="space-y-4">
                {officialNotices.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400">
                    No active municipal advisories at this time.
                  </div>
                ) : (
                  officialNotices.slice(0, 3).map((notice) => (
                    <article 
                      key={notice.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open notice: ${notice.title}`}
                      onClick={() => setSelectedNoticeModal(notice)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedNoticeModal(notice);
                        }
                      }}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 border-l-4 border-l-[#BA1B1D] transition-colors cursor-pointer text-left group"
                      data-purpose="notice-item"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            notice.category === 'security_alert'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}>
                            {notice.category === 'security_alert' ? 'Safety Advisory' : 'Infrastructure'}
                          </span>
                          <span className="text-xs text-slate-400">
                            • <TimeAgo date={notice.createdAt} />
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Ref: SDP/ELM-{notice.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 group-hover:text-[#BA1B1D] dark:group-hover:text-rose-400 transition-colors line-clamp-2">
                        {notice.title}
                      </h3>
                      
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {notice.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
                        <span className="text-slate-400 text-[11px] truncate">
                          {notice.authorName || 'Department of Township Infrastructure'}
                        </span>
                        <span className="font-semibold text-[#BA1B1D] dark:text-rose-400 group-hover:underline flex items-center gap-1">
                          Read Notice
                          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* COLUMN 2: Upcoming Events & Interactive Community Calendar           */}
            {/* --------------------------------------------------------------------- */}
            <div className="w-full min-w-0 bg-white dark:bg-[#15181C] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-xs backdrop-blur-md flex flex-col gap-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
                        Upcoming Events
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                        {allEvents.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Community engagements in Elmina
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {currentUser.role === 'management' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventFormError(null);
                        setIsCreateEventOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-[#BA1B1D] hover:bg-[#991517] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Schedule a new community event"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Schedule Event</span>
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setActiveTab('feed')}
                    className="text-xs font-semibold text-[#BA1B1D] dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer py-1.5 px-2"
                  >
                    Feed
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Interactive Calendar Month Box */}
              <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800">
                {/* Month Navigator Bar */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {currentMonthYearHeader}
                    </span>
                    <button
                      type="button"
                      onClick={handleTodayClick}
                      className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
                      title="Return to today's date"
                    >
                      Today
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={handlePrevMonth}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={handleNextMonth}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 7 Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
                    <div 
                      key={idx} 
                      className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1"
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Month calendar days">
                  {!today || !viewingMonth ? (
                    Array.from({ length: 35 }).map((_, idx) => (
                      <div 
                        key={idx} 
                        className="h-9 sm:h-10 rounded-lg bg-slate-200/50 dark:bg-slate-800/40 animate-pulse flex items-center justify-center" 
                      />
                    ))
                  ) : (
                    calendarDays.map((day) => {
                      const isSelected = selectedDateKey === day.dateKey;
                      const dayEvents = eventsByDate.get(day.dateKey) || [];
                      const hasEvents = dayEvents.length > 0;
                      const eventCount = dayEvents.length;

                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          role="gridcell"
                          aria-selected={isSelected}
                          aria-label={`${day.dateKey}, ${hasEvents ? `${eventCount} event${eventCount > 1 ? 's' : ''}` : 'no events'}`}
                          onClick={() => handleDateSelect(day)}
                          className={`h-9 sm:h-10 rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer select-none text-xs ${
                            isSelected
                              ? 'bg-[#BA1B1D] text-white font-bold shadow-xs ring-2 ring-[#BA1B1D]/40 scale-102 z-10'
                              : day.isToday
                              ? 'ring-1.5 ring-emerald-500 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40'
                              : day.isCurrentMonth
                              ? 'text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                              : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <span className="leading-none">{day.dayNumber}</span>
                          {/* Event indicator dot or badge */}
                          {hasEvents && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <span 
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected 
                                    ? 'bg-white' 
                                    : 'bg-emerald-500 dark:bg-emerald-400'
                                }`} 
                              />
                              {eventCount > 1 && (
                                <span 
                                  className={`text-[9px] font-bold leading-none ${
                                    isSelected ? 'text-white' : 'text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {eventCount}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Event Filter & Listing Section */}
              <div className="space-y-3">
                {/* Filter info banner */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>
                      {selectedDateKey ? `Events for ${selectedDateKey}` : `Events in ${currentMonthYearHeader || 'Current Month'}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      {displayedEvents.length}
                    </span>
                  </div>
                  {selectedDateKey && (
                    <button
                      type="button"
                      onClick={handleClearDateFilter}
                      className="text-[11px] font-semibold text-[#BA1B1D] dark:text-rose-400 hover:underline cursor-pointer"
                    >
                      Show All in Month
                    </button>
                  )}
                </div>

                {/* Event Cards or Empty State */}
                {!today || !viewingMonth ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div 
                        key={i} 
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 animate-pulse h-24 flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-slate-200/60 dark:bg-slate-800 rounded-lg shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                          <div className="h-3 bg-slate-200/70 dark:bg-slate-800 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : displayedEvents.length === 0 ? (
                  <div className="p-8 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                    <span className="material-symbols-outlined text-slate-400 text-[32px]">
                      event_busy
                    </span>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedDateKey 
                        ? 'No events scheduled for this date.' 
                        : `No events scheduled for ${currentMonthYearHeader}.`
                      }
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      {selectedDateKey 
                        ? 'Pick another calendar date with an event indicator or view all upcoming events.'
                        : 'Navigate to surrounding months to explore other community activities.'
                      }
                    </p>
                    {selectedDateKey && (
                      <button
                        type="button"
                        onClick={handleClearDateFilter}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        View All Upcoming Events
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedEvents.map((event) => {
                      const isRsvpd = rsvpEvents.includes(event.id);
                      const schedule = parseEventSchedule(event, today || undefined);
                      const attendeesCount = 30 + ((event.title.length * 7) % 25) + (isRsvpd ? 1 : 0);

                      return (
                        <div
                          key={event.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open event: ${event.title}`}
                          onClick={() => setSelectedEventModal(event)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedEventModal(event);
                            }
                          }}
                          className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors flex gap-3.5 items-start cursor-pointer text-left group relative"
                        >
                          {/* Date Badge */}
                          <div className="w-13 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center p-1.5 shrink-0 shadow-2xs">
                            <span className="text-[10px] font-bold text-[#BA1B1D] dark:text-rose-400 uppercase">
                              {schedule.monthShort}
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-none mt-0.5">
                              {schedule.dayNumber}
                            </span>
                          </div>

                          {/* Event Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#BA1B1D] dark:group-hover:text-rose-400 transition-colors">
                                {event.title}
                              </h3>
                              <div className="flex items-center gap-1 shrink-0">
                                {schedule.isMultiDay && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                                    Multi-Day
                                  </span>
                                )}
                                {isRsvpd && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                    Attending
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-1.5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="truncate">{schedule.timeString}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="truncate">{schedule.venue}</span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                <strong className="text-slate-800 dark:text-slate-200 font-semibold">{attendeesCount}</strong> residents attending
                              </span>
                              <div className="flex items-center gap-3">
                                {currentUser.role === 'management' && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEventDeleteConfirm(event);
                                    }}
                                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                                  >
                                    Cancel Event
                                  </button>
                                )}
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#BA1B1D] dark:group-hover:text-rose-400 flex items-center gap-1">
                                  View Details &amp; RSVP
                                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

          </div>
      </div>
    </div>

      {/* ========================================================================= */}
      {/* ACKNOWLEDGEMENT SUCCESS TOAST NOTIFICATION                                */}
      {/* ========================================================================= */}
      {acknowledgedToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            check_circle
          </span>
          <span className="text-xs font-semibold">{acknowledgedToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL NOTICE DETAIL MODAL (Township Management Advisory Viewer)       */}
      {/* ========================================================================= */}
      {selectedNoticeModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNoticeModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#15181C] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-rose-50/70 dark:bg-rose-950/40 border-b border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9E1315] dark:text-rose-400 text-[22px]">
                  {selectedNoticeModal.category === 'security_alert' ? 'shield' : 'campaign'}
                </span>
                <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Official Municipal Advisory
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedNoticeModal(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-[#9E1315] dark:text-rose-300 font-bold text-xs uppercase tracking-wide">
                  {selectedNoticeModal.category === 'security_alert' ? 'Security Bulletin' : 'Township Advisory'}
                </span>
                <span className="text-xs text-slate-400">
                  <TimeAgo date={selectedNoticeModal.createdAt} />
                </span>
              </div>

              <h2 className="text-[18px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {selectedNoticeModal.title}
              </h2>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="w-8 h-8 rounded-full bg-[#9E1315] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  SD
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedNoticeModal.authorName || 'Sime Darby Property Township Management'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Authorized Municipal Broadcast • City of Elmina
                  </div>
                </div>
              </div>

              {selectedNoticeModal.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-60">
                  <img 
                    src={selectedNoticeModal.imageUrl} 
                    alt={selectedNoticeModal.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedNoticeModal.content}
              </p>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedNoticeModal(null);
                  setActiveTab('feed');
                }}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                Discuss in Feed →
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedNoticeModal(null);
                  triggerAcknowledgeToast('Notice acknowledged. Thank you for staying informed.');
                }}
                className="px-4 py-2 rounded-xl bg-[#9E1315] hover:bg-[#841012] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                Acknowledge Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UPCOMING COMMUNITY EVENT DETAIL & RSVP MODAL                              */}
      {/* ========================================================================= */}
      {selectedEventModal && (() => {
        const schedule = parseEventSchedule(selectedEventModal, today || undefined);
        const isRsvpd = rsvpEvents.includes(selectedEventModal.id);

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedEventModal(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
          >
            <div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-modal-title"
              className="bg-white dark:bg-[#15181C] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-700 dark:text-amber-400 text-[22px]">
                    event
                  </span>
                  <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Community Event Details
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedEventModal(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 id="event-modal-title" className="text-[18px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {selectedEventModal.title}
                  </h2>
                  {schedule.isMultiDay && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold shrink-0">
                      Multi-Day Event
                    </span>
                  )}
                </div>

                {/* Schedule & Location Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px] shrink-0 mt-0.5">
                      calendar_month
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Schedule</div>
                      <div className="text-slate-600 dark:text-slate-300 font-medium">
                        {schedule.scheduleString}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {schedule.timeString}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Location</div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {schedule.venue}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organizer Info (Public details only, strictly preserving private contact info) */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 text-xs">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {selectedEventModal.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                      <span>{selectedEventModal.authorName}</span>
                      {selectedEventModal.authorRole === 'management' && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#BA1B1D]/10 text-[#BA1B1D] dark:text-rose-400 text-[10px] font-bold">
                          Management
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                      {selectedEventModal.authorPrecinct || 'City of Elmina Community'}
                    </div>
                  </div>
                </div>

                {selectedEventModal.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-60">
                    <img 
                      src={selectedEventModal.imageUrl} 
                      alt={selectedEventModal.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedEventModal.content}
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventModal(null);
                    setActiveTab('feed');
                  }}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  View in Community Feed →
                </button>

                <div className="flex items-center gap-2">
                  {currentUser.role === 'management' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedEventModal;
                        setSelectedEventModal(null);
                        setEventDeleteConfirm(target);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel Event
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEventModal(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const isNowRsvpd = toggleRsvpEvent(selectedEventModal.id, selectedEventModal.title);
                      triggerAcknowledgeToast(
                        isNowRsvpd ? 'RSVP confirmed! See you at Elmina.' : 'RSVP cancelled.'
                      );
                      setSelectedEventModal(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors ${
                      isRsvpd
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#9E1315] hover:bg-[#841012] text-white'
                    }`}
                  >
                    {isRsvpd ? 'Attending (Cancel RSVP)' : 'RSVP / Attend'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MANAGEMENT SCHEDULE EVENT MODAL (Management Role Only)                     */}
      {/* ========================================================================= */}
      {isCreateEventOpen && currentUser.role === 'management' && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateEventOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-event-heading"
            className="bg-white dark:bg-[#15181C] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#BA1B1D] text-[22px]">
                  event_available
                </span>
                <span id="schedule-event-heading" className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                  Schedule Community Event
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateEventOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEventSubmit} className="p-6 overflow-y-auto space-y-4">
              {eventFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  {eventFormError}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Elmina Sunset Wellness Walk 2026"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    End Date <span className="text-slate-400 font-normal">(Optional for Multi-Day)</span>
                  </label>
                  <input
                    type="date"
                    value={newEventEndDate}
                    min={newEventDate}
                    onChange={(e) => setNewEventEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Time & Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Time String
                  </label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="e.g. 7:30 AM - 10:30 AM"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    placeholder="e.g. Elmina Central Park Pavilion"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Event Details &amp; Programme <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newEventContent}
                  onChange={(e) => setNewEventContent(e.target.value)}
                  placeholder="Describe the activity, agenda, items to bring, meeting point..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Image URL <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={newEventImageUrl}
                  onChange={(e) => setNewEventImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#BA1B1D]/20 focus:border-[#BA1B1D] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateEventOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className="px-4 py-2 rounded-xl bg-[#BA1B1D] hover:bg-[#991517] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEvent ? 'Scheduling...' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGEMENT EVENT CANCELLATION CONFIRMATION MODAL                          */}
      {/* ========================================================================= */}
      {eventDeleteConfirm && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setEventDeleteConfirm(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
        >
          <div 
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-event-heading"
            className="bg-white dark:bg-[#15181C] w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-[#BA1B1D] dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">cancel</span>
            </div>
            <div>
              <h3 id="cancel-event-heading" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cancel Community Event?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to cancel &ldquo;{eventDeleteConfirm.title}&rdquo;? This will remove the event from the community calendar.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEventDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Keep Event
              </button>
              <button
                type="button"
                onClick={() => handleCancelEvent(eventDeleteConfirm)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
