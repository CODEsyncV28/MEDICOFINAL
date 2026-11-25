import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, AlertCircle, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { AYUSHDiscipline, WellnessCategory, Practitioner } from '../../types';
import { WellnessProgramDocument } from '../../types/firebase';
import { saveOrSubmitProgram } from '../../services/programService';

interface NewRegimenModalProps {
  isOpen: boolean;
  onClose: () => void;
  practitioner: Practitioner;
  onSaved?: (savedProgram: WellnessProgramDocument) => void;
}

export const NewRegimenModal: React.FC<NewRegimenModalProps> = ({
  isOpen,
  onClose,
  practitioner,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<AYUSHDiscipline>('Ayurveda');
  const [category, setCategory] = useState<WellnessCategory>('Lifestyle Education');
  const [durationWeeks, setDurationWeeks] = useState(3);
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Deepening'>('Beginner');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedProgram, setSavedProgram] = useState<WellnessProgramDocument | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDiscipline(practitioner.discipline || 'Ayurveda');
      setCategory('Lifestyle Education');
      setDurationWeeks(3);
      setLevel('Beginner');
      setDescription('');
      setErrorMsg(null);
      setIsSaving(false);
      setSavedProgram(null);
    }
  }, [isOpen, practitioner.discipline]);

  if (!isOpen) return null;

  const handleSave = async (submitForReview: boolean) => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const saved = await saveOrSubmitProgram({
        title,
        discipline,
        category,
        durationWeeks: Number(durationWeeks),
        level,
        description,
        creatorPractitionerId: practitioner.id,
        practitionerName: practitioner.name,
        practitionerTitle: practitioner.qualification,
        submitForReview,
      });

      setSavedProgram(saved);
      onSaved?.(saved);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save wellness programme template.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="regimen-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FAFAF7] w-full max-w-lg rounded-2xl border border-[#D9DFD8] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E8E3] bg-white flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#2D5A43] uppercase tracking-wider">
              Practitioner Protocol · {practitioner.name}
            </span>
            <h2 id="regimen-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
              Create Wellness Regimen Template
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!savedProgram ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(true);
              }}
              noValidate
              className="space-y-4"
            >
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-[#FDF2F0] border border-[#ECC8C1] text-xs text-[#9B2C1B] font-medium flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="new-regimen-title"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Regimen Title *
                </label>
                <input
                  id="new-regimen-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Seasonal Agni & Mindful Meal Rhythm"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-regimen-discipline"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    AYUSH Discipline
                  </label>
                  <select
                    id="new-regimen-discipline"
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value as AYUSHDiscipline)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  >
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Yoga & Naturopathy">Yoga &amp; Naturopathy</option>
                    <option value="Unani">Unani</option>
                    <option value="Siddha">Siddha</option>
                    <option value="Homeopathy">Homeopathy</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-regimen-category"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Wellness Focus
                  </label>
                  <select
                    id="new-regimen-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WellnessCategory)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  >
                    <option value="Lifestyle Education">Lifestyle Education</option>
                    <option value="Yoga">Yoga</option>
                    <option value="Nutrition">Nutrition</option>
                    <option value="Meditation">Meditation</option>
                    <option value="Ayurveda">Ayurveda</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-regimen-weeks"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Duration (Weeks)
                  </label>
                  <input
                    id="new-regimen-weeks"
                    type="number"
                    min={1}
                    max={52}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-regimen-level"
                    className="block text-xs font-semibold text-[#2C4035] mb-1"
                  >
                    Participant Level
                  </label>
                  <select
                    id="new-regimen-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Deepening">Deepening</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-regimen-description"
                  className="block text-xs font-semibold text-[#2C4035] mb-1"
                >
                  Clinical Regimen Description &amp; Objectives *
                </label>
                <textarea
                  id="new-regimen-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize daily habit sequence, herbal support, and non-diagnostic observational milestones..."
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="p-3 bg-[#F0F5F1] rounded-lg border border-[#CCDCD2] text-xs text-[#234B36] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2D5A43] shrink-0 mt-0.5" />
                <span>
                  <strong>Governance Workflow:</strong> Regimens saved as <em>Draft</em> remain private to your workspace. Submitting routes the curriculum to the Administrator Governance queue before any public release.
                </span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1E3F2E] bg-white hover:bg-[#F2F6F3] border border-[#CCD5CB] rounded-lg transition-colors disabled:opacity-60"
                >
                  <FileText className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span>Save as Draft</span>
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors shadow-xs disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit for Admin Approval</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-[#EBF2ED] text-[#2D5A43] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg text-[#1E3F2E]">
                  {savedProgram.status === 'pending_approval'
                    ? 'Regimen Submitted for Admin Review'
                    : 'Regimen Saved as Draft'}
                </h3>
                <p className="text-xs text-[#526B5C] max-w-sm mx-auto leading-relaxed">
                  <strong>&ldquo;{savedProgram.title}&rdquo;</strong> ({savedProgram.durationWeeks}{' '}
                  Weeks · {savedProgram.level}) has been saved to your practitioner workspace with
                  status{' '}
                  <span className="font-semibold text-[#1E3F2E]">
                    {savedProgram.status === 'pending_approval' ? 'Pending Approval' : 'Draft'}
                  </span>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] rounded-lg transition-colors"
              >
                Return to Practitioner Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
