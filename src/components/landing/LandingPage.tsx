import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Compass,
  Clock,
  ChevronRight,
  Leaf,
  Stethoscope,
  Check,
  Building2,
  GraduationCap,
  Award,
  AlertTriangle,
  Globe,
  HeartPulse,
  ShieldCheck,
  User,
} from 'lucide-react';
import heroWellnessImage from '../../assets/images/ayush_hero_wellness_1793904214426.jpg';
import { SafetyBanner } from '../common/SafetyBanner';
import { RoleType } from '../../types';

interface LandingPageProps {
  onSelectRole: (role: RoleType) => void;
  onOpenAssessment: () => void;
  onNavigateToRoles: () => void;
  onOpenAuth?: () => void;
}

const LotusEmblem: React.FC<{ className?: string }> = ({ className = 'w-6 h-5' }) => (
  <svg viewBox="0 0 40 32" className={className} fill="none" aria-hidden="true">
    <path
      d="M20 4C17 10 17 16.5 20 22C23 16.5 23 10 20 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.16"
    />
    <path
      d="M19.2 22C13.8 19.5 10.5 14 10.5 8.5C15 10.5 18 15 19.2 22Z"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path
      d="M20.8 22C26.2 19.5 29.5 14 29.5 8.5C25 10.5 22 15 20.8 22Z"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path
      d="M18.5 23C12 22.5 6.8 19 5 14C10 14.5 14.5 17.5 18.5 23Z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M21.5 23C28 22.5 33.2 19 35 14C30 14.5 25.5 17.5 21.5 23Z"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M11 26.5C15.5 25.2 24.5 25.2 29 26.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAssessment: _onOpenAssessment,
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

  const handleSelectMandalaPillar = (systemIdx: number) => {
    setSelectedDiscipline(systemIdx);
    const el = document.getElementById('ayush-systems');
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
      icon: <Compass className="w-5 h-5 text-[#3A6B4C]" />,
      title: 'Lifestyle Assessments',
      desc: 'Complete an in-depth 20-question self-observation across 8 dimensions (circadian rhythm, sleep, meal timing, digestion, movement, stress, hydration, screen habits) to identify your baseline rhythm.',
    },
    {
      icon: <Sparkles className="w-5 h-5 text-[#3A6B4C]" />,
      title: 'Educational Wellness Plans',
      desc: 'Receive a personalized, versioned AYUSH wellness plan containing structured daily routines, morning and evening rituals, and weekly goals—complete with clear "Why" explanations.',
    },
    {
      icon: <Clock className="w-5 h-5 text-[#3A6B4C]" />,
      title: 'Dinacharya Habit Tracking',
      desc: 'Track evidence-informed daily rituals (such as morning Ushapan warm water, Nadi Shodhana breathing, and digital sunset) with transparent daily and weekly adherence analytics.',
    },
    {
      icon: <Stethoscope className="w-5 h-5 text-[#3A6B4C]" />,
      title: 'Practitioner Profiles & Consultations',
      desc: 'Explore licensed AYUSH physicians with recognized institutional qualifications (BAMS, MD, BUMS, BSMS, BHMS) and send appointment requests directly from the portal.',
    },
    {
      icon: <BookOpen className="w-5 h-5 text-[#3A6B4C]" />,
      title: 'Educational Articles & Regimens',
      desc: 'Read peer-reviewed traditional health wisdom, herbal safety parameters, and enroll in multi-week structured lifestyle programs guided by domain practitioners.',
    },
    {
      icon: <Award className="w-5 h-5 text-[#3A6B4C]" />,
      title: 'Progressive Versioning & Progress Diffs',
      desc: 'Re-assess every few weeks to automatically generate revised plans and review your longitudinal improvements, unchanged habits, and focus areas over time.',
    },
  ];

  return (
    <div className="bg-[#FAF6EB] text-[#163828] space-y-10 sm:space-y-14 pb-20 overflow-x-hidden">
      {/* =========================================================================
          1. HERITAGE HERO SECTION (Matches Reference Composition)
         ========================================================================= */}
      <section
        id="hero-section"
        className="relative bg-gradient-to-b from-[#FAF7EE] via-[#F7F2E4] to-[#F2EDDC] pt-6 sm:pt-9 pb-12 sm:pb-16 overflow-hidden"
      >
        {/* Decorative Botanical Corner Leaves (Left & Right) */}
        <svg
          viewBox="0 0 180 280"
          className="hidden md:block pointer-events-none absolute left-0 top-10 w-24 lg:w-32 text-[#5B7F4F] opacity-75"
          fill="none"
          aria-hidden="true"
        >
          <path d="M-10 110C30 95 62 72 86 40" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 100C28 70 52 55 76 58C60 80 35 94 12 100Z" fill="#8EAD6D" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.2" />
          <path d="M26 112C54 96 86 98 110 116C76 124 48 120 26 112Z" fill="#7C9E5A" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 134C32 130 62 146 78 172C46 168 20 154 4 134Z" fill="#9BB978" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.2" />
          <path d="M-6 178C26 184 52 204 64 232C32 222 10 202 -6 178Z" fill="#89A867" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        <svg
          viewBox="0 0 180 280"
          className="hidden md:block pointer-events-none absolute right-0 top-2 w-24 lg:w-32 text-[#527446] opacity-75"
          fill="none"
          aria-hidden="true"
        >
          <path d="M190 45C150 62 120 90 100 124" stroke="currentColor" strokeWidth="1.6" />
          <path d="M168 58C145 44 115 48 94 66C122 76 148 74 168 58Z" fill="#769A55" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M174 88C144 84 118 98 104 122C132 120 156 108 174 88Z" fill="#8DAE68" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M180 124C156 128 136 146 128 168C154 160 172 144 180 124Z" fill="#6A8F4A" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        {/* Faint Architectural Heritage Silhouette */}
        <svg
          viewBox="0 0 900 180"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-8 w-[760px] max-w-none text-[#DDD6C2] opacity-55"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M80 180V145H110V125C110 110 124 100 130 92C136 100 150 110 150 125V145H190V120H210V100C210 85 225 75 232 66C239 75 254 85 254 100V120H278V145H330V115H352V85C352 62 374 44 385 32C396 44 418 62 418 85V115H446V145H495V112H515V92C515 74 532 62 540 54C548 62 565 74 565 92V112H590V145H645V120H668V104C668 92 680 84 686 78C692 84 704 92 704 104V120H726V145H780V180H80Z" />
        </svg>

        {/* Hero Split Grid */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#DCEAD9] text-[#1D4731] rounded-full text-xs font-medium border border-[#C8DEC4]">
                <Leaf className="w-3.5 h-3.5 text-[#3A6B4C]" />
                <span>India&apos;s Traditional Systems of Wellness</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-serif font-bold text-[#163828] tracking-tight leading-[1.12] text-balance">
                Discover the timeless wisdom of{' '}
                <span className="text-[#3C6E4E]">AYUSH</span> for modern living.
              </h1>

              <p className="text-sm sm:text-base text-[#3D5245] leading-relaxed max-w-xl">
                Explore five traditional systems of Indian healthcare &amp; wellness.
              </p>

              {/* Gold hairline with centered lotus ornament */}
              <div className="flex items-center gap-3 max-w-md pt-1 text-[#C4A459]">
                <span className="h-px flex-1 bg-[#D8C592]" />
                <LotusEmblem className="w-6 h-5 text-[#C4A459]" />
                <span className="h-px flex-1 bg-[#D8C592]" />
              </div>

              {/* Dual Rounded Pill CTAs */}
              <div className="pt-1 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={scrollToBrochure}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#3B6D4E] hover:bg-[#2E573D] active:bg-[#21422D] rounded-full shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A6B4C]"
                >
                  <span>Explore AYUSH</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onOpenAuth || onNavigateToRoles}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#163828] bg-[#FCFBF6]/90 hover:bg-white border border-[#6E8677] rounded-full shadow-2xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A6B4C]"
                >
                  <User className="w-4 h-4 text-[#3A6B4C]" />
                  <span>Sign In / Get Started</span>
                </button>
              </div>
            </div>

            {/* Right Column: Hero Photo Card */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#E2DAC4] bg-[#EAE4D2]">
                <img
                  src={heroWellnessImage}
                  alt="Sunlit wellness sanctuary with rolled natural mat, herbal tea cup, brass vessel, and indoor greenery"
                  referrerPolicy="no-referrer"
                  className="w-full h-[290px] sm:h-[340px] lg:h-[360px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent flex flex-col justify-end p-5 sm:p-7 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full border border-[#D4BC7E]/85 bg-[#163828]/55 flex items-center justify-center shrink-0">
                      <LotusEmblem className="w-5 h-4 text-[#E7CF8C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.14em] text-[#F9F4E5]">
                        India&apos;s Wellness Heritage
                      </p>
                      <div className="mt-1 h-px w-36 bg-[#D4BC7E]/75" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Layered Sage Wave Transition at Bottom of Hero */}
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 w-full h-12 sm:h-16"
          aria-hidden="true"
        >
          <path
            d="M0,36 C280,82 540,8 880,44 C1120,70 1300,26 1440,38 L1440,90 L0,90 Z"
            fill="#E3ECD9"
            fillOpacity="0.7"
          />
          <path
            d="M0,58 C340,18 680,86 1060,46 C1260,26 1360,52 1440,48 L1440,90 L0,90 Z"
            fill="#FAF6EB"
          />
        </svg>
      </section>

      {/* =========================================================================
          2. CENTERPIECE: ROOTED IN INDIAN HERITAGE — THE FIVE PILLARS OF AYUSH
         ========================================================================= */}
      <section className="relative bg-[#FAF6EB] pt-0 pb-16 sm:pb-22 overflow-hidden">
        {/* Right-edge botanical leaves framing the Five Pillars */}
        <svg
          viewBox="0 0 160 220"
          className="hidden lg:block pointer-events-none absolute right-0 top-6 w-28 text-[#527446] opacity-75"
          fill="none"
          aria-hidden="true"
        >
          <path d="M165 30C125 46 98 72 74 106" stroke="currentColor" strokeWidth="1.6" />
          <path d="M148 44C122 36 96 42 78 60C106 68 132 62 148 44Z" fill="#7D9E5A" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M154 74C124 72 98 86 84 110C114 108 138 94 154 74Z" fill="#92B26F" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M158 112C134 116 114 132 104 154C130 148 148 132 158 112Z" fill="#6F934E" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        {/* Bottom-left botanical mortar-and-pestle line-art */}
        <svg
          viewBox="0 0 160 130"
          className="hidden lg:block pointer-events-none absolute left-4 bottom-8 w-36 text-[#6B7F5E] opacity-75 z-10"
          fill="none"
          aria-hidden="true"
        >
          <path d="M52 72C52 94 70 108 92 108C114 108 132 94 132 72H52Z" fill="#ECE6D2" stroke="currentColor" strokeWidth="1.6" />
          <ellipse cx="92" cy="72" rx="40" ry="7" fill="#E3DEC8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M98 70L124 30C127 25 134 27 132 33L110 72" fill="#E9E3CF" stroke="currentColor" strokeWidth="1.5" />
          <path d="M48 92C34 86 22 72 18 56C32 60 44 74 48 92Z" fill="#B6C69C" fillOpacity="0.6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M42 104C26 104 14 96 8 84C22 82 34 90 42 104Z" fill="#9BB17E" fillOpacity="0.55" stroke="currentColor" strokeWidth="1.2" />
        </svg>

        {/* Bottom-right subtle mandala & seated meditation silhouette */}
        <svg
          viewBox="0 0 180 150"
          className="hidden lg:block pointer-events-none absolute right-2 bottom-6 w-40 text-[#DFD5B6] opacity-75 z-10"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="115" cy="75" r="56" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
          <circle cx="115" cy="75" r="40" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="115" cy="60" r="9" fill="#E6DCB8" />
          <path d="M94 98C98 84 106 76 115 76C124 76 132 84 136 98C129 102 101 102 94 98Z" fill="#E6DCB8" />
          <path d="M84 104C98 100 132 100 146 104C138 112 92 112 84 104Z" fill="#E6DCB8" />
        </svg>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-10 sm:w-20 bg-[#D4BC7E]" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] text-[#B08D3E] uppercase">
                Rooted in Indian Heritage
              </span>
              <span className="h-px w-10 sm:w-20 bg-[#D4BC7E]" />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-[38px] font-serif font-bold text-[#163828] leading-tight">
              The Five Pillars of AYUSH
            </h2>

            <p className="text-xs sm:text-sm text-[#3F5548]">
              Discover the richness of India&apos;s traditional systems of wellness.
            </p>
          </div>

          {/* 5-Zone Value Pillars + Center 5-Petal Lotus Mandala */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left 2 Pillars */}
            <div className="lg:col-span-4 grid grid-cols-2 items-start">
              <div className="px-3 sm:px-4 text-center space-y-2.5">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#DCEAD9] text-[#163828] flex items-center justify-center shadow-2xs">
                  <Leaf className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-[#163828]">
                  Ancient Wisdom
                </h3>
                <p className="text-xs text-[#41574A] leading-relaxed">
                  Timeless knowledge for better living.
                </p>
              </div>

              <div className="px-3 sm:px-4 text-center space-y-2.5 border-l border-[#DFD6BE]">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#DCEAD9] text-[#163828] flex items-center justify-center shadow-2xs">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-[#163828]">
                  Holistic Wellness
                </h3>
                <p className="text-xs text-[#41574A] leading-relaxed">
                  Healthy body, peaceful mind.
                </p>
              </div>
            </div>

            {/* Center Interactive 5-Petal AYUSH Lotus Mandala (Symmetrical Radial Petals) */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative w-[330px] h-[325px] sm:w-[360px] sm:h-[350px] select-none">
                {/* Mandala Halo, Secondary Back Petals & Botanical Leaf Sprigs */}
                <svg
                  viewBox="0 0 360 350"
                  className="pointer-events-none absolute inset-0 w-full h-full"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="mandalaGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#F5EED6" stopOpacity="0.95" />
                      <stop offset="70%" stopColor="#FAF6EB" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#FAF6EB" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="180" cy="176" r="154" fill="url(#mandalaGlow)" />
                  <circle cx="180" cy="176" r="138" stroke="#DFD1AA" strokeWidth="1" />

                  {/* Faint alternating outer petals at 36, 108, 180, 252, 324 deg */}
                  {[36, 108, 180, 252, 324].map((deg) => (
                    <g key={deg} transform={`translate(180 176) rotate(${deg})`}>
                      <path
                        d="M0,-142 C24,-118 32,-88 22,-54 C8,-44 -8,-44 -22,-54 C-32,-88 -24,-118 0,-142 Z"
                        fill="#EAE3CA"
                        fillOpacity="0.55"
                        stroke="#DDD2B0"
                        strokeWidth="1"
                      />
                    </g>
                  ))}

                  {/* Botanical Leaf Sprigs */}
                  <g fill="#7A9C4D">
                    <path d="M56 106C44 90 36 82 26 78C40 76 52 84 62 100Z" />
                    <path d="M48 118C32 112 20 112 10 116C22 124 34 126 50 122Z" fill="#92B264" />
                    <path d="M304 106C316 90 324 82 334 78C320 76 308 84 298 100Z" />
                    <path d="M312 118C328 112 340 112 350 116C338 124 326 126 310 122Z" fill="#92B264" />
                    <path d="M62 246C46 250 32 258 24 270C40 268 52 262 64 250Z" />
                    <path d="M50 232C34 226 24 218 18 208C32 210 44 216 54 228Z" fill="#92B264" />
                    <path d="M298 246C314 250 328 258 336 270C320 268 308 262 296 250Z" />
                    <path d="M310 232C326 226 336 218 342 208C328 210 316 216 306 228Z" fill="#92B264" />
                  </g>
                </svg>

                {/* Symmetrical Clickable Petals */}
                {/* 1. A · Ayurveda (Top: 0 deg) */}
                <button
                  type="button"
                  onClick={() => handleSelectMandalaPillar(0)}
                  aria-label="Explore Ayurveda"
                  className="group absolute left-1/2 top-[6px] -translate-x-1/2 w-[124px] h-[132px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163828] rounded-full transition-transform hover:scale-105"
                >
                  <svg viewBox="0 0 120 130" className="absolute inset-0 w-full h-full drop-shadow-sm" aria-hidden="true">
                    <defs>
                      <linearGradient id="petalA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9AB85A" />
                        <stop offset="100%" stopColor="#6D8C34" />
                      </linearGradient>
                    </defs>
                    <path d="M60 4 C96 28 112 64 96 106 C80 122 40 122 24 106 C8 64 24 28 60 4 Z" fill="url(#petalA)" stroke="#7F9F44" strokeWidth="1.2" />
                  </svg>
                  <span className="relative z-10 flex flex-col items-center text-white pb-2">
                    <span className="font-serif font-bold text-xl leading-none">A</span>
                    <span className="text-[11px] font-semibold mt-0.5 tracking-wide">Ayurveda</span>
                    <Leaf className="w-4 h-4 mt-1 opacity-85 text-[#ECF5DA]" />
                  </span>
                </button>

                {/* 2. H · Homoeopathy (Upper Left: -72 deg) */}
                <button
                  type="button"
                  onClick={() => handleSelectMandalaPillar(4)}
                  aria-label="Explore Homoeopathy"
                  className="group absolute left-[6px] top-[78px] w-[128px] h-[126px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163828] rounded-full transition-transform hover:scale-105"
                >
                  <svg viewBox="0 0 130 126" className="absolute inset-0 w-full h-full drop-shadow-sm" aria-hidden="true">
                    <defs>
                      <linearGradient id="petalH" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#F9CC79" />
                        <stop offset="100%" stopColor="#E19A36" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(65 63) rotate(-72)">
                      <path d="M0 -59 C34 -36 49 -2 34 39 C19 54 -19 54 -34 39 C-49 -2 -34 -36 0 -59 Z" fill="url(#petalH)" stroke="#CE8A29" strokeWidth="1.2" />
                    </g>
                  </svg>
                  <span className="relative z-10 flex flex-col items-center text-[#2D200C] pr-2">
                    <span className="font-serif font-bold text-xl leading-none">H</span>
                    <span className="text-[11px] font-semibold mt-0.5">Homoeopathy</span>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mt-1 opacity-80" fill="currentColor" aria-hidden="true">
                      <rect x="9" y="3" width="6" height="3" rx="1" />
                      <path d="M8 7h8l1.5 3v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9L8 7z" fillOpacity="0.85" />
                    </svg>
                  </span>
                </button>

                {/* 3. Y · Yoga & Naturopathy (Upper Right: +72 deg) */}
                <button
                  type="button"
                  onClick={() => handleSelectMandalaPillar(1)}
                  aria-label="Explore Yoga and Naturopathy"
                  className="group absolute right-[6px] top-[78px] w-[128px] h-[126px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163828] rounded-full transition-transform hover:scale-105"
                >
                  <svg viewBox="0 0 130 126" className="absolute inset-0 w-full h-full drop-shadow-sm" aria-hidden="true">
                    <defs>
                      <linearGradient id="petalY" x1="1" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9CD2D9" />
                        <stop offset="100%" stopColor="#5D9FA9" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(65 63) rotate(72)">
                      <path d="M0 -59 C34 -36 49 -2 34 39 C19 54 -19 54 -34 39 C-49 -2 -34 -36 0 -59 Z" fill="url(#petalY)" stroke="#4E8D97" strokeWidth="1.2" />
                    </g>
                  </svg>
                  <span className="relative z-10 flex flex-col items-center text-[#123339] pl-2">
                    <span className="font-serif font-bold text-xl leading-none">Y</span>
                    <span className="text-[10px] font-semibold leading-tight mt-0.5 text-center">
                      Yoga &amp;
                      <br />
                      Naturopathy
                    </span>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 opacity-80" fill="currentColor" aria-hidden="true">
                      <circle cx="12" cy="5.5" r="2.2" />
                      <path d="M7 18c1.2-3.2 2.8-5.5 5-5.5s3.8 2.3 5 5.5c-1.8 1.2-8.2 1.2-10 0z" />
                    </svg>
                  </span>
                </button>

                {/* 4. S · Siddha (Lower Left: -144 deg) */}
                <button
                  type="button"
                  onClick={() => handleSelectMandalaPillar(3)}
                  aria-label="Explore Siddha"
                  className="group absolute left-[42px] bottom-[8px] w-[124px] h-[126px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163828] rounded-full transition-transform hover:scale-105"
                >
                  <svg viewBox="0 0 126 126" className="absolute inset-0 w-full h-full drop-shadow-sm" aria-hidden="true">
                    <defs>
                      <linearGradient id="petalS" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#C89BC0" />
                        <stop offset="100%" stopColor="#94628C" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(63 63) rotate(-144)">
                      <path d="M0 -59 C34 -36 49 -2 34 39 C19 54 -19 54 -34 39 C-49 -2 -34 -36 0 -59 Z" fill="url(#petalS)" stroke="#81527A" strokeWidth="1.2" />
                    </g>
                  </svg>
                  <span className="relative z-10 flex flex-col items-center text-white pt-2">
                    <span className="font-serif font-bold text-xl leading-none">S</span>
                    <span className="text-[11px] font-semibold mt-0.5">Siddha</span>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mt-1 opacity-85" fill="currentColor" aria-hidden="true">
                      <path d="M4 11h16c0 4.4-3.6 8-8 8s-8-3.6-8-8z" />
                      <path d="M8 9c1.5-2 6.5-2 8 0" fillOpacity="0.65" />
                    </svg>
                  </span>
                </button>

                {/* 5. U · Unani (Lower Right: +144 deg) */}
                <button
                  type="button"
                  onClick={() => handleSelectMandalaPillar(2)}
                  aria-label="Explore Unani"
                  className="group absolute right-[42px] bottom-[8px] w-[124px] h-[126px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#163828] rounded-full transition-transform hover:scale-105"
                >
                  <svg viewBox="0 0 126 126" className="absolute inset-0 w-full h-full drop-shadow-sm" aria-hidden="true">
                    <defs>
                      <linearGradient id="petalU" x1="1" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#DC9F70" />
                        <stop offset="100%" stopColor="#AF6B3B" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(63 63) rotate(144)">
                      <path d="M0 -59 C34 -36 49 -2 34 39 C19 54 -19 54 -34 39 C-49 -2 -34 -36 0 -59 Z" fill="url(#petalU)" stroke="#9B5B30" strokeWidth="1.2" />
                    </g>
                  </svg>
                  <span className="relative z-10 flex flex-col items-center text-[#2B170A] pt-2">
                    <span className="font-serif font-bold text-xl leading-none">U</span>
                    <span className="text-[11px] font-semibold mt-0.5">Unani</span>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mt-1 opacity-80" fill="currentColor" aria-hidden="true">
                      <path d="M5 12h14c0 3.9-3.1 7-7 7s-7-3.1-7-7z" />
                      <path d="M13 11l3.5-5 1.8 1.2L15 11z" />
                    </svg>
                  </span>
                </button>

                {/* Center Medallion */}
                <div className="absolute left-1/2 top-[176px] -translate-x-1/2 -translate-y-1/2 w-[112px] h-[112px] rounded-full bg-[#FCF9EE] border-2 border-[#D4BC7E] shadow-md flex flex-col items-center justify-center text-center px-2 z-20">
                  <LotusEmblem className="w-5 h-4 text-[#4C7A58] mb-0.5" />
                  <span className="font-serif font-bold text-lg leading-none text-[#163828] tracking-tight">
                    AYUSH
                  </span>
                  <span className="text-[9px] text-[#41574A] leading-tight mt-0.5 font-medium">
                    India&apos;s Wellness
                    <br />
                    Heritage
                  </span>
                </div>
              </div>
            </div>

            {/* Right 2 Pillars */}
            <div className="lg:col-span-4 grid grid-cols-2 items-start">
              <div className="px-3 sm:px-4 text-center space-y-2.5">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#DCEAD9] text-[#163828] flex items-center justify-center shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-[#163828]">
                  Trusted Tradition
                </h3>
                <p className="text-xs text-[#41574A] leading-relaxed">
                  A legacy of care for generations.
                </p>
              </div>

              <div className="px-3 sm:px-4 text-center space-y-2.5 border-l border-[#DFD6BE]">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#DCEAD9] text-[#163828] flex items-center justify-center shadow-2xs">
                  <LotusEmblem className="w-7 h-6 text-[#163828]" />
                </div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-[#163828]">
                  Better Tomorrow
                </h3>
                <p className="text-xs text-[#41574A] leading-relaxed">
                  Wellness for a healthier India.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Layered Green Herbal Hills Wave Horizon */}
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-0 left-0 w-full h-14 sm:h-20"
          aria-hidden="true"
        >
          <path
            d="M0,45 C320,92 640,18 980,58 C1220,86 1350,48 1440,54 L1440,110 L0,110 Z"
            fill="#DCE7D1"
          />
          <path
            d="M0,66 C260,34 560,96 910,64 C1170,40 1320,76 1440,68 L1440,110 L0,110 Z"
            fill="#5E8B63"
            fillOpacity="0.65"
          />
          <path
            d="M0,84 C360,52 720,104 1090,74 C1280,58 1380,82 1440,78 L1440,110 L0,110 Z"
            fill="#285237"
          />
        </svg>
      </section>

      {/* 2. MANDATORY SAFETY DISCLAIMER BANNER */}
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
        <div className="bg-[#FCFBF6] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E2DAC4] shadow-xs space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3A6B4C]" />
              <span className="text-xs font-bold text-[#B08D3E] uppercase tracking-wider">
                Part A · Introduction to AYUSH
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#163828]">
              What is AYUSH?
            </h2>
            <p className="text-sm sm:text-base text-[#41574A] leading-relaxed">
              <strong>AYUSH</strong> is an acronym representing India’s recognized indigenous, traditional, and complementary systems of healthcare and holistic wellbeing:
            </p>
          </div>

          {/* 5 Acronym Letters Highlight Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-[#FAF6EB] border border-[#E2DAC4] shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] font-serif font-bold text-xl flex items-center justify-center">
                A
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">Ayurveda</h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                The science of life, longevity, and constitutional balance (Doshas &amp; Agni).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF6EB] border border-[#E2DAC4] shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] font-serif font-bold text-lg flex items-center justify-center">
                Y &amp; N
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">Yoga &amp; Naturopathy</h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                Mind-body union, breath control (Pranayama), and five-element nature cure.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF6EB] border border-[#E2DAC4] shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] font-serif font-bold text-xl flex items-center justify-center">
                U
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">Unani</h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                Humoral balance, innate restorative intelligence, and six lifestyle essentials.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF6EB] border border-[#E2DAC4] shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] font-serif font-bold text-xl flex items-center justify-center">
                S
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">Siddha</h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                Ancient Dravidian science of vital energy points (Varmam) and longevity (Kayakalpa).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF6EB] border border-[#E2DAC4] shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] font-serif font-bold text-xl flex items-center justify-center">
                H
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">Homoeopathy</h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                Gentle individualized holistic healing guided by the principle of similars.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#DCEAD9]/55 rounded-2xl border border-[#C3D9BE] text-xs sm:text-sm text-[#1E4730] leading-relaxed">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DCEAD9] rounded-full text-xs font-semibold text-[#1D4731]">
            <span>Part B · About the Five Systems</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#163828]">
            Philosophies &amp; General Approaches
          </h2>
          <p className="text-xs sm:text-sm text-[#41574A] leading-relaxed">
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
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#163828] text-white shadow-sm'
                    : 'bg-[#FCFBF6] text-[#355241] hover:bg-[#EFEAD9] border border-[#D7CEB7]'
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
            <div className="bg-[#FCFBF6] p-6 sm:p-8 lg:p-10 rounded-3xl border border-[#DFD6BE] shadow-sm max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E0CC] pb-6">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-lg bg-[#DCEAD9] text-[#2F593D] font-bold text-xs flex items-center justify-center">
                      {sys.code}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#163828]">
                      {sys.name}
                    </h3>
                  </div>
                  <p className="text-sm font-semibold text-[#3A6B4C] mt-1">
                    {sys.subtitle}
                  </p>
                  <p className="text-xs text-[#5B6F63] mt-0.5">
                    <strong>Tradition:</strong> {sys.heritage}
                  </p>
                </div>

                <div className="px-3.5 py-2 bg-[#F4EFE0] rounded-xl text-xs text-[#355241] border border-[#E2DAC4] max-w-xs">
                  <span className="font-semibold block text-[#163828]">Daily Practice Insight:</span>
                  <span className="text-[11px] leading-relaxed">{sys.practicalInsight}</span>
                </div>
              </div>

              {/* Core Philosophy & General Approach */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start text-xs sm:text-sm text-[#41574A] leading-relaxed">
                {/* Left 7 cols: Philosophy & Approach */}
                <div className="md:col-span-7 space-y-5">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#163828] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#3A6B4C]" />
                      <span>Foundational Health Philosophy</span>
                    </h4>
                    <p className="leading-relaxed text-[#41574A]">
                      {sys.philosophy}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#163828] flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-[#3A6B4C]" />
                      <span>General Lifestyle &amp; Health Approach</span>
                    </h4>
                    <p className="leading-relaxed text-[#41574A]">
                      {sys.generalApproach}
                    </p>
                  </div>
                </div>

                {/* Right 5 cols: Key Pillars */}
                <div className="md:col-span-5 bg-[#FAF6EB] p-5 sm:p-6 rounded-2xl border border-[#E2DAC4] space-y-3.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#163828] flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#B08D3E]" />
                    <span>Four Cornerstones of {sys.name}</span>
                  </h4>

                  <ul className="space-y-2 text-xs text-[#163828]">
                    {sys.keyPillars.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-[#E7E0CC]">
                        <Check className="w-3.5 h-3.5 text-[#3A6B4C] mt-0.5 shrink-0" />
                        <span className="font-medium">{p}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={onOpenAuth || onNavigateToRoles}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#3B6D4E] hover:bg-[#2E573D] rounded-full transition-colors shadow-xs"
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
        <div className="bg-gradient-to-br from-[#FCFBF6] via-[#F7F2E4] to-[#E6EFE0] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#DFD6BE] shadow-xs space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3A6B4C]" />
              <span className="text-xs font-bold text-[#B08D3E] uppercase tracking-wider">
                Part C · AYUSH in India
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#163828]">
              Traditional Health Landscape &amp; Institutional Presence
            </h2>
            <p className="text-sm sm:text-base text-[#41574A] leading-relaxed">
              India has one of the world&apos;s richest, continuously practiced living health traditions, formally recognized, standardized, and nurtured through modern institutional frameworks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-[#FCFBF6] border border-[#E2DAC4] shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">
                Living Cultural Continuum
              </h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                For millennia, Indian households have incorporated classical wellness habits into everyday life—from turmeric and ginger teas to seasonal dining (Ritucharya), morning warm water intake (Ushapan), and daily Surya Namaskar. AYUSH codifies these organic practices into systematic sciences.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-[#FCFBF6] border border-[#E2DAC4] shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">
                Institutional Presence &amp; Education
              </h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                India maintains statutory bodies, National Institutes, state medical councils, and hundreds of accredited medical colleges awarding recognized degrees (such as BAMS, MD/MS Ayurveda, BNYS, BUMS, BSMS, and BHMS) to ensure formal clinical training and patient safety.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-[#FCFBF6] border border-[#E2DAC4] shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] text-[#2F593D] flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#163828]">
                Evidence-Informed Development
              </h3>
              <p className="text-xs text-[#41574A] leading-relaxed">
                Modern clinical studies, pharmacopoeial standardization, botanical research, and global initiatives celebrate traditional healthcare as a preventative pillar alongside modern medicine, emphasizing lifestyle modification for non-communicable challenges.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#DFD6BE] flex flex-wrap items-center justify-between gap-4 text-xs text-[#5B6F63]">
            <span>
              <strong>Note:</strong> AYUSH Wellness Connect supports this ecosystem through independent educational tools and verified practitioner networking.
            </span>
            <span className="font-medium text-[#3A6B4C]">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DCEAD9] rounded-full text-xs font-semibold text-[#1D4731]">
            <span>Part D · What This Platform Offers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#163828]">
            A Comprehensive Digital Lifestyle Platform
          </h2>
          <p className="text-sm sm:text-base text-[#41574A] leading-relaxed">
            AYUSH Wellness Connect translates traditional health science into practical, non-punitive daily support for modern living. Here is what you can experience:
          </p>
        </div>

        {/* 6 Core Feature Offerings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformOfferings.map((off, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-[#FCFBF6] border border-[#E2DAC4] shadow-2xs flex flex-col justify-between space-y-4 hover:border-[#C7BC9F] transition-all group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#DCEAD9] flex items-center justify-center group-hover:scale-105 transition-transform">
                  {off.icon}
                </div>
                <h3 className="font-serif font-bold text-base text-[#163828]">
                  {off.title}
                </h3>
                <p className="text-xs text-[#41574A] leading-relaxed">
                  {off.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-[#ECE5D3]">
                <button
                  type="button"
                  onClick={onOpenAuth || onNavigateToRoles}
                  className="text-xs font-semibold text-[#3A6B4C] hover:text-[#163828] hover:underline flex items-center gap-1"
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
        <div className="bg-[#FAF2DE] rounded-3xl p-6 sm:p-8 lg:p-10 border border-[#DFC996] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-[#8F681B]">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Part E · Important Public Health Disclaimer
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#3D2B07]">
            Educational Wellness Information Only
          </h3>

          <div className="space-y-2.5 text-xs sm:text-sm text-[#574010] leading-relaxed">
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
        <div className="bg-[#163828] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#214E39] text-[#E7C675] rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Begin Your Personal Dinacharya Journey</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold leading-tight">
              Ready to experience personalized AYUSH wellness?
            </h2>

            <p className="text-sm sm:text-base text-[#D7D2C2] leading-relaxed">
              Create a free account to take the complete 20-question lifestyle assessment, unlock your tailored daily Dinacharya schedule, track habits, and connect directly with certified AYUSH doctors.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={onOpenAuth || onNavigateToRoles}
                className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[#163828] bg-[#FAF6EB] hover:bg-white rounded-full shadow-xs transition-colors"
              >
                <span>Sign In / Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onNavigateToRoles}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#23523C] hover:bg-[#2E674C] rounded-full border border-[#3E7B5D] transition-colors"
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
