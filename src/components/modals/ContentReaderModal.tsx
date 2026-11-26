import React from 'react';
import { X, BookOpen, Clock, UserCheck, ShieldCheck } from 'lucide-react';
import { EducationalArticle } from '../../types';

interface ContentReaderModalProps {
  article: EducationalArticle | null;
  onClose: () => void;
}

export const ContentReaderModal: React.FC<ContentReaderModalProps> = ({ article, onClose }) => {
  if (!article) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-[#F8FAFC] w-full max-w-3xl rounded-2xl border border-[#CBD5E1] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] bg-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span className="font-semibold text-[#0284C7]">{article.discipline}</span>
              <span>·</span>
              <span>{article.category}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {article.readTime}
              </span>
            </div>
            <h2 id="reader-modal-title" className="text-xl sm:text-2xl font-serif font-bold text-[#0F172A] leading-snug">
              {article.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Close reader"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Author / Reviewer bar */}
        <div className="px-6 py-3 bg-[#F1F5F9] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#475569]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#0284C7]" />
            <span>
              Authored by <strong className="text-[#0F172A]">{article.author}</strong> ({article.authorQualification})
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Peer-Reviewed Educational Material ({article.reviewedDate})</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-[#0F172A] leading-relaxed">
          {/* Summary Callout */}
          <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] text-sm text-[#475569] italic">
            "{article.summary}"
          </div>

          {/* Full content parsed into paragraphs */}
          <div className="space-y-4 text-sm sm:text-base leading-relaxed">
            {article.fullContent.split('\n\n').map((para, i) => (
              <p key={i} className="text-[#0F172A]">
                {para}
              </p>
            ))}
          </div>

          {/* Key Takeaways */}
          <div className="p-5 bg-[#CCFBF1]/45 rounded-xl border border-[#99F6E4] space-y-3">
            <h3 className="text-xs font-bold text-[#0F766E] uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0D9488]" />
              Core Lifestyle Principles
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#0F172A]">
              {article.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] mt-2 shrink-0" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex items-center justify-between">
          <p className="text-xs text-[#64748B]">
            For personalized regimen questions, consult with your assigned practitioner.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors"
          >
            Done Reading
          </button>
        </div>
      </div>
    </div>
  );
};
