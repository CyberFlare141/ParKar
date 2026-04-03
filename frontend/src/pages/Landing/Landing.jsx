import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import { getAuthToken, getAuthUser, getDashboardPathByRole } from "../../auth/session";

/*
 * ParKar Landing Page
 * ─────────────────────────────────────────────────────────────
 * • NO "all: initial" — that was breaking everything
 * • Uses a <style> tag with #pk-root scoping to override Tailwind
 * • Hero takes full viewport height and is always centered
 * • Fully responsive: mobile → tablet → desktop
 * ─────────────────────────────────────────────────────────────
 */

/* ── Data ─────────────────────────────────────────────────── */
const FEATURES = [
  { icon: "📋", title: "Online Applications",     desc: "Submit parking applications digitally. No paperwork, no queues — upload docs and submit in minutes." },
  { icon: "🤖", title: "AI Document Analysis",     desc: "Intelligent pipeline verifies uploaded IDs and registrations instantly, eliminating manual bottlenecks." },
  { icon: "🚗", title: "Vehicle Management",       desc: "Register multiple vehicles under one account. Swap them on the fly and track permit status instantly." },
  { icon: "💳", title: "Secure Payments",          desc: "Pay fees through our encrypted gateway. Auto-generated receipts emailed the moment payment clears." },
  { icon: "🔔", title: "Real-Time Notifications",  desc: "Instant alerts for status changes, renewal deadlines, and campus-wide announcements." },
  { icon: "📊", title: "Admin Dashboard",          desc: "Application review, audit logs, zone management and analytics — all in one powerful control panel." },
];

const STEPS = [
  { num: "01", title: "Create Account",     desc: "Register as Student or Staff using your university email. Takes under a minute." },
  { num: "02", title: "Add Your Vehicle",   desc: "Enter vehicle details and upload your registration document securely." },
  { num: "03", title: "Submit Application", desc: "Pick a permit type, attach required docs, and submit — done." },
  { num: "04", title: "Park & Go",          desc: "Receive AI-assisted approval, pay online, and get your digital permit instantly." },
];

const PERMITS = [
  { type: "Student",       price: "$50",  period: "per Semester", badge: null,          featured: false, features: ["Access to student zones", "1 registered vehicle", "Semester-long validity", "Email support"] },
  { type: "Faculty / Staff", price: "$80", period: "per Semester", badge: "Most Popular", featured: true,  features: ["Priority parking access", "Up to 2 vehicles", "Reserved sections", "Priority support"] },
  { type: "Premium",       price: "$120", period: "per Semester", badge: null,          featured: false, features: ["VIP & front-row zones", "Unlimited vehicles", "Year-round validity", "Dedicated support"] },
];

const TESTIMONIALS = [
  { text: "The AI approval system saved so much time. I had my permit within minutes — no more waiting in queues for hours.", name: "Sarah M.",   role: "Computer Science, Year 3",        initials: "SM", short: "Got my permit in minutes. No more queues!" },
  { text: "Vehicle management is intuitive. I updated my registration during a short break. That never used to be possible.",  name: "David K.",   role: "Assistant Professor, Engineering",  initials: "DK", short: "Updated my registration in five minutes." },
  { text: "The audit logs and reporting tools have completely transformed how we manage permits across campus.",                name: "Admin Team", role: "Parking Services Department",       initials: "AD", short: "Audit tools transformed our entire workflow." },
];

const FAQS = [
  { q: "How long does approval take?",      a: "Most applications are processed instantly by our AI pipeline. Edge-cases may take up to 24 hours with manual review." },
  { q: "Can I register multiple vehicles?", a: "Student allows 1, Faculty allows 2, and Premium allows unlimited vehicles." },
  { q: "Is my payment information secure?", a: "All transactions run through a PCI-compliant gateway with end-to-end encryption. We never store raw card details." },
  { q: "Can I swap vehicles mid-semester?", a: "Yes, up to twice per semester through your dashboard at no extra charge." },
  { q: "What documents do I need?",         a: "Your university ID, vehicle registration, and proof of enrollment/employment. The flow guides you step-by-step." },
];

const MARQUEE_ITEMS = ["AI Document Verification","Secure Payments","Real-time Notifications","Multi-vehicle Support","Admin Dashboard","Instant Approvals","Permit Management","Audit Logs"];

/* ── Styles ───────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  /* Scope everything under #pk-root — never use all:initial */
  #pk-root {
    display: block;
    width: 100%;
    background: #0b0d10;
    color: #e2e4ea;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.65;
    overflow-x: hidden;
  }

  /* Reset only what we need inside our root */
  #pk-root *, #pk-root *::before, #pk-root *::after {
    box-sizing: border-box;
  }
  #pk-root h1, #pk-root h2, #pk-root h3,
  #pk-root h4, #pk-root h5, #pk-root h6,
  #pk-root p, #pk-root ul, #pk-root li {
    margin: 0; padding: 0;
  }
  #pk-root ul { list-style: none; }
  #pk-root a  { text-decoration: none; color: inherit; }
  #pk-root button { font-family: inherit; cursor: pointer; }
  #pk-root img { max-width: 100%; display: block; }

  /* Custom scrollbar */
  #pk-root ::-webkit-scrollbar       { width: 4px; }
  #pk-root ::-webkit-scrollbar-track { background: #0b0d10; }
  #pk-root ::-webkit-scrollbar-thumb { background: #2dd4bf; border-radius: 2px; }

  /* Smooth scroll */
  #pk-root { scroll-behavior: smooth; }

  /* ── Keyframes ── */
  @keyframes pkFadeUp {
    from { opacity:0; transform:translateY(22px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pkPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%     { opacity:0.4; transform:scale(0.7); }
  }
  @keyframes pkMarquee {
    from { transform:translateX(0); }
    to   { transform:translateX(-50%); }
  }

  #pk-root .pk-a1 { animation: pkFadeUp 0.6s 0.05s both; }
  #pk-root .pk-a2 { animation: pkFadeUp 0.6s 0.15s both; }
  #pk-root .pk-a3 { animation: pkFadeUp 0.6s 0.28s both; }
  #pk-root .pk-a4 { animation: pkFadeUp 0.6s 0.42s both; }
  #pk-root .pk-a5 { animation: pkFadeUp 0.6s 0.56s both; }

  /* ── Container ── */
  #pk-root .pk-wrap {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding-left: 24px;
    padding-right: 24px;
  }

  /* ────────────────────────────────
     NAVBAR
  ──────────────────────────────── */
  #pk-root .pk-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 40px;
    transition: background 0.35s ease, padding 0.35s ease, border-color 0.35s ease;
    border-bottom: 1px solid transparent;
  }
  #pk-root .pk-nav.scrolled {
    background: rgba(11,13,16,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom-color: rgba(255,255,255,0.07);
    padding-top: 12px;
    padding-bottom: 12px;
  }

  /* Logo */
  #pk-root .pk-logo {
    font-family: 'Instrument Serif', serif;
    font-size: 1.65rem;
    letter-spacing: -0.02em;
    color: #2dd4bf;
    white-space: nowrap;
  }
  #pk-root .pk-logo span { color: #e2e4ea; }

  /* Navbar logo image */
  #pk-root .pk-logo-img-link {
    display: flex;
    align-items: center;
    text-decoration: none;
  }
  #pk-root .pk-nav-logo-img {
    height: 36px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 0 6px rgba(45,212,191,0.25));
    transition: filter 0.3s ease, transform 0.25s ease;
  }
  #pk-root .pk-nav-logo-img:hover {
    filter: drop-shadow(0 0 12px rgba(45,212,191,0.55));
    transform: scale(1.05);
  }

  /* Desktop nav links */
  #pk-root .pk-navlinks {
    display: flex;
    align-items: center;
    gap: 36px;
    list-style: none;
  }
  #pk-root .pk-navlinks a {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    letter-spacing: 0.01em;
    transition: color 0.2s;
  }
  #pk-root .pk-navlinks a:hover { color: #e2e4ea; }

  /* Nav right buttons */
  #pk-root .pk-nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #pk-root .pk-admin-controls {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #pk-root .pk-notif-btn {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: transparent;
    color: #e2e4ea;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
  }
  #pk-root .pk-notif-btn:hover {
    border-color: #2dd4bf;
    color: #2dd4bf;
    background: rgba(45,212,191,0.08);
  }
  #pk-root .pk-bell-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
  }
  #pk-root .pk-bell-icon svg {
    width: 18px;
    height: 18px;
  }
  #pk-root .pk-notif-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #ef4444;
    color: #ffffff;
    font-size: 0.68rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    line-height: 1;
    border: 1px solid #0b0d10;
  }
  #pk-root .pk-admin-trigger {
    min-width: 102px;
  }
  #pk-root .pk-admin-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 210px;
    background: rgba(17,20,24,0.98);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 18px 38px rgba(0,0,0,0.3);
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  #pk-root .pk-admin-menu.open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  #pk-root .pk-admin-item {
    display: flex;
    align-items: center;
    width: 100%;
    border-radius: 8px;
    padding: 9px 10px;
    color: #e2e4ea;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.2s ease, color 0.2s ease;
  }
  #pk-root .pk-admin-item:hover {
    background: rgba(45,212,191,0.12);
    color: #b4fff1;
  }
  #pk-root .pk-user-chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(45,212,191,0.45);
    background: rgba(45,212,191,0.1);
    color: #b4fff1;
    border-radius: 100px;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 9px 16px;
    white-space: nowrap;
  }

  /* Hamburger */
  #pk-root .pk-burger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
  }
  #pk-root .pk-burger span {
    display: block;
    width: 22px; height: 2px;
    background: #e2e4ea;
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  /* Mobile drawer */
  #pk-root .pk-drawer {
    display: none;
    flex-direction: column;
    gap: 8px;
    position: fixed;
    top: 60px; left: 0; right: 0;
    z-index: 998;
    background: rgba(11,13,16,0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 20px 24px 28px;
  }
  #pk-root .pk-drawer.open { display: flex; }
  #pk-root .pk-drawer a {
    color: #e2e4ea;
    font-size: 1rem;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  #pk-root .pk-drawer .pk-user-chip {
    margin-top: 8px;
    justify-content: center;
  }

  /* ── Buttons ── */
  #pk-root .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    border-radius: 100px;
    padding: 9px 20px;
    transition: all 0.22s ease;
    white-space: nowrap;
    text-decoration: none;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  #pk-root .btn-teal {
    background: #2dd4bf;
    color: #0b0d10;
  }
  #pk-root .btn-teal:hover {
    background: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(45,212,191,0.3);
  }
  #pk-root .btn-ghost {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    color: #e2e4ea;
  }
  #pk-root .btn-ghost:hover {
    border-color: #2dd4bf;
    color: #2dd4bf;
  }
  #pk-root .btn-lg {
    font-size: 1rem;
    padding: 14px 32px;
    border-radius: 12px;
  }
  #pk-root .btn-full {
    width: 100%;
    border-radius: 10px;
    padding: 13px;
  }

  /* ────────────────────────────────
     HERO  ← THE KEY FIX
  ──────────────────────────────── */
  #pk-root .pk-hero {
    /* Must be at least 100vh and flex-centered */
    min-height: 100vh;
    width: 100%;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center;
    padding: 100px 24px 60px;
    position: relative;
    overflow: hidden;
    background: #0b0d10;
  }

  /* Grid background pattern */
  #pk-root .pk-hero::before {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 50%, black 0%, transparent 100%);
    mask-image: radial-gradient(ellipse 75% 65% at 50% 50%, black 0%, transparent 100%);
  }

  /* Teal glow orb */
  #pk-root .pk-hero::after {
    content: '';
    position: absolute;
    top: 5%; left: 50%;
    transform: translateX(-50%);
    width: min(900px, 100vw);
    height: 500px;
    background: radial-gradient(ellipse at center, rgba(45,212,191,0.09) 0%, transparent 65%);
    pointer-events: none;
  }

  /* Hero inner — centered column (default) */
  #pk-root .pk-hero-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Hero split — two column */
  #pk-root .pk-hero-split {
    max-width: 1180px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 60px;
    text-align: left;
  }
  #pk-root .pk-hero-left {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  #pk-root .pk-hero-right {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateX(clamp(34px, 5vw, 88px));
  }
  #pk-root .pk-hero-logo-wrap {
    position: relative;
    width: clamp(370px, 40vw, 580px);
    height: clamp(370px, 40vw, 580px);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #pk-root .pk-hero-logo-glow {
    position: absolute;
    inset: -20px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.15) 48%, rgba(0,0,0,0.05) 70%, transparent 85%);
    animation: pkHeroGlowPulse 3.5s ease-in-out infinite;
  }
  @keyframes pkHeroGlowPulse {
    0%, 100% { transform: scale(1);   opacity: 1; }
    50%       { transform: scale(1.1); opacity: 0.65; }
  }
  #pk-root .pk-hero-logo {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0 26px rgba(0,0,0,0.45)) drop-shadow(0 0 62px rgba(0,0,0,0.28));
    animation: pkHeroLogoFloat 5s ease-in-out infinite;
  }
  @keyframes pkHeroLogoFloat {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-14px); }
  }
  #pk-root .pk-hero-split .pk-badge      { align-self: flex-start; }
  #pk-root .pk-hero-split .pk-hero-btns  { justify-content: flex-start; }
  #pk-root .pk-hero-split .pk-stats      { justify-content: flex-start; }
  #pk-root .pk-hero-split .pk-hero-sub   { margin-left: 0; }
  @media (max-width: 860px) {
    #pk-root .pk-hero-split {
      flex-direction: column;
      text-align: center;
      gap: 40px;
    }
    #pk-root .pk-hero-split .pk-badge     { align-self: center; }
    #pk-root .pk-hero-split .pk-hero-btns { justify-content: center; }
    #pk-root .pk-hero-split .pk-stats     { justify-content: center; }
    #pk-root .pk-hero-split .pk-hero-sub  { margin: 0 auto 40px; }
    #pk-root .pk-hero-right               { transform: none; }
    #pk-root .pk-hero-logo-wrap           { width: clamp(260px, 66vw, 350px); height: clamp(260px, 66vw, 350px); }
  }

  /* Badge */
  #pk-root .pk-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(45,212,191,0.35);
    background: rgba(45,212,191,0.07);
    border-radius: 100px;
    padding: 6px 16px;
    font-size: 0.78rem;
    color: #2dd4bf;
    margin-bottom: 28px;
    letter-spacing: 0.01em;
  }
  #pk-root .pk-badge-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #2dd4bf;
    flex-shrink: 0;
    animation: pkPulse 2s infinite;
  }

  /* Headline */
  #pk-root .pk-h1 {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(2.4rem, 6.5vw, 5.5rem);
    line-height: 1.06;
    letter-spacing: -0.035em;
    color: #e2e4ea;
    margin-bottom: 22px;
    word-break: break-word;
  }
  #pk-root .pk-h1 em {
    font-style: italic;
    color: #2dd4bf;
  }

  /* Subheadline */
  #pk-root .pk-hero-sub {
    font-size: clamp(0.95rem, 1.8vw, 1.15rem);
    color: #6b7280;
    max-width: 540px;
    font-weight: 300;
    line-height: 1.8;
    margin-bottom: 40px;
  }

  /* CTA row */
  #pk-root .pk-hero-btns {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 0;
  }

  /* Stats bar */
  #pk-root .pk-stats {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: clamp(1.5rem, 4vw, 3.5rem);
    flex-wrap: wrap;
    margin-top: 64px;
    padding-top: 40px;
    border-top: 1px solid rgba(255,255,255,0.07);
    width: 100%;
  }
  #pk-root .pk-stat { text-align: center; }
  #pk-root .pk-stat-n {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(1.8rem, 3.5vw, 2.4rem);
    color: #e2e4ea;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  #pk-root .pk-stat-l {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 5px;
    letter-spacing: 0.04em;
  }

  /* ────────────────────────────────
     MARQUEE TICKER
  ──────────────────────────────── */
  #pk-root .pk-ticker {
    overflow: hidden;
    border-top: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    background: #111418;
    padding: 14px 0;
  }
  #pk-root .pk-ticker-track {
    display: flex;
    gap: 48px;
    white-space: nowrap;
    animation: pkMarquee 22s linear infinite;
    width: max-content;
  }
  #pk-root .pk-ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b7280;
    flex-shrink: 0;
  }
  #pk-root .pk-ticker-item::before {
    content: '◆';
    color: #2dd4bf;
    font-size: 0.42rem;
  }

  /* ────────────────────────────────
     SECTIONS — shared
  ──────────────────────────────── */
  #pk-root .pk-section {
    padding: 88px 0;
  }
  #pk-root .pk-sec-tag {
    display: block;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #2dd4bf;
    font-weight: 700;
    margin-bottom: 10px;
  }
  #pk-root .pk-sec-title {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(1.8rem, 4vw, 3rem);
    letter-spacing: -0.025em;
    line-height: 1.12;
    color: #e2e4ea;
    margin-bottom: 12px;
  }
  #pk-root .pk-sec-sub {
    color: #6b7280;
    font-size: 1rem;
    max-width: 460px;
    font-weight: 300;
    line-height: 1.75;
  }
  #pk-root .pk-surface { background: #111418; border-top: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); }

  /* ────────────────────────────────
     FEATURES GRID
  ──────────────────────────────── */
  #pk-root .pk-feat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    overflow: hidden;
    margin-top: 48px;
  }
  #pk-root .pk-feat-card {
    background: #111418;
    padding: 36px 28px;
    position: relative;
    overflow: hidden;
    transition: background 0.25s ease;
  }
  #pk-root .pk-feat-card:hover { background: #16191f; }
  #pk-root .pk-feat-card::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(45,212,191,0.07) 0%, transparent 55%);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  #pk-root .pk-feat-card:hover::after { opacity: 1; }
  #pk-root .pk-feat-icon {
    width: 46px; height: 46px;
    border-radius: 11px;
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.2);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.15rem;
    margin-bottom: 20px;
  }
  #pk-root .pk-feat-title { font-size: 0.95rem; font-weight: 600; color: #e2e4ea; margin-bottom: 8px; }
  #pk-root .pk-feat-desc  { font-size: 0.875rem; color: #6b7280; line-height: 1.7; }

  /* ────────────────────────────────
     HOW IT WORKS
  ──────────────────────────────── */
  #pk-root .pk-steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-top: 48px;
    position: relative;
  }
  #pk-root .pk-steps::before {
    content: '';
    position: absolute;
    top: 26px; left: 12%; right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  }
  #pk-root .pk-step { text-align: center; padding: 8px; }
  #pk-root .pk-step-num {
    width: 52px; height: 52px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    background: #0b0d10;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Instrument Serif', serif;
    font-size: 1.3rem;
    color: #2dd4bf;
    margin: 0 auto 20px;
    position: relative; z-index: 1;
  }
  #pk-root .pk-step-title { font-weight: 600; font-size: 0.9rem; color: #e2e4ea; margin-bottom: 6px; }
  #pk-root .pk-step-desc  { font-size: 0.85rem; color: #6b7280; line-height: 1.7; }

  /* ────────────────────────────────
     PERMITS / PRICING
  ──────────────────────────────── */
  #pk-root .pk-permits {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 48px;
  }
  #pk-root .pk-permit-card {
    background: #111418;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 32px 28px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  }
  #pk-root .pk-permit-card:hover {
    transform: translateY(-5px);
    border-color: rgba(45,212,191,0.3);
    box-shadow: 0 0 40px rgba(45,212,191,0.1);
  }
  #pk-root .pk-permit-card.featured {
    background: linear-gradient(145deg, rgba(45,212,191,0.07), rgba(56,189,248,0.04));
    border-color: rgba(45,212,191,0.35);
  }
  #pk-root .pk-permit-badge {
    position: absolute; top: 16px; right: 16px;
    background: #2dd4bf; color: #0b0d10;
    font-size: 0.65rem; font-weight: 700;
    padding: 3px 10px; border-radius: 100px;
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  #pk-root .pk-permit-type   { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
  #pk-root .pk-permit-price  { font-family: 'Instrument Serif', serif; font-size: 2.8rem; color: #e2e4ea; letter-spacing: -0.04em; line-height: 1; margin-bottom: 4px; }
  #pk-root .pk-permit-period { color: #6b7280; font-size: 0.82rem; margin-bottom: 24px; }
  #pk-root .pk-permit-feats  { flex: 1; margin-bottom: 24px; }
  #pk-root .pk-permit-feats li {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: #6b7280; font-size: 0.875rem;
  }
  #pk-root .pk-permit-feats li:last-child { border-bottom: none; }
  #pk-root .pk-chk { color: #2dd4bf; font-size: 0.8rem; flex-shrink: 0; }

  /* ────────────────────────────────
     TESTIMONIALS
  ──────────────────────────────── */
  #pk-root .pk-testi-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
  }
  #pk-root .pk-testi-quote {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(1.1rem, 2vw, 1.5rem);
    color: #e2e4ea;
    font-style: italic;
    line-height: 1.55;
    margin-bottom: 24px;
  }
  #pk-root .pk-testi-who { display: flex; align-items: center; gap: 14px; }
  #pk-root .pk-testi-avatar {
    width: 42px; height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2dd4bf, #38bdf8);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 0.875rem; color: #0b0d10;
    flex-shrink: 0;
  }
  #pk-root .pk-testi-name { font-weight: 600; font-size: 0.875rem; color: #e2e4ea; }
  #pk-root .pk-testi-role { font-size: 0.78rem; color: #6b7280; }
  #pk-root .pk-testi-dots { display: flex; gap: 8px; margin-top: 24px; }
  #pk-root .pk-dot {
    height: 3px; width: 22px; border-radius: 2px;
    background: rgba(255,255,255,0.12);
    border: none; cursor: pointer;
    transition: width 0.3s, background 0.3s;
    padding: 0;
  }
  #pk-root .pk-dot.on { background: #2dd4bf; width: 36px; }
  #pk-root .pk-testi-cards { display: flex; flex-direction: column; gap: 12px; }
  #pk-root .pk-tcard {
    background: #0b0d10;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 16px 20px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  #pk-root .pk-tcard.on { border-color: rgba(45,212,191,0.4); background: rgba(45,212,191,0.03); }
  #pk-root .pk-tcard-name { font-size: 0.78rem; font-weight: 600; color: #e2e4ea; margin-bottom: 4px; }
  #pk-root .pk-tcard-name span { color: #6b7280; font-weight: 300; }
  #pk-root .pk-tcard-text { font-size: 0.83rem; color: #6b7280; line-height: 1.55; }

  /* ────────────────────────────────
     FAQ
  ──────────────────────────────── */
  #pk-root .pk-faq-list { max-width: 700px; margin: 44px auto 0; }
  #pk-root .pk-faq-row  { border-bottom: 1px solid rgba(255,255,255,0.07); }
  #pk-root .pk-faq-q {
    display: flex; justify-content: space-between; align-items: center;
    width: 100%; text-align: left;
    padding: 20px 0;
    background: none; border: none; cursor: pointer;
    color: #e2e4ea; font-size: 0.95rem; font-weight: 500;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: color 0.2s;
    gap: 16px;
  }
  #pk-root .pk-faq-q:hover { color: #2dd4bf; }
  #pk-root .pk-faq-icon {
    color: #2dd4bf; font-size: 1.3rem; font-weight: 300;
    flex-shrink: 0; transition: transform 0.3s ease;
    line-height: 1;
  }
  #pk-root .pk-faq-icon.open { transform: rotate(45deg); }
  #pk-root .pk-faq-a {
    color: #6b7280; font-size: 0.875rem; line-height: 1.75;
    max-height: 0; overflow: hidden;
    transition: max-height 0.35s ease, padding-bottom 0.35s;
  }
  #pk-root .pk-faq-a.open { max-height: 160px; padding-bottom: 20px; }

  /* ────────────────────────────────
     CTA SECTION
  ──────────────────────────────── */
  #pk-root .pk-cta {
    text-align: center;
    padding: 112px 24px;
    position: relative;
    overflow: hidden;
    background: #0b0d10;
  }
  #pk-root .pk-cta::before {
    content: '';
    position: absolute;
    bottom: -40%; left: 50%; transform: translateX(-50%);
    width: min(700px, 90vw); height: 450px;
    background: radial-gradient(ellipse at center, rgba(45,212,191,0.1) 0%, transparent 65%);
    pointer-events: none;
  }
  #pk-root .pk-cta-title {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(2rem, 5.5vw, 4.5rem);
    color: #e2e4ea;
    letter-spacing: -0.03em;
    line-height: 1.06;
    margin-bottom: 16px;
    position: relative; z-index: 1;
  }
  #pk-root .pk-cta-title em { font-style: italic; color: #2dd4bf; }
  #pk-root .pk-cta-sub {
    color: #6b7280; font-size: 1.05rem; font-weight: 300;
    margin-bottom: 40px;
    position: relative; z-index: 1;
  }

  /* ────────────────────────────────
     FOOTER
  ──────────────────────────────── */
  #pk-root .pk-footer {
    background: #111418;
    border-top: 1px solid rgba(255,255,255,0.07);
    padding: 64px 0 28px;
  }
  #pk-root .pk-footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 40px;
  }
  #pk-root .pk-footer-brand-desc { color: #6b7280; font-size: 0.875rem; margin-top: 14px; max-width: 240px; line-height: 1.75; }
  #pk-root .pk-footer-col-title  { color: #e2e4ea; font-weight: 600; font-size: 0.875rem; margin-bottom: 16px; }
  #pk-root .pk-footer-links      { display: flex; flex-direction: column; gap: 10px; }
  #pk-root .pk-footer-links a    { color: #6b7280; font-size: 0.875rem; transition: color 0.2s; }
  #pk-root .pk-footer-links a:hover { color: #2dd4bf; }
  #pk-root .pk-socials { display: flex; gap: 10px; margin-top: 20px; }
  #pk-root .pk-social-btn {
    width: 34px; height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    color: #6b7280; font-size: 0.82rem; font-weight: 700;
    transition: border-color 0.2s, color 0.2s;
  }
  #pk-root .pk-social-btn:hover { border-color: #2dd4bf; color: #2dd4bf; }
  #pk-root .pk-footer-bottom {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 48px; padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.07);
    color: #6b7280; font-size: 0.78rem;
  }

  /* ────────────────────────────────
     RESPONSIVE BREAKPOINTS
  ──────────────────────────────── */

  /* Tablet: ≤1024px */
  @media (max-width: 1024px) {
    #pk-root .pk-feat-grid  { grid-template-columns: repeat(2, 1fr); }
    #pk-root .pk-permits    { grid-template-columns: repeat(2, 1fr); }
    #pk-root .pk-footer-grid{ grid-template-columns: repeat(2, 1fr); gap: 32px; }
  }

  /* Small tablet / large phone: ≤860px */
  @media (max-width: 860px) {
    #pk-root .pk-nav         { padding: 14px 20px; }
    #pk-root .pk-nav.scrolled{ padding: 10px 20px; }
    #pk-root .pk-navlinks    { display: none; }
    #pk-root .pk-nav-right   { display: none; }
    #pk-root .pk-burger      { display: flex; }
    #pk-root .pk-steps       { grid-template-columns: repeat(2, 1fr); }
    #pk-root .pk-steps::before { display: none; }
    #pk-root .pk-testi-layout  { grid-template-columns: 1fr; gap: 32px; }
    #pk-root .pk-testi-cards   { display: none; }
  }

  /* Mobile: ≤600px */
  @media (max-width: 600px) {
    #pk-root .pk-nav    { padding: 12px 16px; }
    #pk-root .pk-hero   { padding: 80px 16px 48px; min-height: 100svh; }
    #pk-root .pk-wrap   { padding-left: 16px; padding-right: 16px; }
    #pk-root .pk-section{ padding: 64px 0; }
    #pk-root .pk-feat-grid  { grid-template-columns: 1fr; }
    #pk-root .pk-steps      { grid-template-columns: 1fr; }
    #pk-root .pk-permits    { grid-template-columns: 1fr; }
    #pk-root .pk-stats      { gap: 24px; }
    #pk-root .pk-footer-grid{ grid-template-columns: 1fr; }
    #pk-root .pk-footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
    #pk-root .pk-cta        { padding: 80px 16px; }
  }

  /* Very small: ≤380px */
  @media (max-width: 380px) {
    #pk-root .pk-h1 { font-size: 2rem; }
    #pk-root .pk-hero-btns { flex-direction: column; align-items: stretch; }
    #pk-root .btn-lg { padding: 13px 20px; }
  }
`;

/* ── Component ────────────────────────────────────────────── */
function getUserDisplayName() {
  try {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) return "";
    const user = JSON.parse(rawUser);
    return user?.fullName || user?.name || user?.studentId || user?.email || "";
  } catch {
    return "";
  }
}

function getVehiclePathByRole(role) {
  if (role === "teacher") return "/teacher/vehicles";
  if (role === "student") return "/student/vehicles";
  return null;
}

function getApplicationPathByRole(role) {
  if (role === "admin") return "/admin/review";
  if (role === "student") return "/student/apply";
  if (role === "teacher") return "/teacher/dashboard";
  return getDashboardPathByRole(role);
}

function getRenewApplicationPathByRole(role) {
  if (role === "student") return "/student/renew";
  return null;
}

function getPrimaryActionByRole(role) {
  if (role === "admin") {
    return {
      to: "/admin/review",
      label: "Open Review Queue",
    };
  }

  if (role === "teacher") {
    return {
      to: "/teacher/dashboard",
      label: "Open Dashboard",
    };
  }

  if (role === "student") {
    return {
      to: "/student/apply",
      label: "Apply for a Permit",
    };
  }

  return {
    to: "/register",
    label: "Apply for a Permit",
  };
}

function getSecondaryActionByRole(role) {
  if (role === "admin") {
    return {
      to: "/admin/dashboard",
      label: "Admin Dashboard",
    };
  }

  if (role === "teacher") {
    return {
      to: "/teacher/vehicles",
      label: "Vehicles",
    };
  }

  if (role === "student") {
    return {
      to: "/student/vehicles",
      label: "Vehicle",
    };
  }

  return {
    to: "/login",
    label: "Sign In",
  };
}

function getRoleMenuLabel(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return "User";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [testi,    setTesti]    = useState(0);
  const [userName, setUserName] = useState(getUserDisplayName());
  const userMenuRef = useRef(null);
  
  const authUser = getAuthUser();
  const token = getAuthToken();
  const isLoggedIn = Boolean(token && (authUser || userName));
  const applyPath = getApplicationPathByRole(authUser?.role);
  const vehiclePath = getVehiclePathByRole(authUser?.role);
  const unreadNotifications = 0;
  const roleMenuLabel = getRoleMenuLabel(authUser?.role);
  const dashboardPath = getDashboardPathByRole(authUser?.role);
  const renewApplicationPath = getRenewApplicationPathByRole(authUser?.role);
  const primaryAction = getPrimaryActionByRole(authUser?.role);
  const secondaryAction = getSecondaryActionByRole(authUser?.role);
  const navItems = [
    { label: "Features", href: "#pk-features" },
    { label: "How It Works", href: "#pk-how" },
    { label: "Permits", href: "#pk-permits" },
    { label: "FAQ", href: "#pk-faq" },
    { label: "About Us", to: "/about" },
  ];

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const syncUser = () => setUserName(getUserDisplayName());
    window.addEventListener("storage", syncUser);
    window.addEventListener("focus", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("focus", syncUser);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTesti(p => (p + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div id="pk-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ══ NAVBAR ══ */}
      <nav className={`pk-nav${scrolled ? " scrolled" : ""}`}>
        <a href="#pk-hero" className="pk-logo-img-link">
          <img src={logo} alt="ParKar" className="pk-nav-logo-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
          <span className="pk-logo" style={{ display: 'none' }}>Par<span>Kar</span></span>
        </a>

        <ul className="pk-navlinks">
          {navItems.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          ))}
        </ul>

        <div className="pk-nav-right">
          {authUser ? (
            <div className="pk-admin-controls" ref={userMenuRef}>
              <Link to="/notifications" className="pk-notif-btn" aria-label="Notifications">
                <span className="pk-bell-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path
                      d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-4v-1l-1.8-1.8V11a5.2 5.2 0 0 0-4.2-5.1V5a1 1 0 1 0-2 0v.9A5.2 5.2 0 0 0 6.8 11v4.2L5 17v1h14Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                {unreadNotifications > 0 ? (
                  <span className="pk-notif-badge">{unreadNotifications}</span>
                ) : null}
              </Link>

              <button
                type="button"
                className="btn btn-teal pk-admin-trigger"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                {roleMenuLabel}
              </button>

              <UserMenu
                open={userMenuOpen}
                role={authUser?.role}
                onItemClick={() => setUserMenuOpen(false)}
              />
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-teal">Get Started →</Link>
            </>
          )}
        </div>

        <button className="pk-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span style={menuOpen ? { transform: "rotate(45deg) translate(5px,5px)" }  : {}} />
          <span style={menuOpen ? { opacity: 0 } : {}} />
          <span style={menuOpen ? { transform: "rotate(-45deg) translate(5px,-5px)" } : {}} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`pk-drawer${menuOpen ? " open" : ""}`}>
       {navItems.map((item) =>
          item.href ? (
            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ) : (
            <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          )
        )}
        {authUser ? (
          <>
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="btn btn-ghost" style={{ marginTop: "8px" }}>
              Profile
            </Link>
            <Link to={dashboardPath} onClick={() => setMenuOpen(false)} className="btn btn-ghost" style={{ marginTop: "6px" }}>
              Dashboard
            </Link>
            <Link to={applyPath} onClick={() => setMenuOpen(false)} className="btn btn-ghost" style={{ marginTop: "6px" }}>
              Application
            </Link>
            {renewApplicationPath ? (
              <Link to={renewApplicationPath} onClick={() => setMenuOpen(false)} className="btn btn-ghost" style={{ marginTop: "6px" }}>
                Renew Application
              </Link>
            ) : null}
            <Link to="/notifications" onClick={() => setMenuOpen(false)} className="btn btn-ghost" style={{ marginTop: "6px" }}>
              Notifications
            </Link>
            <Link to="/logout" onClick={() => setMenuOpen(false)} className="btn btn-teal" style={{ marginTop: "6px" }}>
              Logout
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-ghost" style={{ marginTop: "8px" }}>
              Sign In
            </Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} className="btn btn-teal" style={{ marginTop: "6px" }}>
              Get Started →
            </Link>
        
            </>
         )}
      </div>

      {/* ══ HERO ══ */}
      <section id="pk-hero" className="pk-hero">
        <div className="pk-hero-inner pk-hero-split">

          {/* LEFT — text content */}
          <div className="pk-hero-left">
            <div className="pk-badge pk-a1">
              <span className="pk-badge-dot" />
              Now with AI-powered approvals
            </div>

            <h1 className="pk-h1 pk-a2">
              Campus Parking,<br /><em>Reimagined.</em>
            </h1>

            <p className="pk-hero-sub pk-a3">
              Apply, manage, and track university parking permits entirely online —
              with intelligent approvals and real-time status updates.
            </p>

            <div className="pk-hero-btns pk-a4">
              {authUser ? (
                <>
                  <Link to={primaryAction.to} className="btn btn-teal btn-lg">{primaryAction.label}</Link>
                  {secondaryAction?.to ? (
                    <Link to={secondaryAction.to} className="btn btn-ghost btn-lg">{secondaryAction.label}</Link>
                  ) : null}
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-teal btn-lg">Apply for a Permit</Link>
                  <Link to="/login" className="btn btn-ghost btn-lg">Sign In</Link>
                </>
              )}
            </div>

            <div className="pk-stats pk-a5">
              {[["10k+","Permits Issued"],["99%","Approval Accuracy"],["2 min","Avg. Processing"],["4.9 ★","User Rating"]].map(([n,l]) => (
                <div className="pk-stat" key={l}>
                  <div className="pk-stat-n">{n}</div>
                  <div className="pk-stat-l">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — logo visual */}
          <div className="pk-hero-right pk-a3">
            <div className="pk-hero-logo-wrap">
              <div className="pk-hero-logo-glow" />
              <img
                src={logo}
                alt="ParKar Logo"
                className="pk-hero-logo"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ══ TICKER ══ */}
      <div className="pk-ticker" aria-hidden="true">
        <div className="pk-ticker-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((x, i) => (
            <span className="pk-ticker-item" key={i}>{x}</span>
          ))}
        </div>
      </div>

      {/* ══ FEATURES ══ */}
      <section id="pk-features" className="pk-section">
        <div className="pk-wrap">
          <span className="pk-sec-tag">Platform Features</span>
          <h2 className="pk-sec-title">Everything parking,<br />in one place.</h2>
          <p className="pk-sec-sub">From first application to permit renewal — seamless and modern.</p>
          <div className="pk-feat-grid">
            {FEATURES.map(f => <FeatCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="pk-how" className="pk-section pk-surface">
        <div className="pk-wrap" style={{ textAlign: "center" }}>
          <span className="pk-sec-tag">Process</span>
          <h2 className="pk-sec-title">Up and parked in minutes.</h2>
          <p className="pk-sec-sub" style={{ margin: "0 auto" }}>Four simple steps from signup to digital permit.</p>
          <div className="pk-steps">
            {STEPS.map(s => (
              <div className="pk-step" key={s.num}>
                <div className="pk-step-num">{s.num}</div>
                <div className="pk-step-title">{s.title}</div>
                <div className="pk-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="pk-section pk-surface">
        <div className="pk-wrap">
          <div className="pk-testi-layout">
            <div>
              <span className="pk-sec-tag">Testimonials</span>
              <p className="pk-testi-quote">"{TESTIMONIALS[testi].text}"</p>
              <div className="pk-testi-who">
                <div className="pk-testi-avatar">{TESTIMONIALS[testi].initials}</div>
                <div>
                  <div className="pk-testi-name">{TESTIMONIALS[testi].name}</div>
                  <div className="pk-testi-role">{TESTIMONIALS[testi].role}</div>
                </div>
              </div>
              <div className="pk-testi-dots">
                {TESTIMONIALS.map((_, i) => (
                  <button key={i} className={`pk-dot${i === testi ? " on" : ""}`} onClick={() => setTesti(i)} aria-label={`Testimonial ${i + 1}`} />
                ))}
              </div>
            </div>
            <div className="pk-testi-cards">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`pk-tcard${i === testi ? " on" : ""}`} onClick={() => setTesti(i)}>
                  <div className="pk-tcard-name">{t.name} — <span>{t.role}</span></div>
                  <div className="pk-tcard-text">"{t.short}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="pk-faq" className="pk-section pk-surface">
        <div className="pk-wrap" style={{ textAlign: "center" }}>
          <span className="pk-sec-tag">FAQ</span>
          <h2 className="pk-sec-title">Common questions.</h2>
          <FAQList />
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="pk-cta">
        <span className="pk-sec-tag" style={{ position: "relative", zIndex: 1 }}>Get Started</span>
        <h2 className="pk-cta-title">Ready to ditch<br /><em>the paperwork?</em></h2>
        <p className="pk-cta-sub">Join thousands of students and staff who park smarter every day.</p>
        <Link to="/register" className="btn btn-teal" style={{ fontSize: "1rem", padding: "15px 36px", borderRadius: "12px", position: "relative", zIndex: 1 }}>
          Apply Now — It's Free →
        </Link>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="pk-footer">
        <div className="pk-wrap">
          <div className="pk-footer-grid">
            <div>
              <a href="#pk-hero" className="pk-logo-img-link">
                <img src={logo} alt="ParKar" className="pk-nav-logo-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='inline'; }} />
                <span className="pk-logo" style={{ display: 'none' }}>Par<span>Kar</span></span>
              </a>
              <p className="pk-footer-brand-desc">Smart AI-powered university parking management. Fast approvals, zero paperwork.</p>
              <div className="pk-socials">
                {[["𝕏","Twitter"],["in","LinkedIn"],["f","Facebook"],["@","Instagram"]].map(([ic, lb]) => (
                  <a key={lb} href="#" className="pk-social-btn" aria-label={lb}>{ic}</a>
                ))}
              </div>
            </div>
            {[
              ["Product",  ["Features","Pricing","How It Works","Changelog"]],
              ["Company",  ["About","Blog","Careers","Press"]],
              ["Legal",    ["Privacy Policy","Terms of Service","Cookie Policy"]],
            ].map(([title, links]) => (
              <div key={title}>
                <p className="pk-footer-col-title">{title}</p>
                <div className="pk-footer-links">
                  {links.map(l => <a key={l} href="#">{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div className="pk-footer-bottom">
            <span>© {new Date().getFullYear()} ParKar Inc. All rights reserved.</span>
            <span>Made with ♥ for smarter campuses</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function UserMenu({ open, role, onItemClick }) {
  const dashboardPath = getDashboardPathByRole(role);
  const applicationPath = getApplicationPathByRole(role);
  const renewApplicationPath = getRenewApplicationPathByRole(role);
  const items = [
    { label: "Profile", to: "/profile" },
    { label: "Dashboard", to: dashboardPath },
    { label: "Application", to: applicationPath },
    { label: "Logout", to: "/logout" },
  ];

  if (renewApplicationPath) {
    items.splice(3, 0, { label: "Renew Application", to: renewApplicationPath });
  }

  return (
    <div className={`pk-admin-menu${open ? " open" : ""}`} role="menu" aria-label="User menu">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="pk-admin-item"
          role="menuitem"
          onClick={onItemClick}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */
function FeatCard({ icon, title, desc }) {
  const ref = useRef(null);
  const onMove = e => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    ref.current.style.setProperty("--my", `${((e.clientY - r.top)  / r.height) * 100}%`);
  };
  return (
    <div className="pk-feat-card" ref={ref} onMouseMove={onMove}>
      <div className="pk-feat-icon">{icon}</div>
      <div className="pk-feat-title">{title}</div>
      <div className="pk-feat-desc">{desc}</div>
    </div>
  );
}

function PermitCard({ type, price, period, features, featured, badge }) {
  return (
    <div className={`pk-permit-card${featured ? " featured" : ""}`}>
      {badge && <span className="pk-permit-badge">{badge}</span>}
      <div className="pk-permit-type">{type}</div>
      <div className="pk-permit-price">{price}</div>
      <div className="pk-permit-period">{period}</div>
      <ul className="pk-permit-feats">
        {features.map(f => <li key={f}><span className="pk-chk">✓</span>{f}</li>)}
      </ul>
      <Link to="/register" className="btn btn-teal btn-full">
        {featured ? "Get Started →" : "Choose Plan →"}
      </Link>
    </div>
  );
}

function FAQList() {
  const [open, setOpen] = useState(null);
  return (
    <div className="pk-faq-list">
      {FAQS.map((item, i) => (
        <div className="pk-faq-row" key={i}>
          <button className="pk-faq-q" onClick={() => setOpen(open === i ? null : i)}>
            {item.q}
            <span className={`pk-faq-icon${open === i ? " open" : ""}`}>+</span>
          </button>
          <div className={`pk-faq-a${open === i ? " open" : ""}`}>{item.a}</div>
        </div>
      ))}
    </div>
  );
}
