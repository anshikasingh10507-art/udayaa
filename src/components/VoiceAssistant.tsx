import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mic, MicOff, Send, Volume2, VolumeX, X, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../lib/i18n';
import { apiFetch, formatINR } from '../lib/api';

interface RecommendedItem {
  id: number;
  title: string;
  category_name: string;
  location_city: string;
  daily_rate: number;
  is_verified_machinery: boolean;
  image_url: string;
}

interface AssistantAction {
  type: 'none' | 'navigate' | 'search_marketplace' | 'open_equipment' | 'open_job_request';
  path: string;
  query: string;
  categorySlug: string;
  city: string;
  verifiedOnly: boolean;
  equipmentId: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendedItems?: RecommendedItem[];
  action?: AssistantAction;
}

export function VoiceAssistant() {
  const { lang, languageOption, setLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, thinking, transcribing]);

  useEffect(() => {
    return () => {
      stopAudioPlayback();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopAudioPlayback = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    setSpeakingId(null);
  };

  const speakText = async (msgId: string, text: string) => {
    stopAudioPlayback();
    setSpeakingId(msgId);
    setError('');
    try {
      const res = await apiFetch<{ audioBase64: string; mimeType: string }>('/api/voice/speak', {
        method: 'POST',
        body: JSON.stringify({
          text,
          languageName: languageOption.englishName,
        }),
      });
      const audio = new Audio(`data:${res.mimeType || 'audio/wav'};base64,${res.audioBase64}`);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setSpeakingId(null);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        setSpeakingId(null);
        activeAudioRef.current = null;
      };
      await audio.play();
    } catch (err) {
      setSpeakingId(null);
      setError(err instanceof Error ? err.message : 'Unable to play voice audio.');
    }
  };

  const executeAction = (action: AssistantAction) => {
    if (!action || action.type === 'none') return;
    if (action.type === 'open_equipment' && action.equipmentId > 0) {
      navigate(`/equipment/${action.equipmentId}`);
      setOpen(false);
      return;
    }
    if (action.type === 'open_job_request') {
      navigate('/renter/job-requests/new');
      setOpen(false);
      return;
    }
    if (action.type === 'search_marketplace') {
      const params = new URLSearchParams();
      if (action.query) params.set('q', action.query);
      if (action.categorySlug) params.set('category', action.categorySlug);
      if (action.city) params.set('city', action.city);
      if (action.verifiedOnly) params.set('verifiedOnly', 'true');
      navigate(`/marketplace?${params.toString()}`);
      setOpen(false);
      return;
    }
    if (action.type === 'navigate' && action.path && action.path.startsWith('/')) {
      navigate(action.path);
      setOpen(false);
    }
  };

  const sendQuery = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean || thinking) return;

    setError('');
    setInput('');
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: clean };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const res = await apiFetch<{
        replyText: string;
        action: AssistantAction;
        recommendedItems: RecommendedItem[];
      }>('/api/voice/assist', {
        method: 'POST',
        body: JSON.stringify({
          query: clean,
          languageCode: lang,
          languageName: languageOption.englishName,
          currentPath: location.pathname,
        }),
      });

      const assistantMsgId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: res.replyText,
        recommendedItems: res.recommendedItems || [],
        action: res.action,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (autoSpeak && res.replyText) {
        void speakText(assistantMsgId, res.replyText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach Udaya Voice Assistant.');
    } finally {
      setThinking(false);
    }
  };

  const startRecording = async () => {
    setError('');
    stopAudioPlayback();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Microphone recording is not supported in this browser. Type your request below.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 400) {
          setError('No voice audio captured. Try speaking closer to the microphone.');
          return;
        }
        setTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = String(reader.result || '');
              const idx = result.indexOf(',');
              resolve(idx >= 0 ? result.slice(idx + 1) : result);
            };
            reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
            reader.readAsDataURL(blob);
          });

          const transRes = await apiFetch<{ transcript: string }>('/api/voice/transcribe', {
            method: 'POST',
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: blob.type || 'audio/webm',
              languageName: languageOption.englishName,
            }),
          });

          if (transRes.transcript) {
            await sendQuery(transRes.transcript);
          } else {
            setError('Could not recognize speech. Please try again or type below.');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Voice transcription failed.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Microphone permission denied or unavailable. You can still type in any language below.');
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const quickPrompts = [
    t('voice.quickPrompt1'),
    t('voice.quickPrompt2'),
    t('voice.quickPrompt3'),
    t('voice.quickPrompt4'),
  ];

  const getActionLabel = (action: AssistantAction): string => {
    if (action.type === 'open_equipment') return 'Open Equipment Page';
    if (action.type === 'open_job_request') return 'Open Zero-Idle Job Form';
    if (action.type === 'search_marketplace') return 'View Filtered Marketplace';
    return 'Go to Page';
  };

  return (
    <>
      {/* Compact Floating Voice Assistant Trigger */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('voice.buttonLabel')}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 h-12 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-medium shadow-lg border border-slate-700 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <Mic className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t('voice.buttonLabel')}</span>
        </button>
      )}

      {/* Slide-over Voice Assistant Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
          role="dialog"
          aria-modal="true"
          aria-label={t('voice.title')}
        >
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-[#0F172A] text-white flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold">{t('voice.title')}</h2>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{t('voice.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopAudioPlayback();
                  setOpen(false);
                }}
                aria-label="Close voice assistant"
                className="w-9 h-9 rounded-md inline-flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Language + Auto-Speak Controls */}
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="voice-lang-select" className="text-xs font-medium text-slate-600">
                  Language:
                </label>
                <select
                  id="voice-lang-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LanguageCode)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-md text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                >
                  {SUPPORTED_LANGUAGES.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.nativeName} ({opt.englishName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (autoSpeak) stopAudioPlayback();
                  setAutoSpeak((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  autoSpeak
                    ? 'bg-teal-50 text-[#0F766E] border-teal-200'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {autoSpeak ? <Volume2 className="w-3.5 h-3.5" aria-hidden="true" /> : <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{t('voice.autoSpeak')}</span>
              </button>
            </div>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-500">Try asking by voice or tap a quick command:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendQuery(prompt)}
                        className="text-left px-3.5 py-2.5 text-xs font-medium text-[#0F172A] bg-[#F8FAFC] hover:bg-teal-50 hover:border-teal-200 border border-slate-200 rounded-md transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-[#F8FAFC] text-[#0F172A] border border-slate-200'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {msg.role === 'assistant' && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            speakingId === msg.id ? stopAudioPlayback() : void speakText(msg.id, msg.text)
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                        >
                          {speakingId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t('voice.stopAudio')}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t('voice.playAudio')}</span>
                            </>
                          )}
                        </button>

                        {msg.action && msg.action.type !== 'none' && (
                          <button
                            type="button"
                            onClick={() => executeAction(msg.action!)}
                            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded"
                          >
                            <span>{getActionLabel(msg.action)}</span>
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {msg.recommendedItems && msg.recommendedItems.length > 0 && (
                    <div className="w-full space-y-2">
                      {msg.recommendedItems.map((item) => (
                        <Link
                          key={item.id}
                          to={`/equipment/${item.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 hover:border-[#0D9488] rounded-md transition-colors"
                        >
                          <img
                            src={item.image_url}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-11 object-cover rounded shrink-0 bg-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[#0F172A] truncate">{item.title}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{item.location_city}</span>
                              <span>·</span>
                              <span className="font-mono font-semibold text-[#0F172A]">
                                {formatINR(item.daily_rate)}/d
                              </span>
                              {item.is_verified_machinery && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                                    Verified
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {(transcribing || thinking) && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" aria-hidden="true" />
                  <span>{transcribing ? t('voice.transcribing') : t('voice.thinking')}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Voice Record & Text Input Footer */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              <button
                type="button"
                disabled={transcribing || thinking}
                onClick={recording ? stopRecording : startRecording}
                className={`w-full py-2.5 px-4 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                  recording
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : 'bg-[#0D9488] hover:bg-[#0F766E] text-white disabled:bg-slate-300'
                }`}
              >
                {recording ? (
                  <>
                    <MicOff className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {t('voice.listening')} ({t('voice.stopRecording')})
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {t('voice.startRecording')} ({languageOption.nativeName})
                    </span>
                  </>
                )}
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendQuery(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('voice.placeholder')}
                  className="flex-1 px-3 py-2 text-sm bg-[#F8FAFC] border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || thinking || transcribing}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-md bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-300 text-white inline-flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
