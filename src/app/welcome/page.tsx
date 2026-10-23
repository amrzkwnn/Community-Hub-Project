'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './landing.css';

// Pre-rendered mascot animation frame paths
const MASCOT_FRAMES = {
  idle: '/nadikomuniti/02_nadi_mascot/animation_frames/01-idle-eyes-open.webp',
  blinkHalf: '/nadikomuniti/02_nadi_mascot/animation_frames/02-eyes-half-closed.webp',
  blinkClosed: '/nadikomuniti/02_nadi_mascot/animation_frames/03-eyes-closed-smile.webp',
  waveStart: '/nadikomuniti/02_nadi_mascot/animation_frames/05-wave-start.webp',
  waveRaised: '/nadikomuniti/02_nadi_mascot/animation_frames/06-wave-raised.webp',
  waveReturn: '/nadikomuniti/02_nadi_mascot/animation_frames/07-wave-return.webp',
};

const emptySubscribe = () => () => {};

export default function WelcomePage() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [mascotFrame, setMascotFrame] = useState(MASCOT_FRAMES.idle);
  const [speechText, setSpeechText] = useState('Hi neighbour! 👋');
  const isAnimatingRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll detection for sticky header elevation & scroll-reveal observer
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Scroll reveal observer
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      const revealElements = document.querySelectorAll('.nkReveal');
      const checkReveals = () => {
        const thresholdY = window.innerHeight + 120;
        revealElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.top <= thresholdY) {
            el.classList.add('nkRevealed');
          }
        });
      };

      // Check immediately for visible sections
      checkReveals();
      const timer = setTimeout(checkReveals, 200);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('nkRevealed');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px 80px 0px' }
      );
      revealElements.forEach((el) => observer.observe(el));

      window.addEventListener('scroll', checkReveals, { passive: true });
      window.addEventListener('resize', checkReveals, { passive: true });

      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('scroll', checkReveals);
        window.removeEventListener('resize', checkReveals);
        clearTimeout(timer);
        observer.disconnect();
      };
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Mascot animation state machine: blinking loop & interactive waving
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Preload animation frames for seamless transitions
    Object.values(MASCOT_FRAMES).forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });

    // Periodic natural eye-blink sequence every 5.5 to 7.5 seconds
    const triggerBlink = () => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      setMascotFrame(MASCOT_FRAMES.blinkHalf);
      setTimeout(() => {
        setMascotFrame(MASCOT_FRAMES.blinkClosed);
        setTimeout(() => {
          setMascotFrame(MASCOT_FRAMES.blinkHalf);
          setTimeout(() => {
            setMascotFrame(MASCOT_FRAMES.idle);
            isAnimatingRef.current = false;
          }, 80);
        }, 110);
      }, 80);
    };

    const blinkInterval = setInterval(() => {
      triggerBlink();
    }, 5800);

    return () => clearInterval(blinkInterval);
  }, []);

  // Interactive wave sequence triggered on mascot hover or click
  const triggerWave = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    setSpeechText('Happy to help you! ✨');
    setMascotFrame(MASCOT_FRAMES.waveStart);

    setTimeout(() => {
      setMascotFrame(MASCOT_FRAMES.waveRaised);
      setTimeout(() => {
        setMascotFrame(MASCOT_FRAMES.waveReturn);
        setTimeout(() => {
          setMascotFrame(MASCOT_FRAMES.idle);
          isAnimatingRef.current = false;
          setTimeout(() => setSpeechText('Ask me anything! 💡'), 2000);
        }, 180);
      }, 350);
    }, 160);
  };

  const closeNav = () => setIsNavOpen(false);

  return (
    <div className={`nkLanding ${isMounted ? 'js-ready' : ''}`} id="nkLanding">
      {/* SVG Icon Definitions */}
      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <symbol id="nkArrow" viewBox="0 0 24 24">
            <path d="M5 12h14M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </symbol>
          <symbol id="nkMapPin" viewBox="0 0 24 24">
            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </symbol>
          <symbol id="nkPeople" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M2.5 20v-2c0-3 2.8-5 6.5-5s6.5 2 6.5 5v2M16.5 4.5a3 3 0 0 1 0 6M17 14c2.6 0 4.5 1.8 4.5 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </symbol>
          <symbol id="nkShield" viewBox="0 0 24 24">
            <path d="M12 2 20 5v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m8.5 12 2.5 2.5 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </symbol>
          <symbol id="nkBook" viewBox="0 0 24 24">
            <path d="M12 5c-3-2-6-2-9-1v15c4-1 7-.5 9 1 2-1.5 5-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </symbol>
          <symbol id="nkMenu" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </symbol>
        </defs>
      </svg>

      {/* Header & Sticky Navigation */}
      <header className={`nkHeader ${isScrolled ? 'isScrolled' : ''}`}>
        <div className="nkWrap nkHeaderInner">
          <Link href="#top" className="nkBrand" aria-label="NadiKomuniti home">
            <img
              className="nkBrandLogo"
              src="/nadikomuniti/01_branding/logo-header-horizontal.webp"
              alt="NadiKomuniti"
              width={186}
              height={42}
            />
            <span className="nkBrandSlogan">CONNECT &amp; RELAX</span>
          </Link>

          <nav className={`nkNav ${isNavOpen ? 'isOpen' : ''}`} aria-label="Main navigation" id="nkNav">
            <Link href="#features" onClick={closeNav}>Features</Link>
            <Link href="#how-it-works" onClick={closeNav}>How it works</Link>
            <Link href="#meet-nadi" onClick={closeNav}>Meet Nadi</Link>
            <Link href="#about" onClick={closeNav}>About</Link>
            <Link href="/?tab=home" className="nkMobileAppLink" onClick={closeNav} style={{ display: 'none' }}>
              Open App
            </Link>
          </nav>

          <div className="nkHeaderAction">
            <Link href="/?tab=home" className="nkBtn nkBtnPrimary nkBtnSmall">
              Open App <svg width="15" height="15"><use href="#nkArrow" /></svg>
            </Link>
            <button
              className="nkMobileToggle"
              id="nkMenuButton"
              type="button"
              onClick={() => setIsNavOpen(!isNavOpen)}
              aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={isNavOpen}
              aria-controls="nkNav"
            >
              <svg width="22" height="22"><use href="#nkMenu" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Section 00: Hero & Product Visual Placeholder */}
        <section className="nkHero" id="top" aria-labelledby="nkHeroTitle">
          <div className="nkWrap nkHeroGrid">
            <div className="nkHeroCopy nkReveal nkRevealed">
              <span className="nkEyebrow">Your community. One place.</span>
              <h1 id="nkHeroTitle" className="nkHeroTitle">
                A better way to <span>connect, report</span> and grow a stronger neighbourhood.
              </h1>
              <p className="nkLead">
                Stay informed, find local help and make your voice heard. NadiKomuniti brings your neighbourhood closer, all in one place.
              </p>
              <div className="nkHeroActions">
                <Link href="/?tab=home" className="nkBtn nkBtnPrimary">
                  Explore NadiKomuniti <svg width="17" height="17"><use href="#nkArrow" /></svg>
                </Link>
                <Link href="#how-it-works" className="nkBtn nkBtnOutline">
                  See how it works <svg width="16" height="16"><use href="#nkArrow" /></svg>
                </Link>
              </div>
              <div className="nkBenefits" aria-label="Community benefits">
                <div className="nkBenefit">
                  <span className="nkBenefitIcon"><svg width="21" height="21"><use href="#nkMapPin" /></svg></span>
                  <span>Report local<br />issues</span>
                </div>
                <div className="nkBenefit">
                  <span className="nkBenefitIcon"><svg width="21" height="21"><use href="#nkPeople" /></svg></span>
                  <span>Connect with<br />neighbours</span>
                </div>
                <div className="nkBenefit">
                  <span className="nkBenefitIcon"><svg width="21" height="21"><use href="#nkShield" /></svg></span>
                  <span>Find trusted<br />information</span>
                </div>
                <div className="nkBenefit">
                  <span className="nkBenefitIcon"><svg width="21" height="21"><use href="#nkBook" /></svg></span>
                  <span>Stay<br />informed</span>
                </div>
              </div>
            </div>

            {/* Approved Transparent NadiKomuniti Laptop & Mobile Product Mockup */}
            <div className="nkHeroArt">
              <div className="nkMockupWrapper">
                <Image
                  src="/nadikomuniti/hero/nadikomuniti-hero-transparent.webp"
                  alt="NadiKomuniti Community Hub displayed on laptop and mobile devices"
                  width={636}
                  height={477}
                  priority
                  className="nkHeroMockupImage"
                  sizes="(max-width: 580px) 100vw, (max-width: 980px) 85vw, 636px"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 01 to 04: Features Grid */}
        <section className="nkSection" id="features" aria-labelledby="nkFeaturesTitle" ref={sectionRef}>
          <div className="nkWrap">
            <div className="nkSectionIntro nkReveal">
              <div>
                <span className="nkLabel">Explore the platform</span>
                <h2 className="nkSectionTitle" id="nkFeaturesTitle">
                  Everything you need for<br />a stronger community.
                </h2>
              </div>
              <p className="nkIntroText">
                One place for everyday neighbourhood needs, from reporting a problem to discovering people and services nearby.
              </p>
            </div>

            {/* Feature 01: Report an Issue */}
            <div className="nkFeatureRow nkReveal">
              <div className="nkFeatureCopy">
                <span className="nkFeatureNum">01</span>
                <h3>Report an issue.<br />Know what happens next.</h3>
                <p>
                  Spot a broken light or damaged road? Add a location and photo, send your report, and follow updates as it is reviewed by township management.
                </p>
                <Link className="nkTextLink" href="/?tab=home">
                  Explore reporting <svg width="16" height="16"><use href="#nkArrow" /></svg>
                </Link>
              </div>
              <div className="nkVisual peach">
                <img
                  className="nkFeatureImage"
                  src="/nadikomuniti/03_landing_feature_visuals/feature-01-report-streetlight.webp"
                  alt="Report an issue interface preview showing streetlight alert and location map"
                  loading="eager"
                  onError={(e) => { e.currentTarget.src = '/nadikomuniti/03_landing_feature_visuals/feature-01-report-streetlight.png'; }}
                />
              </div>
            </div>

            {/* Feature 02: Ask Nadi */}
            <div className="nkFeatureRow reverse nkReveal">
              <div className="nkVisual sky">
                <img
                  className="nkFeatureImage"
                  src="/nadikomuniti/03_landing_feature_visuals/feature-02-ask-nadi.webp"
                  alt="Ask Nadi community AI assistant answering resident questions"
                  loading="eager"
                  onError={(e) => { e.currentTarget.src = '/nadikomuniti/03_landing_feature_visuals/feature-02-ask-nadi.png'; }}
                />
              </div>
              <div className="nkFeatureCopy">
                <span className="nkFeatureNum">02</span>
                <h3>Just ask Nadi.<br />Find what matters.</h3>
                <p>
                  Have a question about services, reports or events? Nadi helps you find relevant community information through a simple, natural conversation.
                </p>
                <Link className="nkTextLink" href="#meet-nadi">
                  Meet the assistant <svg width="16" height="16"><use href="#nkArrow" /></svg>
                </Link>
              </div>
            </div>

            {/* Feature 03: Resilience Map */}
            <div className="nkFeatureRow nkReveal">
              <div className="nkFeatureCopy">
                <span className="nkFeatureNum">03</span>
                <h3>See what is happening<br />around you.</h3>
                <p>
                  The Resilience Map brings local reports into view. Explore neighbourhood issues, check their locations and see their latest status in real-time.
                </p>
                <Link className="nkTextLink" href="/?tab=home">
                  Explore the Resilience Map <svg width="16" height="16"><use href="#nkArrow" /></svg>
                </Link>
              </div>
              <div className="nkVisual sky">
                <img
                  className="nkFeatureImage"
                  src="/nadikomuniti/03_landing_feature_visuals/feature-03-resilience-map.webp"
                  alt="Civic Resilience Map interface showing open reports and verified statuses"
                  loading="eager"
                  onError={(e) => { e.currentTarget.src = '/nadikomuniti/03_landing_feature_visuals/feature-03-resilience-map.png'; }}
                />
              </div>
            </div>

            {/* Feature 04: Community Exchange */}
            <div className="nkFeatureRow reverse nkReveal">
              <div className="nkVisual mint">
                <img
                  className="nkFeatureImage"
                  src="/nadikomuniti/03_landing_feature_visuals/feature-04-exchange-real-chair-plant.webp"
                  alt="Community Exchange with pre-loved study chair and indoor plant photography"
                  loading="eager"
                  onError={(e) => { e.currentTarget.src = '/nadikomuniti/03_landing_feature_visuals/feature-04-exchange-real-chair-plant.png'; }}
                />
              </div>
              <div className="nkFeatureCopy">
                <span className="nkFeatureNum">04</span>
                <h3>Good things are<br />better shared.</h3>
                <p>
                  Discover reusable items, offer something you no longer need, and connect with neighbours for practical local support and sustainable zero-waste living.
                </p>
                <Link className="nkTextLink" href="/?tab=home">
                  Explore community exchange <svg width="16" height="16"><use href="#nkArrow" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 05: How It Works */}
        <section className="nkSection nkSteps" id="how-it-works" aria-labelledby="nkStepsTitle">
          <div className="nkWrap">
            <div className="nkCenter nkReveal">
              <span className="nkLabel">How it works</span>
              <h2 id="nkStepsTitle">From a report to real follow-up.</h2>
              <p>Clear steps help residents stay informed while township management handles each report.</p>
            </div>
            <div className="nkStepGrid">
              <div className="nkStep nkReveal">
                <div className="nkStepIconBox">
                  <img
                    className="nkStepIcon"
                    src="/nadikomuniti/04_how_it_works_icons/step-01-report-camera.webp"
                    alt="Step 1 Camera Icon"
                    width={56}
                    height={56}
                  />
                </div>
                <h3>1. Report</h3>
                <p>Add a photo, describe the problem and mark its location on the township map.</p>
              </div>
              <div className="nkStep nkReveal">
                <div className="nkStepIconBox">
                  <img
                    className="nkStepIcon"
                    src="/nadikomuniti/04_how_it_works_icons/step-02-management-review.webp"
                    alt="Step 2 Management Review Icon"
                    width={56}
                    height={56}
                  />
                </div>
                <h3>2. Management reviews</h3>
                <p>The township team verifies the report, prioritizes urgency, and dispatches field crews.</p>
              </div>
              <div className="nkStep nkReveal">
                <div className="nkStepIconBox">
                  <img
                    className="nkStepIcon"
                    src="/nadikomuniti/04_how_it_works_icons/step-03-status-updated.webp"
                    alt="Step 3 Status Updated Icon"
                    width={56}
                    height={56}
                  />
                </div>
                <h3>3. Follow the status</h3>
                <p>See live progress updates, field notes, and know exactly when the issue is resolved.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 06: Meet Nadi Mascot */}
        <section className="nkNadiSection" id="meet-nadi" aria-labelledby="nkMeetNadiTitle">
          <div className="nkWrap nkNadiGrid">
            <div className="nkNadiPortrait nkReveal">
              <div className="nkNadiBubble" aria-live="polite">
                {speechText}
              </div>
              <img
                className="nkMascotInteractive"
                src={mascotFrame}
                alt="Nadi mascot, a navy knitted 3D robot with cream face and headphones"
                onClick={triggerWave}
                onMouseEnter={triggerWave}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerWave();
                  }
                }}
                role="button"
                aria-label="Interact with Nadi mascot - click or hover to make Nadi wave"
                loading="eager"
              />
            </div>
            <div className="nkReveal">
              <span className="nkLabel">Meet Nadi</span>
              <h2 id="nkMeetNadiTitle">A little help from<br />your community guide.</h2>
              <p>
                Meet Nadi, your friendly AI civic companion. Ask about neighbourhood updates, find vetted local handymen, or learn where to report a maintenance issue. Nadi helps you find answers, while community members remain in control of decisions.
              </p>
              <div className="nkChips">
                <span className="nkChip">Community questions</span>
                <span className="nkChip">Local services</span>
                <span className="nkChip">Report guidance</span>
                <span className="nkChip">Everyday help</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 07: Final Call to Action */}
        <section className="nkCta" id="about">
          <div className="nkWrap">
            <div className="nkCtaCard nkReveal">
              <span className="nkLabel">Connect &amp; Relax</span>
              <h2>Your community is just one click away.</h2>
              <p>Join NadiKomuniti and see what is happening in your neighbourhood today.</p>
              <Link className="nkBtn nkBtnPrimary" href="/?tab=home">
                Open NadiKomuniti <svg width="17" height="17"><use href="#nkArrow" /></svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Section 08: Footer */}
      <footer className="nkFooter">
        <div className="nkWrap">
          <div className="nkFooterTop">
            <Link href="#top" aria-label="Back to top">
              <img
                className="nkFooterLogo"
                src="/nadikomuniti/01_branding/logo-header-horizontal.webp"
                alt="NadiKomuniti"
                width={145}
                height={34}
              />
            </Link>
            <div className="nkFooterLinks">
              <Link href="#features">Features</Link>
              <Link href="#how-it-works">How it works</Link>
              <Link href="#meet-nadi">Meet Nadi</Link>
              <Link href="/?tab=home">Open App</Link>
            </div>
          </div>
          <div className="nkFooterBottom">
            <span>NadiKomuniti · Connect &amp; Relax</span>
            <span>Landing page concept. Product mockups are placeholders.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
