import {
  AlertCircle,
  Check,
  CheckCircle2,
  History,
  Loader2,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LEARNING_LEVELS, PICTURE_SCENES } from '../data/curriculum';
import { PICTURE_SCENE_IMAGES } from '../lib/activityImages';
import { apiRequest } from '../lib/api';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakEnglishText,
  stopSpeaking,
} from '../lib/speech';
import type { ChatMessage, TaskProgressRecord, UserProfile } from '../types/fluency';
import { WaveformBar } from './WaveformBar';

export interface ActiveSession {
  id: string;
  title: string;
  mode: string;
  taskId: string | null;
  activitySlug: string | null;
  pictureSceneId: string | null;
  messages: ChatMessage[];
  turns: number;
  correctTurns: number;
  speakingSeconds: number;
  updatedAt: string;
}

interface AITeacherWorkspaceProps {
  user: UserProfile;
  session: ActiveSession | null;
  sessionsList: ActiveSession[];
  taskProgress: TaskProgressRecord[];
  onSessionChange: (session: ActiveSession) => void;
  onUserUpdated: (user: UserProfile, taskProgress?: TaskProgressRecord[]) => void;
  onStartNewFreeChat: () => void;
  onSwitchPictureScene: (sceneId: 'market' | 'office' | 'station') => void;
}

export function AITeacherWorkspace({
  session,
  sessionsList,
  taskProgress,
  onSessionChange,
  onUserUpdated,
  onStartNewFreeChat,
  onSwitchPictureScene,
}: AITeacherWorkspaceProps) {
  const [draft, setDraft] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(0.95);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [inspectedMsgId, setInspectedMsgId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [taskBanner, setTaskBanner] = useState<string | null>(null);
  const [sceneImgError, setSceneImgError] = useState(false);

  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const speechAvailable = isSpeechRecognitionSupported();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages?.length]);

  useEffect(() => {
    setSceneImgError(false);
  }, [session?.pictureSceneId]);

  useEffect(() => {
    if (!session?.messages?.length) {
      setInspectedMsgId(null);
      return;
    }
    const lastCorrected = [...session.messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.correction);
    setInspectedMsgId(lastCorrected?.id || null);
  }, [session?.id, session?.messages?.length]);

  useEffect(() => {
    return () => {
      cleanupMic();
      stopSpeaking();
    };
  }, []);

  function cleanupMic() {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMicStream(null);
    setRecording(false);
  }

  const startRecording = async () => {
    setMicError(null);
    if (!speechAvailable) {
      setMicError(
        'Browser speech recognition is unavailable here. You can type your English response directly below.'
      );
      return;
    }

    const existingDraft = draft.trim();
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicStream(stream);
      }
    } catch {
      setMicError(
        'Microphone access was blocked or unavailable. Please allow microphone permissions or use the text editor.'
      );
      return;
    }

    const recognizer = createSpeechRecognizer({
      onTranscript: (finalText, interimText) => {
        const nextText = [existingDraft, finalText, interimText].filter(Boolean).join(' ').trim();
        setDraft(nextText);
        setInputMode('voice');
      },
      onError: (msg) => {
        setMicError(msg);
        cleanupMic();
      },
      onEnd: () => {
        cleanupMic();
      },
    });

    if (!recognizer) {
      cleanupMic();
      setMicError('Speech recognition is not supported in this browser.');
      return;
    }

    recognizerRef.current = recognizer;
    setRecordSeconds(0);
    setRecording(true);
    setInputMode('voice');
    timerRef.current = window.setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
    recognizer.start();
  };

  const stopRecording = () => {
    cleanupMic();
  };

  const handlePlayTTS = (id: string, text: string) => {
    if (speakingMessageId === id) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }
    speakEnglishText(text, {
      rate: speechRate,
      onStart: () => setSpeakingMessageId(id),
      onEnd: () => setSpeakingMessageId(null),
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!session || !draft.trim() || sending) return;
    if (recording) cleanupMic();

    setSendError(null);
    setTaskBanner(null);
    setSending(true);
    const textToSend = draft.trim();
    const spokenDuration = recordSeconds > 0 ? recordSeconds : undefined;

    try {
      const res = await apiRequest<{
        session: ActiveSession;
        user: UserProfile;
        taskUpdate: { unlockedNextTaskId: string | null; levelUpTo: number | null };
        taskProgress: TaskProgressRecord[];
      }>('/api/chat/turn', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: session.id,
          message: textToSend,
          inputMode,
          speakingSeconds: spokenDuration,
        }),
      });

      onSessionChange(res.session);
      onUserUpdated(res.user, res.taskProgress);
      setDraft('');
      setRecordSeconds(0);
      setInputMode('text');

      if (res.taskUpdate?.levelUpTo) {
        setTaskBanner(
          `Level Up! You completed the required turns and unlocked Level ${res.taskUpdate.levelUpTo}.`
        );
      } else if (res.taskUpdate?.unlockedNextTaskId) {
        setTaskBanner('Lesson completed! The next task in your Learning Journey is now unlocked.');
      }
    } catch (err: any) {
      setSendError(err?.message || 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleMarkRepeated = async (msg: ChatMessage) => {
    if (!session || !msg.correction) return;
    try {
      await apiRequest('/api/chat/mark-repeated', {
        method: 'POST',
        body: JSON.stringify({ sessionId: session.id, messageId: msg.id }),
      });
      const updatedMessages = session.messages.map((m) =>
        m.id === msg.id ? { ...m, repeatCompleted: true } : m
      );
      onSessionChange({ ...session, messages: updatedMessages });
    } catch {
      // ignore non-critical error
    }
  };

  const inspectedMessage =
    session?.messages.find((m) => m.id === inspectedMsgId) ||
    [...(session?.messages || [])].reverse().find((m) => m.role === 'assistant' && m.correction) ||
    null;

  const activeTask = session?.taskId
    ? LEARNING_LEVELS.flatMap((l) => l.tasks).find((t) => t.id === session.taskId)
    : null;
  const activeTaskProgress = session?.taskId
    ? taskProgress.find((p) => p.taskId === session.taskId)
    : null;

  const activeScene =
    session?.activitySlug === 'picture-description'
      ? PICTURE_SCENES.find((s) => s.id === session.pictureSceneId) || PICTURE_SCENES[0]
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left/Center Conversation Canvas */}
      <div className="lg:col-span-7 xl:col-span-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl flex flex-col min-h-[640px] max-h-[calc(100vh-11rem)]">
        {/* Session Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
              {session?.title || 'AI English Teacher'}
            </h2>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {activeTask
                ? `Task Progress: ${activeTaskProgress?.turnsCompleted || 0}/${activeTask.requiredTurns} turns · Focus: ${activeTask.grammarFocus}`
                : `${session?.turns || 0} turns practiced · Voice & Text`}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setSpeechRate(0.8)}
                className={`px-2 py-1 rounded cursor-pointer font-mono ${
                  speechRate === 0.8
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                0.8x
              </button>
              <button
                type="button"
                onClick={() => setSpeechRate(0.95)}
                className={`px-2 py-1 rounded cursor-pointer font-mono ${
                  speechRate === 0.95
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                1.0x
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <button
              type="button"
              onClick={onStartNewFreeChat}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Collapsible Session History Bar */}
        {showHistory && (
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 max-h-48 overflow-y-auto space-y-1.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Recent Conversations
            </div>
            {sessionsList.length === 0 ? (
              <p className="text-xs text-slate-500">No saved conversations yet.</p>
            ) : (
              sessionsList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSessionChange(s);
                    setShowHistory(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-3 cursor-pointer ${
                    s.id === session?.id
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                    {s.turns} turns
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Picture Description Visual Stage */}
        {activeScene && (
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Scene to Describe: {activeScene.title}
              </div>
              <div className="flex items-center gap-1">
                {PICTURE_SCENES.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onSwitchPictureScene(sc.id)}
                    className={`px-2 py-1 rounded text-xs cursor-pointer ${
                      sc.id === activeScene.id
                        ? 'bg-blue-700 text-white font-semibold'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {sc.title.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5 h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800">
                {!sceneImgError ? (
                  <img
                    src={PICTURE_SCENE_IMAGES[activeScene.id]}
                    alt={activeScene.title}
                    referrerPolicy="no-referrer"
                    onError={() => setSceneImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 p-3 text-center">
                    {activeScene.title}
                  </div>
                )}
              </div>
              <p className="sm:col-span-7 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeScene.caption} Describe who is in the scene, what they are doing, and any
                details you notice.
              </p>
            </div>
          </div>
        )}

        {taskBanner && (
          <div className="mx-5 mt-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{taskBanner}</span>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!session ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              Starting your AI teacher session...
            </div>
          ) : (
            session.messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSelected = msg.id === inspectedMessage?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
                    {isUser
                      ? `You · ${msg.inputMode === 'voice' ? 'Spoken' : 'Typed'}`
                      : 'FluencyForge Teacher'}
                  </div>

                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-700 dark:bg-blue-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {!isUser && msg.followUpQuestion && msg.followUpQuestion !== msg.content && (
                      <p className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
                        {msg.followUpQuestion}
                      </p>
                    )}

                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayTTS(
                                msg.id,
                                msg.followUpQuestion && msg.followUpQuestion !== msg.content
                                  ? `${msg.content} ${msg.followUpQuestion}`
                                  : msg.content
                              )
                            }
                            className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <Square className="w-3 h-3" />
                                Stop Audio
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                Listen
                              </>
                            )}
                          </button>

                          {msg.correction && (
                            <button
                              type="button"
                              onClick={() => setInspectedMsgId(msg.id)}
                              className={`font-medium cursor-pointer ${
                                isSelected
                                  ? 'text-slate-900 dark:text-white underline'
                                  : 'text-slate-600 dark:text-slate-300 hover:underline'
                              }`}
                            >
                              {isSelected ? 'Inspecting Feedback' : 'View Correction'}
                            </button>
                          )}
                        </div>

                        {typeof msg.hasGenuineErrors === 'boolean' && (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              msg.hasGenuineErrors
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {msg.hasGenuineErrors ? (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" />
                                Corrections Found
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Clean Grammar
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice + Editable Transcript Composer */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3"
        >
          {(micError || sendError) && (
            <div
              role="alert"
              className="p-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300"
            >
              {micError || sendError}
            </div>
          )}

          {/* Recording Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={sending}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  recording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                {recording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Recording ({recordSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{speechAvailable ? 'Speak Answer' : 'Mic Unavailable'}</span>
                  </>
                )}
              </button>

              <WaveformBar active={recording} stream={micStream} />
            </div>

            {draft.trim() && (
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  setRecordSeconds(0);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Editable Transcript / Text Input */}
          <div className="flex items-end gap-2.5">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (!recording) setInputMode('text');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                recording
                  ? 'Listening... you can edit the transcribed text before sending.'
                  : 'Speak with the microphone above or type your English response here (Enter to send)...'
              }
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="px-4 py-2.5 h-[42px] rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Checking...' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right Zone: Grammar Engine & Malayalam Correction Inspector */}
      <aside className="lg:col-span-5 xl:col-span-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 lg:p-6 space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Correction &amp; Malayalam Guide
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strict grammar inspection for every sentence you speak or write
          </p>
        </div>

        {!inspectedMessage?.correction ? (
          <div className="py-10 text-center space-y-2.5">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Send your first English response
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your AI teacher will compare your original sentence with corrected English, explain
              every genuine mistake in Malayalam, and suggest natural alternatives here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Original vs Corrected */}
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Original Sentence
                </div>
                <p
                  className={`text-sm mt-1 ${
                    inspectedMessage.hasGenuineErrors
                      ? 'text-red-700 dark:text-red-300 line-through decoration-red-500/60'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {inspectedMessage.correction.originalSentence}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Corrected English
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayTTS(
                        `corr-${inspectedMessage.id}`,
                        inspectedMessage.correction!.correctedSentence
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Replay Sentence
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {inspectedMessage.correction.correctedSentence}
                </p>
              </div>
            </div>

            {/* Malayalam Explanation */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Malayalam Explanation (മലയാളം)
              </div>
              <p className="malayalam-text text-sm text-slate-800 dark:text-slate-200">
                {inspectedMessage.correction.malayalamExplanation}
              </p>
            </div>

            {/* Repeat Drill */}
            {inspectedMessage.repeatRequired && (
              <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 space-y-2.5">
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  Repeat Practice
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {inspectedMessage.correction.repeatPrompt}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handlePlayTTS(
                        `repeat-${inspectedMessage.id}`,
                        inspectedMessage.correction!.correctedSentence
                      )
                    }
                    className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-800 dark:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Hear &amp; Repeat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkRepeated(inspectedMessage)}
                    disabled={inspectedMessage.repeatCompleted}
                    className="px-2.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 disabled:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {inspectedMessage.repeatCompleted ? 'Repeated' : 'I Repeated It'}
                  </button>
                </div>
              </div>
            )}

            {/* Specific Mistakes Breakdown */}
            {inspectedMessage.correction.mistakes.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Detailed Rule Breakdown
                </div>
                <div className="space-y-3">
                  {inspectedMessage.correction.mistakes.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {m.category}
                        </span>
                        <span
                          className={`font-medium ${
                            m.severity === 'genuine_error'
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {m.severity === 'genuine_error' ? 'Genuine Error' : 'Optional Polish'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="line-through text-red-600 dark:text-red-400">
                          {m.wrongSnippet}
                        </span>
                        {' → '}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {m.correctedSnippet}
                        </span>
                      </div>
                      <p className="malayalam-text text-xs text-slate-700 dark:text-slate-300">
                        {m.explanationMalayalam}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{m.ruleSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Natural Alternatives */}
            {inspectedMessage.correction.naturalAlternatives.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Natural English Alternatives
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {inspectedMessage.correction.naturalAlternatives.map((alt, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <span>“{alt}”</span>
                      <button
                        type="button"
                        onClick={() => handlePlayTTS(`alt-${i}`, alt)}
                        className="text-blue-700 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                        aria-label={`Listen to alternative ${i + 1}`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Examples */}
            {inspectedMessage.correction.additionalExamples.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Additional Examples
                </div>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {inspectedMessage.correction.additionalExamples.map((ex, i) => (
                    <li key={i}>• {ex}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
