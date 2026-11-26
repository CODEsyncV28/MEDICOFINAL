import React, { useEffect, useRef, useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Practitioner } from '../../types';
import { ConsultationDocument } from '../../types/firebase';
import {
  CONSULTATION_TOPICS,
  PREFERRED_SLOTS,
  createConsultationRequest,
  getConsultationTopicLabel,
  getPreferredSlotLabel,
  validateConsultationInput,
} from '../../services/consultationService';

import { isFirebaseConfigured } from '../../lib/firebase';

interface ConsultationModalProps {
  isOpen: boolean;
  practitioner: Practitioner | null;
  seekerUid: string;
  seekerName: string;
  onClose: () => void;
  onCreated?: (consultation: ConsultationDocument) => void;
}

function getDefaultPreferredDate(): string {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0];
}

function getPractitionerInitials(name: string): string {
  const cleaned = name.replace(/^Dr\.\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  practitioner,
  seekerUid,
  seekerName,
  onClose,
  onCreated,
}) => {
  const [topic, setTopic] = useState<string>(CONSULTATION_TOPICS[0].value);
  const [preferredDate, setPreferredDate] = useState<string>(getDefaultPreferredDate);
  const [preferredSlot, setPreferredSlot] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdRecord, setCreatedRecord] = useState<ConsultationDocument | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setTopic(CONSULTATION_TOPICS[0].value);
      setPreferredDate(getDefaultPreferredDate());
      setPreferredSlot('morning');
      setNotes('');
      setValidationError(null);
      setCreatedRecord(null);
      setIsSubmitting(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen || !practitioner) return null;

  const handleClose = () => {
    setValidationError(null);
    setCreatedRecord(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const check = validateConsultationInput({
      userId: seekerUid,
      practitionerId: practitioner.id,
      topic,
      preferredDate,
      preferredSlot,
    });

    if (!check.isValid) {
      setValidationError(check.message || 'Please complete all required consultation fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createConsultationRequest({
        userId: seekerUid,
        userName: seekerName || 'Wellness Seeker',
        practitionerId: practitioner.id,
        practitionerName: practitioner.name,
        topic,
        preferredDate,
        preferredSlot,
        notes,
      });

      setCreatedRecord(created);
      onCreated?.(created);
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to save your consultation request.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FAFAF7] w-full max-w-lg rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
              Practitioner Connection
            </span>
            <h2 id="consult-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
              Consultation & Regimen Review
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!createdRecord ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="p-3.5 bg-white rounded-xl border border-[#E4E8E3] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EBF2ED] text-[#2D5A43] flex items-center justify-center font-serif font-bold text-base shrink-0">
                  {getPractitionerInitials(practitioner.name)}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-[#1E3F2E]">{practitioner.name}</p>
                  <p className="text-xs text-[#526B5C]">{practitioner.qualification}</p>
                  <p className="text-[11px] text-[#2D5A43] font-medium">{practitioner.specialization}</p>
                </div>
              </div>

              {validationError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="consult-topic"
                  className="block text-xs font-semibold text-[#2C4035] mb-1.5"
                >
                  Consultation Focus Area <span className="text-[#A64B2A]">*</span>
                </label>
                <select
                  id="consult-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                >
                  {CONSULTATION_TOPICS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="consult-preferred-date"
                  className="block text-xs font-semibold text-[#2C4035] mb-1.5"
                >
                  Preferred Date <span className="text-[#A64B2A]">*</span>
                </label>
                <input
                  id="consult-preferred-date"
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-[#2C4035] mb-1.5">
                  Preferred Time Window <span className="text-[#A64B2A]">*</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PREFERRED_SLOTS.map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setPreferredSlot(slot.value)}
                      className={`py-2 px-3 text-xs rounded-lg border text-center transition-colors ${
                        preferredSlot === slot.value
                          ? 'border-[#2D5A43] bg-[#EBF2ED] text-[#1E3F2E] font-semibold'
                          : 'border-[#CCD5CB] bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="consult-notes"
                  className="block text-xs font-semibold text-[#2C4035] mb-1.5"
                >
                  Self-Observation Note (Optional)
                </label>
                <textarea
                  id="consult-notes"
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
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] disabled:opacity-60 rounded-lg transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? 'Sending...' : 'Send Consultation Request'}</span>
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
                  Request Sent to {createdRecord.practitionerName}
                </h3>
                <p className="text-xs text-[#526B5C] max-w-sm mx-auto leading-relaxed">
                  {isFirebaseConfigured
                    ? `Your consultation request has been saved to Cloud Firestore and added to ${createdRecord.practitionerName}'s consultation inbox.`
                    : `Your consultation request has been saved to Local Persistent Demo Storage and added to ${createdRecord.practitionerName}'s consultation inbox.`}
                </p>
              </div>
              <div className="p-3.5 bg-white border border-[#E4E8E3] rounded-xl text-xs text-[#3E5547] text-left space-y-1.5">
                <p>
                  <strong>Request ID:</strong>{' '}
                  <span className="font-mono text-[11px]">{createdRecord.id}</span>
                </p>
                <p>
                  <strong>Focus:</strong>{' '}
                  {createdRecord.topicLabel || getConsultationTopicLabel(createdRecord.topic)}
                </p>
                <p>
                  <strong>Preferred Date &amp; Window:</strong>{' '}
                  {createdRecord.preferredDate} · {getPreferredSlotLabel(createdRecord.preferredSlot)}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className="inline-block px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold text-[11px]">
                    Pending Practitioner Review
                  </span>
                </p>
                {createdRecord.notes && (
                  <p>
                    <strong>Your Note:</strong> &ldquo;{createdRecord.notes}&rdquo;
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
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
