import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Activity,
  BookOpen,
  Compass,
  Calendar,
  Clock,
  ChevronRight,
  Leaf,
  HeartHandshake,
  Stethoscope,
  Shield,
  Eye,
  Check,
  Building2,
  GraduationCap,
  Award,
  FileText,
  AlertTriangle,
  Globe,
  Sun,
  Flame,
  Droplets,
  Wind,
  Target,
  ArrowDown,
} from 'lucide-react';
import {
  ASSET_IMAGES,
  AYUSH_DISCIPLINES_INFO,
  INITIAL_PROGRAMS,
  PLATFORM_WORKFLOW_STEPS,
} from '../../data/mockData';
import { SafetyBanner } from '../common/SafetyBanner';
import { RoleType } from '../../types';

interface LandingPageProps {
  onSelectRole: (role: RoleType) => void;
  onOpenAssessment: () => void;
  onNavigateToRoles: () => void;
  onOpenAuth?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRole,
  onOpenAssessment,
  onNavigateToRoles,
  onOpenAuth,
}) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<number>(0);

  const scrollToBrochure = () => {
    const el = document.getElementById('ayush-intro-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const systemsDetailed = [
    {
      code: 'A',
      name: 'Ayurveda',
      subtitle: 'The Science of Life and Longevity',
      heritage: 'Vedic Tradition (Over 3,000 Years)',
      philosophy:
        'Focuses on maintaining the delicate dynamic equilibrium among three fundamental biological forces or humours known as Doshas: Vata (kinetic/air & space), Pitta (transformative/fire & water), and Kapha (structural/earth & water). Health (Swastha) is defined as physical balance, efficient metabolic fire (Agni), tissue harmony (Dhatus), proper waste elimination (Malas), and a delighted state of mind and senses.',
      generalApproach:
        'Individualized daily routine (Dinacharya), seasonal adaptations (Ritucharya), wholesome nutrition encompassing the six tastes (Shad Rasa), sensory cleansing, and culinary herbs and rasayanas.',
      keyPillars: [
        'Prakriti (Constitutional Uniqueness)',
        'Jatharagni (Digestive Metabolic Fire)',
        'Dinacharya & Ritucharya (Circadian Cycles)',
        'Ahara & Aushadha (Food as First Medicine)',
      ],
      practicalInsight:
        'Small, steady habits—like sipping warm water in the morning and honoring meal regularity—help balance innate Dosha rhythms.',
    },
    {
      code: 'Y & N',
      name: 'Yoga and Naturopathy',
      subtitle: 'Mind-Body Union & Natural Self-Healing',
      heritage: 'Classical Patanjali Darshana & Nature Cure Principles',
      philosophy:
        'Yoga coordinates breath, mental equanimity, and physical alignment through the eightfold path (Ashtanga Yoga) to optimize psychoneuroimmunological resilience. Naturopathy is a drugless therapeutic system founded on the principle that the human organism possesses an inherent vitality to maintain and recover vitality when aligned with the five primal elements (Panchamahabhutas: Earth, Water, Fire, Air, and Ether).',
      generalApproach:
        'Breath regulation (Pranayama), mindful posture (Asana), therapeutic relaxation (Yoga Nidra), fasting therapy, hydrotherapy, sun therapy (heliotherapy), and seasonal wholesome vegetarian sustenance.',
      keyPillars: [
        'Prana Vayu & Autonomic Nervous Regulation',
        'Five Primal Natural Elements (Panchamahabhutas)',
        'Self-Healing Power of Nature (Vis Medicatrix Naturae)',
        'Mindfulness & Mental Equanimity (Chitta Vritti Nirodha)',
      ],
      practicalInsight:
        'Gentle diaphragmatic breathing and daily joint mobility relieve postural fatigue from modern desk work.',
    },
    {
      code: 'U',
      name: 'Unani (Unani-Tibb)',
      subtitle: 'Greco-Arabic Holistic Medicine & Humoral Harmony',
      heritage: 'Origins in Hippocratic & Galenic Wisdom, Flourished in India',
      philosophy:
        'Unani system of medicine posits that health reflects the harmonic balance of four primary bodily humours (Akhlat): Dam (blood), Balgham (phlegm), Safra (yellow bile), and Sauda (black bile). Each individual possesses an innate constitutional temperament (Mizaj). Healing relies on strengthening the innate biological intelligence, known as Quwwat-e-Mudabbira-e-Badan, which self-regulates health.',
      generalApproach:
        'Regimentation of the Six Essential Life Factors (Asbab-e-Sittah Zarooriyyah): atmospheric air, food and drink, physical movement and rest, sleep and wakefulness, mental movement and tranquility, and retention and evacuation.',
      keyPillars: [
        'Mizaj (Individual Temperament)',
        'Quwwat-e-Mudabbira (Innate Healing Force)',
        'Asbab-e-Sittah (6 Essential Lifestyle Precepts)',
        'Ilaj-bil-Tadbeer (Regimental Lifestyle Balancing)',
      ],
      practicalInsight:
        'Emphasizes clean air, balanced diurnal sleep, and non-congesting nutrition tailored to personal thermal temperament.',
    },
    {
      code: 'S',
      name: 'Siddha',
      subtitle: 'Ancient Dravidian Science of Vital Longevity',
      heritage: 'Southern India (Rooted in the 18 Siddhars, including Sage Agastya)',
      philosophy:
        'Siddha operates on the premise that the human microcosm (Pindam) and the universal macrocosm (Andam) are identical expressions of the five primal elements. Physiological functions are governed by the three bio-regulators (Mukkuttram): Vali (wind/nerve force), Azhal (heat/metabolic force), and Iyyam (water/structural lubrication).',
      generalApproach:
        'Longevity cultivation (Kayakalpa), rhythmic dietary schedules, herbal decoctions, vital energy node management (Varmam therapy), and gentle somatic postures for endurance and rejuvenation.',
      keyPillars: [
        'Andam-Pindam Concept (Macrocosm-Microcosm Harmony)',
        'Mukkuttram Tri-Dosha Equilibrium',
        'Kayakalpa (Vital Cellular Longevity Regimen)',
        'Varmam (Energy Convergence Points)',
      ],
      practicalInsight:
        'Prioritizes dietary purity and vital point balance to maintain structural longevity and emotional poise.',
    },
    {
      code: 'H',
      name: 'Homoeopathy',
      subtitle: 'Individualized Similars & Vital Energy Stimulation',
      heritage: 'Founded by Dr. Christian Friedrich Samuel Hahnemann',
      philosophy:
        'Homoeopathy is founded on the foundational biological principle of "Similia Similibus Curentur" (Let likes be cured by likes). It recognizes the human being as an integrated totality of body, mind, and spirit governed by a subtle dynamic Vital Force. Disruption of this internal harmony manifests in observable symptom patterns.',
      generalApproach:
        'Comprehensive constitutional case evaluation assessing emotional, physical, and environmental sensitivities; gentle guidance on diet and lifestyle stressors; and highly individualized, non-toxic micro-dilutions.',
      keyPillars: [
        'Law of Similars (Similia Similibus Curentur)',
        'Totality of Symptoms & Holistic Individualization',
        'Dynamic Vital Force Resilience',
        'Gentle, Non-Invasive Minimum Intervention',
      ],
      practicalInsight:
        'Focuses on identifying unique psychosomatic triggers and building internal vitality rather than masking isolated complaints.',
    },
  ];

  const platformOfferings = [
    {
      icon: <Compass className="w-5 h-5 text-[#0284C7]" />,
      title: 'Lifestyle Assessments',
      desc: 'Complete an in-depth 20-question self-observation across 8 dimensions (circadian rhythm, sleep, meal timing, digestion, movement, stress, hydration, screen habits) to identify your baseline rhythm.',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-[#0284C7]" />,
      title: 'Educational Wellness Plans',
      desc: 'Receive a personalized, versioned AYUSH wellness plan containing structured daily routines, morning and evening rituals, and weekly goals—complete with clear "Why" explanations.',
    },
    {
      icon: <Clock className="w-5 h-5 text-[#0284C7]" />,
      title: 'Dinacharya Habit Tracking',
      desc: 'Track evidence-informed daily rituals (such as morning Ushapan warm water, Nadi Shodhana breathing, and digital sunset) with transparent daily and weekly adherence analytics.',
    },
    {
      icon: <Stethoscope className="w-5 h-5 text-[#0284C7]" />,
      title: 'Practitioner Profiles & Consultations',
      desc: 'Explore licensed AYUSH physicians with recognized institutional qualifications (BAMS, MD, BUMS, BSMS, BHMS) and send appointment requests directly from the portal.',
    },
    {
      icon: <BookOpen className="w-5 h-5 text-[#0284C7]" />,
      title: 'Educational Articles & Regimens',
      desc: 'Read peer-reviewed traditional health wisdom, herbal safety parameters, and enroll in multi-week structured lifestyle programs guided by domain practitioners.',
    },
    {
      icon: <Award className="w-5 h-5 text-[#0284C7]" />,
      title: 'Progressive Versioning & Progress Diffs',
      desc: 'Re-assess every few weeks to automatically generate revised plans and review your longitudinal improvements, unchanged habits, and focus areas over time.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-28 pb-20">
      {/* 1. PUBLIC HERO SECTION & BROCHURE INVITATION */}
      <section id="hero-section" className="relative pt-6 sm:pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Hero Copy & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#CCFBF1] text-[#0F766E] rounded-full text-xs font-semibold tracking-wide border border-[#99F6E4]">
                <Leaf className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>India’s Traditional Systems of Health & Lifestyle Wellness</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-serif font-bold text-[#0F172A] tracking-tight leading-[1.18] text-balance">
                Discover the timeless wisdom of AYUSH for modern daily vitality.
              </h1>

              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-2xl">
                AYUSH represents India’s recognized traditional and complementary systems: <strong>Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homoeopathy</strong>. Browse our public educational brochure below to understand these profound systems before logging in, or sign in to access personalized lifestyle tracking and certified practitioner care.
              </p>

              {/* TWO PROMINENT MANDATORY ACTIONS */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                {/* Action 1: What is AYUSH? (Scrolls down to brochure) */}
                <button
                  type="button"
                  onClick={scrollToBrochure}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#075985] bg-white hover:bg-[#F1F5F9] border-2 border-[#0284C7] rounded-xl shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
                >
                  <BookOpen className="w-4 h-4 text-[#0284C7]" />
                  <span>WHAT IS AYUSH?</span>
                  <ArrowDown className="w-4 h-4 text-[#0284C7]" />
                </button>

                {/* Action 2: Sign In / Get Started */}
                <button
                  type="button"
                  onClick={onOpenAuth || onNavigateToRoles}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] rounded-xl shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
                >
                  <span>Sign In / Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-[#E2E8F0] text-xs text-[#475569]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>Public Educational Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>Classical Non-Diagnostic Wisdom</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                  <GraduationCap className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span>5 Recognized Systems</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Asset */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#CBD5E1] bg-[#F1F5F9]">
                <img
                  src={ASSET_IMAGES.hero}
                  alt="Traditional Indian wellness aesthetic with warm herbal infusion, brass vessel, and natural botanical elements"
                  referrerPolicy="no-referrer"
                  className="w-full h-[360px] sm:h-[440px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#CCFBF1]">
                    AYUSH Systems Brochure
                  </span>
                  <p className="text-base sm:text-lg font-serif font-bold mt-1">
                    Holistic Wellness, Living Heritage & Daily Habits
                  </p>
                  <p className="text-xs text-[#E2E8F0] mt-1.5 leading-relaxed">
                    Open to all seekers. Learn how ancient circadian sciences inform modern vitality and mindful living.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MANDATORY SAFETY DISCLAIMER BANNER (Prominent) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SafetyBanner />
      </section>

      {/* =========================================================================
          SECTION A: INTRODUCTION TO AYUSH (BROCHURE CORE)
         ========================================================================= */}
      <section
        id="ayush-intro-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-8"
      >
        <div className="bg-[#F1F5F9] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E2E8F0] shadow-xs space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
              <span className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
                Part A · Introduction to AYUSH
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#0F172A]">
              What is AYUSH?
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              <strong>AYUSH</strong> is an acronym representing India’s recognized indigenous, traditional, and complementary systems of healthcare and holistic wellbeing:
            </p>
          </div>

          {/* 5 Acronym Letters Highlight Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] font-serif font-bold text-xl flex items-center justify-center">
                A
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">Ayurveda</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                The science of life, longevity, and constitutional balance (Doshas & Agni).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] font-serif font-bold text-lg flex items-center justify-center">
                Y & N
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">Yoga & Naturopathy</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Mind-body union, breath control (Pranayama), and five-element nature cure.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] font-serif font-bold text-xl flex items-center justify-center">
                U
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">Unani</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Humoral balance, innate restorative intelligence, and six lifestyle essentials.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] font-bold shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] font-serif text-xl flex items-center justify-center">
                S
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">Siddha</h3>
              <p className="text-xs text-[#475569] leading-relaxed font-normal">
                Ancient Dravidian science of vital energy points (Varmam) and longevity (Kayakalpa).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0D9488] font-serif font-bold text-xl flex items-center justify-center">
                H
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">Homoeopathy</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Gentle individualized holistic healing guided by the principle of similars.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#CCFBF1]/50 rounded-2xl border border-[#99F6E4] text-xs sm:text-sm text-[#0F766E] leading-relaxed">
            Together, these five distinct disciplines share a common ethos: treating the individual as an integrated whole—mind, body, senses, and environment—rather than focusing solely on isolated physical complaints.
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: ABOUT THE FIVE SYSTEMS (DETAILED BROCHURE)
         ========================================================================= */}
      <section
        id="ayush-systems"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24"
      >
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#CCFBF1] rounded-full text-xs font-semibold text-[#0F766E]">
            <span>Part B · About the Five Systems</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#0F172A]">
            Philosophies & General Approaches
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            Select any system below to explore its historical heritage, core physiological philosophy, general lifestyle approach, and foundational pillars.
          </p>
        </div>

        {/* 5 Systems Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {systemsDetailed.map((sys, idx) => {
            const isSelected = selectedDiscipline === idx;
            return (
              <button
                key={sys.name}
                type="button"
                onClick={() => setSelectedDiscipline(idx)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0284C7] text-white shadow-sm ring-2 ring-[#0284C7]/20'
                    : 'bg-white text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]'
                }`}
              >
                <span className="opacity-80 text-[11px]">{sys.code}</span>
                <span>{sys.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Detailed Brochure Card for Selected System */}
        {(() => {
          const sys = systemsDetailed[selectedDiscipline];
          return (
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-3xl border border-[#CBD5E1] shadow-sm max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-lg bg-[#CCFBF1] text-[#0D9488] font-bold text-xs flex items-center justify-center">
                      {sys.code}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F172A]">
                      {sys.name}
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-[#0284C7] mt-1">
                    {sys.subtitle}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    <strong>Tradition:</strong> {sys.heritage}
                  </p>
                </div>

                <div className="px-3.5 py-2 bg-[#F1F5F9] rounded-xl text-xs text-[#475569] border border-[#E2E8F0] max-w-xs">
                  <span className="font-semibold block text-[#0F172A]">Daily Practice Insight:</span>
                  <span className="text-[11px] leading-relaxed">{sys.practicalInsight}</span>
                </div>
              </div>

              {/* Core Philosophy & General Approach */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-xs sm:text-sm text-[#475569] leading-relaxed">
                {/* Left 7 cols: Philosophy & Approach */}
                <div className="md:col-span-7 space-y-5">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Foundational Health Philosophy</span>
                    </h4>
                    <p className="leading-relaxed text-[#475569]">
                      {sys.philosophy}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>General Lifestyle & Health Approach</span>
                    </h4>
                    <p className="leading-relaxed text-[#475569]">
                      {sys.generalApproach}
                    </p>
                  </div>
                </div>

                {/* Right 5 cols: Key Pillars */}
                <div className="md:col-span-5 bg-[#F1F5F9] p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] space-y-3.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#0F172A] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Four Cornerstones of {sys.name}</span>
                  </h4>

                  <ul className="space-y-2 text-xs text-[#0F172A]">
                    {sys.keyPillars.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                        <Check className="w-3.5 h-3.5 text-[#0D9488] mt-0.5 shrink-0" />
                        <span className="font-medium">{p}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={onOpenAuth || onNavigateToRoles}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl transition-colors shadow-xs"
                    >
                      Sign In to Explore {sys.name} Regimens
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* =========================================================================
          SECTION C: AYUSH IN INDIA (HISTORICAL LANDSCAPE & INSTITUTIONAL PRESENCE)
         ========================================================================= */}
      <section
        id="ayush-in-india"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-24"
      >
        <div className="bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#CCFBF1]/35 rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#CBD5E1] shadow-xs space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
              <span className="text-xs font-bold text-[#0284C7] uppercase tracking-wider">
                Part C · AYUSH in India
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#0F172A]">
              Traditional Health Landscape & Institutional Presence
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              India has one of the world's richest, continuously practiced living health traditions, formally recognized, standardized, and nurtured through modern institutional frameworks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
            {/* Card 1: Living Heritage & Cultural Continuum */}
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#0284C7] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Living Cultural Continuum
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                For millennia, Indian households have incorporated classical wellness habits into everyday life—from turmeric and ginger teas to seasonal dining (Ritucharya), morning warm water intake (Ushapan), and daily Surya Namaskar. AYUSH codifies these organic practices into systematic sciences.
              </p>
            </div>

            {/* Card 2: Institutional Infrastructure */}
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#0284C7] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Institutional Presence & Education
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                India maintains statutory bodies, National Institutes, state medical councils, and hundreds of accredited medical colleges awarding recognized degrees (such as BAMS, MD/MS Ayurveda, BNYS, BUMS, BSMS, and BHMS) to ensure formal clinical training and patient safety.
              </p>
            </div>

            {/* Card 3: Research & Evidence-Informed Evolution */}
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#0284C7] flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#0F172A]">
                Evidence-Informed Development
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Modern clinical studies, pharmacopoeial standardization, botanical research, and global initiatives celebrate traditional healthcare as a preventative pillar alongside modern medicine, emphasizing lifestyle modification for non-communicable challenges.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B]">
            <span>
              <strong>Note:</strong> AYUSH Wellness Connect supports this ecosystem through independent educational tools and verified practitioner networking.
            </span>
            <span className="font-medium text-[#0D9488]">
              Preserving Classical Integrity · Fostering Contemporary Care
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: WHAT THIS PLATFORM OFFERS (PLATFORM CAPABILITIES)
         ========================================================================= */}
      <section
        id="what-platform-offers"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 scroll-mt-24"
      >
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#CCFBF1] rounded-full text-xs font-semibold text-[#0F766E]">
            <span>Part D · What This Platform Offers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#0F172A]">
            A Comprehensive Digital Lifestyle Platform
          </h2>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
            AYUSH Wellness Connect translates traditional health science into practical, non-punitive daily support for modern living. Here is what you can experience:
          </p>
        </div>

        {/* 6 Core Feature Offerings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformOfferings.map((off, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#CBD5E1] transition-all group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center group-hover:scale-105 transition-transform">
                  {off.icon}
                </div>
                <h3 className="font-serif font-bold text-base text-[#0F172A]">
                  {off.title}
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {off.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onOpenAuth || onNavigateToRoles}
                  className="text-xs font-semibold text-[#0284C7] hover:underline flex items-center gap-1"
                >
                  <span>Access via User Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION E: IMPORTANT EDUCATIONAL DISCLAIMER (MANDATORY BROCHURE PILLAR)
         ========================================================================= */}
      <section
        id="disclaimer-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24"
      >
        <div className="bg-amber-50 rounded-3xl p-6 sm:p-8 lg:p-10 border border-amber-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Part E · Important Public Health Disclaimer
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif font-bold text-amber-950">
            Educational Wellness Information Only
          </h3>

          <div className="space-y-2.5 text-xs sm:text-sm text-amber-900 leading-relaxed">
            <p>
              <strong>1. Non-Diagnostic Educational Scope:</strong> The information, lifestyle questionnaires, and self-care plans provided on AYUSH Wellness Connect are intended solely for general health education, routine habit cultivation, and traditional wellness literacy. They do <strong>not</strong> constitute medical diagnosis, clinical treatment, medical prognostication, or pharmaceutical prescription.
            </p>
            <p>
              <strong>2. Does Not Replace Professional Healthcare:</strong> This platform is designed to complement, never replace, direct consultation with qualified healthcare professionals, including registered AYUSH physicians (BAMS, MD, BUMS, BSMS, BHMS) or allopathic practitioners (MBBS, MD).
            </p>
            <p>
              <strong>3. Medical Emergencies:</strong> If you are experiencing acute medical distress, sudden severe symptoms, or medical emergencies, please immediately visit the nearest emergency medical facility or contact local emergency services. Never disregard or delay professional clinical care because of information found on this platform.
            </p>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION / REGISTRATION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0F172A] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1E293B] text-[#14B8A6] rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Begin Your Personal Dinacharya Journey</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold leading-tight">
              Ready to experience personalized AYUSH wellness?
            </h2>

            <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
              Create a free account to take the complete 20-question lifestyle assessment, unlock your tailored daily Dinacharya schedule, track habits, and connect directly with certified AYUSH doctors.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={onOpenAuth || onNavigateToRoles}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-white rounded-xl shadow-xs transition-colors"
              >
                <span>Sign In / Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onNavigateToRoles}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#1E293B] hover:bg-[#334155] rounded-xl border border-[#334155] transition-colors"
              >
                <span>Preview Demo Portals</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
