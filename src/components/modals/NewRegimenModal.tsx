import React, { useState } from 'react';
import { X, Plus, CheckCircle2 } from 'lucide-react';
import { AYUSHDiscipline, WellnessCategory } from '../../types';

interface NewRegimenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRegimen: (regimen: {
    title: string;
    discipline: AYUSHDiscipline;
    category: WellnessCategory;
    durationWeeks: number;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Deepening';
  }) => void;
}

export const NewRegimenModal: React.FC<NewRegimenModalProps> = ({
  isOpen,
  onClose,
  onAddRegimen,
}) => {
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<AYUSHDiscipline>('Ayurveda');
  const [category, setCategory] = useState<WellnessCategory>('Lifestyle Education');
  const [durationWeeks, setDurationWeeks] = useState(3);
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Deepening'>('Beginner');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onAddRegimen({
      title,
      discipline,
      category,
      durationWeeks: Number(durationWeeks),
      level,
      description,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
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
              Practitioner Protocol
            </span>
            <h2 id="regimen-modal-title" className="text-lg font-serif font-bold text-[#1E3F2E]">
              Create Wellness Regimen Template
            </h2>
          </div>
          <button
            onClick={onClose}
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
              <div>
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Regimen Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Post-Pandemic Respiratory Pranayama & Herbal Steam"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    AYUSH Discipline
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value as AYUSHDiscipline)}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  >
                    <option value="Ayurveda">Ayurveda</option>
                    <option value="Yoga & Naturopathy">Yoga & Naturopathy</option>
                    <option value="Unani">Unani</option>
                    <option value="Siddha">Siddha</option>
                    <option value="Homeopathy">Homeopathy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Wellness Focus
                  </label>
                  <select
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
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Duration (Weeks)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                    Participant Level
                  </label>
                  <select
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
                <label className="block text-xs font-semibold text-[#2C4035] mb-1">
                  Clinical Regimen Description & Objectives
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize daily habit sequence, herbal support, and observational milestones..."
                  className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#CCD5CB] bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
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
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publish Regimen Template</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 bg-[#EBF2ED] text-[#2D5A43] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#1E3F2E]">
                Regimen Template Created
              </h3>
              <p className="text-xs text-[#526B5C]">
                "{title}" is now available in your practitioner library to assign to seekers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
