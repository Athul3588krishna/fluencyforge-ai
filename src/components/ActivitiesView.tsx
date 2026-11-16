import { ArrowRight, Headphones, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { LEVEL_NAMES, PICTURE_SCENES, PRACTICE_ACTIVITIES } from '../data/curriculum';
import { PICTURE_SCENE_IMAGES } from '../lib/activityImages';
import type { ActivitySlug } from '../types/fluency';

interface ActivitiesViewProps {
  onStartActivity: (slug: ActivitySlug, pictureSceneId?: 'market' | 'office' | 'station') => void;
}

export function ActivitiesView({ onStartActivity }: ActivitiesViewProps) {
  const [filter, setFilter] = useState<'all' | 'everyday' | 'media' | 'career'>('all');
  const [selectedScene, setSelectedScene] = useState<'market' | 'office' | 'station'>('market');
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const filtered = PRACTICE_ACTIVITIES.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'everyday') {
      return ['self-introduction', 'daily-routine', 'storytelling', 'real-life-conversations'].includes(
        a.slug
      );
    }
    if (filter === 'media') {
      return ['picture-description', 'listen-and-answer', 'vocabulary-challenges'].includes(a.slug);
    }
    return ['interview-simulation', 'group-discussion', 'professional-communication'].includes(
      a.slug
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Practice Activities
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Choose a focused real-world scenario. Each activity launches a tailored AI Teacher
            session with Malayalam feedback.
          </p>
        </div>

        {/* Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          {(
            [
              { id: 'all', label: 'All (10)' },
              { id: 'everyday', label: 'Everyday' },
              { id: 'media', label: 'Visual & Audio' },
              { id: 'career', label: 'Career' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Picture Scene Selector Showcase */}
      {(filter === 'all' || filter === 'media') && (
        <section className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Picture Description Scenes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a scene below to describe it aloud or in writing with your AI Teacher
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartActivity('picture-description', selectedScene)}
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Describe Selected Scene</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PICTURE_SCENES.map((scene) => {
              const isSelected = selectedScene === scene.id;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setSelectedScene(scene.id)}
                  className={`text-left rounded-xl border overflow-hidden transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {!imgErrors[scene.id] ? (
                      <img
                        src={PICTURE_SCENE_IMAGES[scene.id]}
                        alt={scene.title}
                        referrerPolicy="no-referrer"
                        onError={() => setImgErrors((prev) => ({ ...prev, [scene.id]: true }))}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                        {scene.title}
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {scene.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {scene.caption}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 10 Activities Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((act) => (
          <div
            key={act.slug}
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Recommended: Level {act.recommendedLevel} ({LEVEL_NAMES[act.recommendedLevel]}) ·{' '}
                {act.focusSkills.join(' / ')}
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {act.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {act.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                {act.mode === 'listening' ? (
                  <>
                    <Headphones className="w-3.5 h-3.5" />
                    Audio Listen &amp; Reply
                  </>
                ) : act.mode === 'picture' ? (
                  <>
                    <ImageIcon className="w-3.5 h-3.5" />
                    Visual Scene Prompt
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3.5 h-3.5" />
                    Voice &amp; Text Coaching
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() =>
                  onStartActivity(
                    act.slug,
                    act.slug === 'picture-description' ? selectedScene : undefined
                  )
                }
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Start Activity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
