import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  FileText,
  Clock,
  Compass,
  Check,
} from 'lucide-react';
import {
  EXPANDED_ASSESSMENT_QUESTIONS,
  ASSESSMENT_CATEGORIES,
} from '../../data/assessmentQuestions';
import { ExpandedAssessmentQuestion, QuestionOption } from '../../types/assessment';
import { calculateAssessmentSummary } from '../../utils/lifestyleLogic';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (answers: Record<string, string>, categoryNotes?: Record<string, string>) => void;
  initialAnswers?: Record<string, string>;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialAnswers = {},
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [categoryNotes, setCategoryNotes] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showSectionIntro, setShowSectionIntro] = useState(false);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAnswers(initialAnswers || {});
      setCurrentQuestionIndex(0);
      setIsFinished(false);
      setShowSectionIntro(false);
    }
  }, [isOpen, initialAnswers]);

  if (!isOpen) return null;

  const totalQuestions = EXPANDED_ASSESSMENT_QUESTIONS.length;
  const currentQ: ExpandedAssessmentQuestion = EXPANDED_ASSESSMENT_QUESTIONS[currentQuestionIndex];
  const currentCatInfo = ASSESSMENT_CATEGORIES.find((c) => c.id === currentQ.category);

  // Group questions by category to know question indices within category
  const currentCategoryQuestions = EXPANDED_ASSESSMENT_QUESTIONS.filter(
    (q) => q.category === currentQ.category
  );
  const indexWithinCategory = currentCategoryQuestions.findIndex((q) => q.id === currentQ.id) + 1;

  // Completion calculation
  const answeredCount = Object.keys(answers).filter((k) => !!answers[k]).length;
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100);

  const handleSelectOption = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handleNoteChange = (text: string) => {
    setCategoryNotes((prev) => ({ ...prev, [currentQ.category]: text }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const nextQ = EXPANDED_ASSESSMENT_QUESTIONS[nextIndex];
      // If moving to a new category, optionally show brief category transition
      if (nextQ.category !== currentQ.category) {
        // category boundary crossed
      }
      setCurrentQuestionIndex(nextIndex);
    } else {
      setIsFinished(true);
      onComplete(answers, categoryNotes);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpToCategory = (catId: string) => {
    const firstQIdx = EXPANDED_ASSESSMENT_QUESTIONS.findIndex((q) => q.category === catId);
    if (firstQIdx !== -1) {
      setCurrentQuestionIndex(firstQIdx);
    }
  };

  const summary = calculateAssessmentSummary(answers);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-[#FAFAF7] w-full max-w-3xl rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
                Lifestyle & Dinacharya Assessment
              </span>
              <span className="text-[10px] bg-[#EBF2ED] text-[#224A34] px-2 py-0.5 rounded-full font-bold">
                20 Questions · 8 Dimensions
              </span>
            </div>
            <h2 id="assessment-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
              {isFinished
                ? 'Your Comprehensive Lifestyle Rhythm Profile'
                : `Section ${currentCatInfo?.order || 1} of 8: ${currentCatInfo?.name}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8-Category Mini Stepper Bar */}
        {!isFinished && (
          <div className="bg-[#F4F6F2] border-b border-[#E3E8E2] px-6 py-2 overflow-x-auto flex items-center gap-2 text-xs">
            {ASSESSMENT_CATEGORIES.map((cat) => {
              const catQs = EXPANDED_ASSESSMENT_QUESTIONS.filter((q) => q.category === cat.id);
              const answeredInCat = catQs.filter((q) => !!answers[q.id]).length;
              const isCurrentCat = cat.id === currentQ.category;
              const isCatComplete = answeredInCat === catQs.length;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleJumpToCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all ${
                    isCurrentCat
                      ? 'bg-[#2D5A43] text-white shadow-xs'
                      : isCatComplete
                      ? 'bg-[#E5ECE7] text-[#234834]'
                      : 'bg-white/80 text-[#556F5E] hover:bg-white'
                  }`}
                  title={`${cat.name} (${answeredInCat}/${catQs.length})`}
                >
                  {isCatComplete ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] opacity-75">{cat.order}.</span>
                  )}
                  <span>{cat.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Continuous Progress Indicator */}
        <div className="w-full bg-[#E5EDE7] h-1.5">
          <div
            className="bg-[#2D5A43] h-1.5 transition-all duration-300"
            style={{ width: `${isFinished ? 100 : Math.max(5, progressPercentage)}%` }}
          />
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!isFinished ? (
            <div className="space-y-6">
              {/* Category Breadcrumb & Pillar Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAF0EB] pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[#2D5A43]">
                    {currentCatInfo?.name}
                  </span>
                  <span className="text-[#849C8C]">·</span>
                  <span className="text-[#597464] italic">
                    {currentCatInfo?.traditionalPillar}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#526B5C]">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                  <span className="text-slate-400 font-normal"> ({indexWithinCategory} of {currentCategoryQuestions.length} in section)</span>
                </div>
              </div>

              {/* Question Headline */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#142A1E] leading-snug">
                  {currentQ.question}
                </h3>
                {currentQ.subtitle && (
                  <p className="text-xs text-[#526B5C] leading-relaxed">
                    {currentQ.subtitle}
                  </p>
                )}
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {currentQ.options.map((option: QuestionOption) => {
                  const selected = answers[currentQ.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectOption(option.value)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selected
                          ? 'border-[#2D5A43] bg-[#EBF2ED]/80 shadow-xs ring-1 ring-[#2D5A43]'
                          : 'border-[#E3E8E2] bg-white hover:border-[#CCD5CB] hover:bg-[#F9FAF8]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <p className={`font-semibold text-sm ${selected ? 'text-[#1E3F2E]' : 'text-slate-800'}`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-[#526B5C] leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            selected
                              ? 'border-[#2D5A43] bg-[#2D5A43] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional Note field if question is last in section or has note prompt */}
              {currentQ.optionalNotePrompt && (
                <div className="p-4 rounded-xl bg-white border border-[#E3E8E2] space-y-2">
                  <label
                    htmlFor={`note-${currentQ.category}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A43]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Optional Observation for this Section:</span>
                  </label>
                  <p className="text-[11px] text-[#526B5C]">
                    {currentQ.optionalNotePrompt}
                  </p>
                  <textarea
                    id={`note-${currentQ.category}`}
                    rows={2}
                    value={categoryNotes[currentQ.category] || ''}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="Enter any brief subjective observations (e.g., wake early on weekends, seasonal shifts)..."
                    className="w-full text-xs p-2.5 rounded-lg border border-[#D5DFD7] focus:outline-none focus:ring-1 focus:ring-[#2D5A43] bg-[#FAFBF9]"
                  />
                </div>
              )}

              {/* Educational Scope Notice */}
              <div className="bg-[#F4F6F2] p-3 rounded-lg border border-[#E1E7DF] flex items-center gap-2 text-xs text-[#455D4E]">
                <AlertCircle className="w-4 h-4 text-[#2D5A43] shrink-0" />
                <span>
                  Responses generate an educational self-care Dinacharya plan. Not a clinical diagnosis or medical prescription.
                </span>
              </div>
            </div>
          ) : (
            /* Completed Screen with Multi-Category Insights */
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#EBF2ED] text-[#2D5A43] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-[#1E3F2E]">
                  Comprehensive Assessment Complete!
                </h3>
                <p className="text-xs sm:text-sm text-[#526B5C] max-w-lg mx-auto">
                  Your 20-question lifestyle profile across all 8 dimensions has been saved. A revised, personalized AYUSH Wellness Plan has been generated and activated.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-[#E4E8E3] space-y-1">
                  <span className="text-[11px] text-[#526B5C] uppercase font-semibold">Constitutional Tendency</span>
                  <p className="font-serif font-bold text-[#1E3F2E] text-base">{summary.constitutionTendency}</p>
                  <p className="text-xs text-[#6B7D72]">Evaluated across 8 circadian and metabolic vectors</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E4E8E3] space-y-1">
                  <span className="text-[11px] text-[#526B5C] uppercase font-semibold">Circadian & Agni Rhythm</span>
                  <p className="font-serif font-bold text-[#1E3F2E] text-base">{summary.circadianBalanceCategory}</p>
                  <p className="text-xs text-[#6B7D72]">{summary.digestiveAgniCategory}</p>
                </div>
              </div>

              <div className="p-4 bg-[#EBF2ED] rounded-xl border border-[#D5E1D8] space-y-2 text-xs text-[#2A4837]">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#2D5A43]" />
                  <span>Revised Wellness Plan Generated:</span>
                </p>
                <p>
                  Your daily routine (Dinacharya), morning & evening habits, sleep suggestions, meal timing, and weekly goals have been tailored to your latest answers. All past assessment records and plans remain preserved in your history.
                </p>
                <p className="text-[11px] text-[#446653] italic pt-1 border-t border-[#CCE0D3]">
                  {summary.guidanceNote}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-[#E4E8E3] bg-white flex items-center justify-between">
          {!isFinished ? (
            <>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className={`inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  currentQuestionIndex === 0
                    ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                    : 'border-[#CCD5CB] text-[#1E3F2E] hover:bg-[#F4F6F2]'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="hidden sm:block text-xs text-[#526B5C]">
                {answeredCount} of {totalQuestions} answered
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!answers[currentQ.id]}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                  !answers[currentQ.id]
                    ? 'opacity-50 cursor-not-allowed bg-slate-400'
                    : 'bg-[#2D5A43] hover:bg-[#234835]'
                }`}
              >
                <span>{currentQuestionIndex === totalQuestions - 1 ? 'Generate Wellness Plan' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors"
            >
              Close & View Active Wellness Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
