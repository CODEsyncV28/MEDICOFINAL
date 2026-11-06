import React, { useState } from 'react';
import { X, Send, Calendar, Clock, CheckCircle2, UserCheck } from 'lucide-react';
import { Practitioner } from '../../types';

interface ConsultationModalProps {
  isOpen: boolean;
  practitioner: Practitioner;
  onClose: () => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  practitioner,
  onClose,
}) => {
  const [topic, setTopic] = useState('circadian-routine');
  const [preferredSlot, setPreferredSlot] = useState('morning');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FAFAF7] w-full max-w-lg rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
              Practitioner Connection
            </span>
            <h2 id="consult-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
              Consultation & Regimen Review
            </h2>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 bg-white rounded-xl border border-[#E4E8E3] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBF2ED] text-[#2D5A43] flex items-center justify-center font-serif font-bold text-base">
                  AS
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-[#1E3F2E]">{practitioner.name}</p>
                  <p className="text-xs text-[#526B5C]">{practitioner.qualification}</p>
                  <p className="text-[11px] text-[#2D5A43] font-medium">{practitioner.specialization}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1.5">
                  Consultation Focus Area
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                >
                  <option value="circadian-routine">Circadian Routine & Sleep Hygiene (Dinacharya)</option>
                  <option value="digestive-fire">Digestive Rhythm & Food Sensitivities (Agni)</option>
                  <option value="postural-yoga">Postural Breathwork & Ergonomic Movement</option>
                  <option value="seasonal-transition">Seasonal Diet & Herbal Tea Adjustment</option>
                  <option value="general-review">Overall Lifestyle Assessment Review</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1.5">
                  Preferred Time Window
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredSlot('morning')}
                    className={`py-2 px-3 text-xs rounded-lg border text-center transition-colors ${
                      preferredSlot === 'morning'
                        ? 'border-[#2D5A43] bg-[#EBF2ED] text-[#1E3F2E] font-semibold'
                        : 'border-[#CCD5CB] bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Morning (8-11 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredSlot('afternoon')}
                    className={`py-2 px-3 text-xs rounded-lg border text-center transition-colors ${
                      preferredSlot === 'afternoon'
                        ? 'border-[#2D5A43] bg-[#EBF2ED] text-[#1E3F2E] font-semibold'
                        : 'border-[#CCD5CB] bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Afternoon (1-4 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredSlot('evening')}
                    className={`py-2 px-3 text-xs rounded-lg border text-center transition-colors ${
                      preferredSlot === 'evening'
                        ? 'border-[#2D5A43] bg-[#EBF2ED] text-[#1E3F2E] font-semibold'
                        : 'border-[#CCD5CB] bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Evening (5-7 PM)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1.5">
                  Self-Observation Note (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share any patterns you noticed this week (e.g., wake-up energy, tea response)..."
                  rows={3}
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Consultation Request</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-[#EBF2ED] text-[#2D5A43] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-[#1E3F2E]">
                  Request Sent to {practitioner.name}
                </h3>
                <p className="text-xs text-[#526B5C] max-w-sm mx-auto leading-relaxed">
                  Your self-observation and schedule preference have been logged for this preview session. In the full platform, your verified doctor confirms virtual appointments via secure video.
                </p>
              </div>
              <div className="p-3 bg-white border border-[#E4E8E3] rounded-xl text-xs text-[#3E5547] text-left space-y-1">
                <p><strong>Scheduled Slot:</strong> Next available slot (Tomorrow at 10:30 AM)</p>
                <p><strong>Focus:</strong> Circadian Routine & Sleep Hygiene</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="w-full py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
