import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Radio,
  FileAudio,
  Mic,
  MicOff,
  Send,
  Globe,
  MapPin,
  Zap,
  Sparkles,
  ExternalLink,
  Loader2,
  PhoneOff,
  PhoneCall,
  Cloud,
  Trash2,
  Plus,
  BookmarkCheck,
  Check,
  Copy,
} from 'lucide-react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { apiFetch } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { useFirebase } from '../context/FirebaseContext';
import {
  db,
  createChatSessionInFirestore,
  appendChatMessageInFirestore,
  type ChatSessionRecord,
} from '../lib/firebase';

type StudioTab = 'chat' | 'live' | 'transcribe';
type ChatMode = 'general' | 'fast' | 'search' | 'maps';

interface GroundingSource {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  snippet?: string;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: ChatMode;
  modelUsed?: string;
  sources?: GroundingSource[];
}

interface LiveTranscriptLine {
  id: string;
  speaker: 'you' | 'udaya';
  text: string;
}

const CITY_ANCHORS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.209 },
];

function float32ToPcm16Base64(float32: Float32Array, inputSampleRate: number): string {
  const targetRate = 16000;
  let samples: Float32Array;
  if (inputSampleRate === targetRate) {
    samples = float32;
  } else {
    const ratio = inputSampleRate / targetRate;
    const outLen = Math.max(1, Math.floor(float32.length / ratio));
    samples = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      samples[i] = float32[Math.floor(i * ratio)];
    }
  }
  const pcm16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function pcm24Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const count = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

export function AssistantStudioPage() {
  const { lang, languageOption } = useLanguage();
  const { firebaseUser, signInWithGoogle, addSiteNote, siteNotes, deleteSiteNote } = useFirebase();

  const [activeTab, setActiveTab] = useState<StudioTab>('chat');

  // --- Multi-Turn Chat State ---
  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dictatingChat, setDictatingChat] = useState(false);
  const [transcribingChat, setTranscribingChat] = useState(false);

  // Firestore Chat Session Persistence
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<ChatSessionRecord[]>([]);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const chatRecorderRef = useRef<MediaRecorder | null>(null);
  const chatAudioChunksRef = useRef<Blob[]>([]);

  // --- Live Voice API State ---
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [liveVoice, setLiveVoice] = useState<'Zephyr' | 'Kore' | 'Puck' | 'Fenrir'>('Zephyr');
  const [liveMuted, setLiveMuted] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [liveLines, setLiveLines] = useState<LiveTranscriptLine[]>([]);
  const [liveTextInput, setLiveTextInput] = useState('');

  const liveWsRef = useRef<WebSocket | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const liveMutedRef = useRef(false);
  const liveNextPlayTimeRef = useRef(0);
  const liveSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // --- Audio Transcription Studio State ---
  const [transRecording, setTransRecording] = useState(false);
  const [transProcessing, setTransProcessing] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [transError, setTransError] = useState('');
  const [noteLabel, setNoteLabel] = useState('');
  const [noteSavedToast, setNoteSavedToast] = useState('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const transRecorderRef = useRef<MediaRecorder | null>(null);
  const transChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    liveMutedRef.current = liveMuted;
  }, [liveMuted]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Load saved Firestore chat sessions when signed in
  useEffect(() => {
    if (!firebaseUser) {
      setSavedSessions([]);
      setActiveSessionId(null);
      return;
    }
    const q = query(
      collection(db, 'users', firebaseUser.uid, 'chatSessions'),
      where('userId', '==', firebaseUser.uid),
      orderBy('updatedAt', 'desc')
    );
    getDocs(q)
      .then((snap) => {
        setSavedSessions(
          snap.docs.slice(0, 8).map((d) => ({ id: d.id, ...(d.data() as Omit<ChatSessionRecord, 'id'>) }))
        );
      })
      .catch(() => {
        // Index may still be building or no sessions yet; fallback to unordered query
        const fallbackQ = query(
          collection(db, 'users', firebaseUser.uid, 'chatSessions'),
          where('userId', '==', firebaseUser.uid)
        );
        getDocs(fallbackQ)
          .then((snap) => {
            setSavedSessions(
              snap.docs.slice(0, 8).map((d) => ({ id: d.id, ...(d.data() as Omit<ChatSessionRecord, 'id'>) }))
            );
          })
          .catch(() => {});
      });
  }, [firebaseUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveSession();
      if (chatRecorderRef.current && chatRecorderRef.current.state !== 'inactive') {
        chatRecorderRef.current.stop();
      }
      if (transRecorderRef.current && transRecorderRef.current.state !== 'inactive') {
        transRecorderRef.current.stop();
      }
    };
  }, []);

  const loadFirestoreSession = async (session: ChatSessionRecord) => {
    if (!firebaseUser) return;
    setActiveSessionId(session.id);
    setChatMode(session.mode);
    setChatError('');
    try {
      const q = query(
        collection(db, 'users', firebaseUser.uid, 'chatSessions', session.id, 'messages'),
        where('userId', '==', firebaseUser.uid)
      );
      const snap = await getDocs(q);
      const loaded = snap.docs
        .map((d) => {
          const data = d.data() as {
            role: 'user' | 'assistant';
            text: string;
            mode: ChatMode;
            createdAt?: { toMillis?: () => number };
          };
          return {
            id: d.id,
            role: data.role,
            text: data.text,
            mode: data.mode,
            ts: data.createdAt?.toMillis?.() ?? 0,
          };
        })
        .sort((a, b) => a.ts - b.ts)
        .map(({ id, role, text, mode }) => ({ id, role, text, mode }));
      setMessages(loaded);
    } catch {
      setChatError('Unable to load previous messages for this session.');
    }
  };

  const requestBrowserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {}
    );
  };

  const handleSendChat = async (overrideText?: string) => {
    const clean = (overrideText ?? chatInput).trim();
    if (!clean || chatLoading) return;

    setChatError('');
    setChatInput('');
    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
      mode: chatMode,
    };
    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    setChatLoading(true);

    try {
      const cityAnchor = CITY_ANCHORS[selectedCityIdx] || CITY_ANCHORS[0];
      const latLng =
        chatMode === 'maps'
          ? userCoords || { latitude: cityAnchor.lat, longitude: cityAnchor.lng }
          : null;

      const res = await apiFetch<{
        replyText: string;
        modelUsed: string;
        mode: ChatMode;
        sources: GroundingSource[];
      }>('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message: clean,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          mode: chatMode,
          languageName: languageOption.englishName,
          latLng,
        }),
      });

      const assistantTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.replyText,
        mode: res.mode,
        modelUsed: res.modelUsed,
        sources: res.sources || [],
      };
      setMessages((prev) => [...prev, assistantTurn]);

      // Persist multi-turn conversation to Firestore if signed in with Google
      if (firebaseUser) {
        try {
          let sid = activeSessionId;
          if (!sid) {
            sid = await createChatSessionInFirestore(firebaseUser.uid, {
              title: clean.slice(0, 80),
              mode: chatMode,
              languageCode: lang,
            });
            setActiveSessionId(sid);
            setSavedSessions((prev) => [
              {
                id: sid!,
                userId: firebaseUser.uid,
                title: clean.slice(0, 80),
                mode: chatMode,
                languageCode: lang,
                messageCount: 2,
              },
              ...prev.slice(0, 7),
            ]);
          }
          await appendChatMessageInFirestore(firebaseUser.uid, sid, {
            role: 'user',
            text: clean,
            mode: chatMode,
            sourcesCount: 0,
            nextMessageCount: nextHistory.length,
          });
          await appendChatMessageInFirestore(firebaseUser.uid, sid, {
            role: 'assistant',
            text: res.replyText,
            mode: res.mode,
            sourcesCount: res.sources?.length || 0,
            nextMessageCount: nextHistory.length + 1,
          });
        } catch (fsErr) {
          console.error('Chat session Firestore sync skipped:', fsErr);
        }
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Unable to reach AI Concierge.');
    } finally {
      setChatLoading(false);
    }
  };

  // --- Chat Dictation via gemini-3.5-transcribe ---
  const toggleChatDictation = async () => {
    if (dictatingChat) {
      if (chatRecorderRef.current && chatRecorderRef.current.state !== 'inactive') {
        chatRecorderRef.current.stop();
      }
      setDictatingChat(false);
      return;
    }

    setChatError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mime) ? { mimeType: mime } : undefined);
      chatAudioChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chatAudioChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chatAudioChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 400) return;
        setTranscribingChat(true);
        try {
          const base64 = await blobToBase64(blob);
          const res = await apiFetch<{ transcript: string }>('/api/voice/transcribe', {
            method: 'POST',
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: blob.type || 'audio/webm',
              languageName: languageOption.englishName,
            }),
          });
          if (res.transcript) {
            setChatInput((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
          }
        } catch (err) {
          setChatError(err instanceof Error ? err.message : 'Voice transcription failed.');
        } finally {
          setTranscribingChat(false);
        }
      };
      chatRecorderRef.current = rec;
      rec.start();
      setDictatingChat(true);
    } catch {
      setChatError('Microphone permission denied or unavailable.');
    }
  };

  // --- Real-Time Gemini Live Voice API ---
  const clearQueuedPlayback = () => {
    liveSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // already ended
      }
    });
    liveSourcesRef.current = [];
    if (liveOutputCtxRef.current) {
      liveNextPlayTimeRef.current = liveOutputCtxRef.current.currentTime;
    }
  };

  const schedulePcm24Playback = (base64Pcm: string) => {
    const ctx = liveOutputCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const float32 = pcm24Base64ToFloat32(base64Pcm);
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.02, liveNextPlayTimeRef.current);
    source.start(startAt);
    liveNextPlayTimeRef.current = startAt + buffer.duration;
    liveSourcesRef.current.push(source);
    source.onended = () => {
      liveSourcesRef.current = liveSourcesRef.current.filter((s) => s !== source);
    };
  };

  const stopLiveSession = () => {
    clearQueuedPlayback();
    try {
      liveProcessorRef.current?.disconnect();
    } catch {}
    liveProcessorRef.current = null;

    liveMicStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveMicStreamRef.current = null;

    try {
      void liveInputCtxRef.current?.close();
    } catch {}
    liveInputCtxRef.current = null;

    try {
      void liveOutputCtxRef.current?.close();
    } catch {}
    liveOutputCtxRef.current = null;

    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch {}
      liveWsRef.current = null;
    }
    setLiveStatus('idle');
  };

  const startLiveSession = async () => {
    setLiveError('');
    setLiveStatus('connecting');
    setLiveLines([]);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      liveMicStreamRef.current = stream;

      const inputCtx = new AudioContext();
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      liveInputCtxRef.current = inputCtx;
      liveOutputCtxRef.current = outputCtx;
      liveNextPlayTimeRef.current = outputCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${window.location.host}/api/live-voice?lang=${encodeURIComponent(
        languageOption.englishName
      )}&voice=${encodeURIComponent(liveVoice)}`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type: string;
            data?: string;
            text?: string;
            error?: string;
          };
          if (msg.type === 'ready') {
            setLiveStatus('connected');
            // Begin streaming mic audio to Gemini Live
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            liveProcessorRef.current = processor;
            processor.onaudioprocess = (ev) => {
              if (liveMutedRef.current || ws.readyState !== WebSocket.OPEN) return;
              const channel = ev.inputBuffer.getChannelData(0);
              const base64Pcm = float32ToPcm16Base64(channel, inputCtx.sampleRate);
              ws.send(JSON.stringify({ type: 'audio', data: base64Pcm }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          } else if (msg.type === 'audio' && msg.data) {
            schedulePcm24Playback(msg.data);
          } else if (msg.type === 'interrupted') {
            clearQueuedPlayback();
          } else if (msg.type === 'input_transcript' && msg.text) {
            appendLiveTranscript('you', msg.text);
          } else if (msg.type === 'output_transcript' && msg.text) {
            appendLiveTranscript('udaya', msg.text);
          } else if (msg.type === 'error') {
            setLiveError(msg.error || 'Live voice connection error.');
            stopLiveSession();
          } else if (msg.type === 'closed') {
            stopLiveSession();
          }
        } catch {
          // ignore parse error
        }
      };

      ws.onerror = () => {
        setLiveError('Unable to connect to Udaya Live Voice WebSocket.');
        stopLiveSession();
      };

      ws.onclose = () => {
        if (liveWsRef.current === ws) {
          stopLiveSession();
        }
      };
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Unable to start live voice session.');
      stopLiveSession();
    }
  };

  const appendLiveTranscript = (speaker: 'you' | 'udaya', chunk: string) => {
    setLiveLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker) {
        return [...prev.slice(0, -1), { ...last, text: `${last.text}${chunk}` }];
      }
      return [...prev, { id: `${speaker}-${Date.now()}`, speaker, text: chunk }];
    });
  };

  const sendLiveTextInterjection = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = liveTextInput.trim();
    if (!clean || !liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) return;
    liveWsRef.current.send(JSON.stringify({ type: 'text', text: clean }));
    appendLiveTranscript('you', clean);
    setLiveTextInput('');
  };

  // --- Standalone Transcription Studio ---
  const toggleStandaloneRecording = async () => {
    if (transRecording) {
      if (transRecorderRef.current && transRecorderRef.current.state !== 'inactive') {
        transRecorderRef.current.stop();
      }
      setTransRecording(false);
      return;
    }

    setTransError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mime) ? { mimeType: mime } : undefined);
      transChunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) transChunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(transChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 400) {
          setTransError('Audio clip too short. Please speak clearly for at least 1 second.');
          return;
        }
        await transcribeAudioBlob(blob);
      };
      transRecorderRef.current = rec;
      rec.start();
      setTransRecording(true);
    } catch {
      setTransError('Microphone permission denied or unavailable.');
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setTransError('Audio file must be under 4.5 MB.');
      return;
    }
    await transcribeAudioBlob(file);
    e.target.value = '';
  };

  const transcribeAudioBlob = async (blob: Blob) => {
    setTransProcessing(true);
    setTransError('');
    try {
      const base64 = await blobToBase64(blob);
      const res = await apiFetch<{ transcript: string }>('/api/voice/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: blob.type || 'audio/webm',
          languageName: languageOption.englishName,
        }),
      });
      setTranscriptText((prev) => (prev ? `${prev}\n${res.transcript}` : res.transcript));
    } catch (err) {
      setTransError(err instanceof Error ? err.message : 'Unable to transcribe audio.');
    } finally {
      setTransProcessing(false);
    }
  };

  const handleSaveTranscriptAsNote = async () => {
    if (!transcriptText.trim()) return;
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    try {
      await addSiteNote({
        equipmentId: 0,
        equipmentTitle: noteLabel.trim() || 'Voice Site Inspection Note',
        note: transcriptText.trim().slice(0, 1500),
        locationLabel: CITY_ANCHORS[selectedCityIdx]?.name || 'Pune',
      });
      setNoteSavedToast('Saved to your cloud Site Notes in Firestore.');
      setNoteLabel('');
      setTimeout(() => setNoteSavedToast(''), 3500);
    } catch (err) {
      setTransError(err instanceof Error ? err.message : 'Unable to save note.');
    }
  };

  const modeDescriptions: Record<ChatMode, string> = {
    general: 'Catalog-grounded advisory using Gemini 4 Hydrogen',
    fast: 'Low-latency instant answers via Gemini 3.1 Flash-Lite',
    search: 'Live web specs, NABL/ISO calibration standards & market rates (Google Search Grounding)',
    maps: 'Nearby equipment yards, labs, logistics hubs & reviews (Google Maps Grounding)',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Tab Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
            Udaya AI Equipment Concierge
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Multi-turn grounded chat (Search & Maps), real-time Live API voice calls, and multilingual audio transcription.
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'chat' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
            <span>Grounded Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'live' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
            <span>Live Voice Call</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transcribe')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'transcribe' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
            <span>Audio Transcriber</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MULTI-TURN GROUNDED CHATBOT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Rail: Modes + Cloud Sessions */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Response & Grounding Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'general', label: 'Advisor', icon: Sparkles },
                    { id: 'fast', label: 'Fast Lite', icon: Zap },
                    { id: 'search', label: 'Web Search', icon: Globe },
                    { id: 'maps', label: 'Maps Places', icon: MapPin },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setChatMode(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-md border text-left transition-colors ${
                      chatMode === id
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${chatMode === id ? 'text-teal-400' : 'text-[#0D9488]'}`}
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{modeDescriptions[chatMode]}</p>

              {chatMode === 'maps' && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-medium text-slate-700">Maps Search Anchor</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCityIdx}
                      onChange={(e) => {
                        setSelectedCityIdx(Number(e.target.value));
                        setUserCoords(null);
                      }}
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-[#F8FAFC]"
                    >
                      {CITY_ANCHORS.map((c, idx) => (
                        <option key={c.name} value={idx}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={requestBrowserLocation}
                      className="px-2.5 py-1.5 text-xs font-medium bg-teal-50 text-[#0F766E] border border-teal-200 rounded hover:bg-teal-100"
                    >
                      Use GPS
                    </button>
                  </div>
                  {userCoords && (
                    <div className="text-[11px] font-mono text-emerald-700">
                      GPS locked: {userCoords.latitude.toFixed(3)}, {userCoords.longitude.toFixed(3)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Firestore Saved Sessions Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                  <Cloud className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                  <span>Cloud Chat History</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null);
                    setMessages([]);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>New</span>
                </button>
              </div>

              {!firebaseUser ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sign in with Google to persist multi-turn equipment consultations and site notes across devices in Firestore.
                  </p>
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="w-full py-2 px-3 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-md"
                  >
                    Sign in with Google
                  </button>
                </div>
              ) : savedSessions.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Signed in as <span className="font-medium text-[#0F172A]">{firebaseUser.displayName || firebaseUser.email}</span>. Your next chat turn will sync automatically.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {savedSessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => void loadFirestoreSession(s)}
                      className={`w-full text-left px-3 py-2 rounded text-xs border transition-colors ${
                        activeSessionId === s.id
                          ? 'bg-teal-50 border-teal-200 text-[#0F172A] font-medium'
                          : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">{s.title}</div>
                      <div className="text-[11px] text-slate-500 capitalize mt-0.5">{s.mode} mode</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Chat Column */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg flex flex-col h-[600px] overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-[#0F172A]">
                Language: <span className="text-[#0F766E]">{languageOption.nativeName}</span> · Mode:{' '}
                <span className="uppercase font-mono">{chatMode}</span>
              </div>
              {firebaseUser && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Firestore Sync Active
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-slate-600">
                    Ask multi-turn questions about Udaya machinery, verify ISO/NABL specs via Google Search, or discover industrial hubs via Google Maps:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        mode: 'search' as ChatMode,
                        prompt: 'What NABL ISO/IEC 17025 calibration standards apply to renting an Agilent LC-MS HPLC system in India?',
                      },
                      {
                        mode: 'maps' as ChatMode,
                        prompt: 'Find major industrial estates and heavy equipment service yards near Chakan & Pimpri-Chinchwad, Pune.',
                      },
                      {
                        mode: 'general' as ChatMode,
                        prompt: 'Compare Udaya Verified excavator listings vs high-capex lab equipment and explain how Escrow protects deposits.',
                      },
                      {
                        mode: 'fast' as ChatMode,
                        prompt: 'Quick checklist before accepting a 5-axis CNC machining center handover on Udaya.',
                      },
                    ].map((s) => (
                      <button
                        key={s.prompt}
                        type="button"
                        onClick={() => {
                          setChatMode(s.mode);
                          void handleSendChat(s.prompt);
                        }}
                        className="text-left p-3.5 bg-[#F8FAFC] hover:bg-teal-50/70 border border-slate-200 hover:border-teal-200 rounded-md transition-colors space-y-1"
                      >
                        <div className="text-[11px] font-mono uppercase font-semibold text-[#0F766E]">{s.mode}</div>
                        <div className="text-xs text-[#0F172A] leading-relaxed">{s.prompt}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-2`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-[#F8FAFC] text-[#0F172A] border border-slate-200'
                    }`}
                  >
                    {m.text}
                    {m.role === 'assistant' && m.modelUsed && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-500">
                        {m.modelUsed} · {m.mode}
                      </div>
                    )}
                  </div>

                  {m.sources && m.sources.length > 0 && (
                    <div className="max-w-[88%] w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.sources.map((src) => (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-2 p-2.5 bg-white border border-slate-200 hover:border-[#0D9488] rounded-md text-xs transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-mono uppercase text-[#0F766E]">
                              {src.type === 'maps' ? 'Google Maps' : 'Web Source'}
                            </div>
                            <div className="font-semibold text-[#0F172A] truncate">{src.title}</div>
                            {src.snippet && <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{src.snippet}</div>}
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {(chatLoading || transcribingChat) && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" aria-hidden="true" />
                  <span>{transcribingChat ? 'Transcribing speech with Gemini...' : 'Generating grounded response...'}</span>
                </div>
              )}

              {chatError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{chatError}</div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendChat();
              }}
              className="p-4 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => void toggleChatDictation()}
                disabled={chatLoading || transcribingChat}
                title="Dictate via Gemini Audio Transcription"
                className={`w-10 h-10 rounded-md inline-flex items-center justify-center shrink-0 border transition-colors ${
                  dictatingChat
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-[#F8FAFC] text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dictatingChat ? <MicOff className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  chatMode === 'search'
                    ? 'Ask anything to ground with Google Search...'
                    : chatMode === 'maps'
                      ? 'Ask about nearby industrial yards, labs, or routes...'
                      : 'Ask Udaya AI Concierge...'
                }
                className="flex-1 px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-md bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 text-white text-sm font-medium shrink-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: REAL-TIME GEMINI LIVE API VOICE CONVERSATION */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0F172A]">Real-Time Live Voice Advisor</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Full-duplex low-latency voice conversation streamed over WebSocket to Gemini Live (`gemini-3.8-live`) with automatic interruption handling and live transcriptions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Advisor Voice</label>
                <select
                  value={liveVoice}
                  disabled={liveStatus !== 'idle'}
                  onChange={(e) => setLiveVoice(e.target.value as 'Zephyr' | 'Kore' | 'Puck' | 'Fenrir')}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-md"
                >
                  <option value="Zephyr">Zephyr (Balanced)</option>
                  <option value="Kore">Kore (Warm)</option>
                  <option value="Puck">Puck (Crisp)</option>
                  <option value="Fenrir">Fenrir (Deep)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Active Language</label>
                <div className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium text-[#0F172A]">
                  {languageOption.nativeName}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0F172A] text-white space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Session State</span>
                <span className="font-mono font-semibold text-teal-400 uppercase">{liveStatus}</span>
              </div>

              <div className="flex items-center gap-2.5">
                {liveStatus === 'idle' ? (
                  <button
                    type="button"
                    onClick={() => void startLiveSession()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold transition-colors"
                  >
                    <PhoneCall className="w-4 h-4" aria-hidden="true" />
                    <span>Start Live Voice Call</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setLiveMuted((m) => !m)}
                      className={`px-4 py-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border ${
                        liveMuted
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {liveMuted ? <MicOff className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
                      <span>{liveMuted ? 'Unmute' : 'Mute Mic'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopLiveSession}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold"
                    >
                      <PhoneOff className="w-4 h-4" aria-hidden="true" />
                      <span>End Call</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {liveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{liveError}</div>
            )}
          </div>

          {/* Live Transcript Feed */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg flex flex-col h-[500px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]">
              Live Bidirectional Conversation Transcript
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {liveLines.length === 0 ? (
                <div className="text-xs text-slate-500 leading-relaxed py-8 text-center max-w-md mx-auto">
                  Start a Live Voice Call and speak naturally — for example: &ldquo;Which verified lab instruments are available in Pune right now, and how does Udaya Escrow protect my security deposit?&rdquo;
                </div>
              ) : (
                liveLines.map((line) => (
                  <div
                    key={line.id}
                    className={`flex flex-col ${line.speaker === 'you' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] font-mono uppercase text-slate-500 mb-0.5">
                      {line.speaker === 'you' ? 'You' : `Udaya (${liveVoice})`}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                        line.speaker === 'you'
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-[#F8FAFC] text-[#0F172A] border border-slate-200'
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {liveStatus === 'connected' && (
              <form onSubmit={sendLiveTextInterjection} className="p-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={liveTextInput}
                  onChange={(e) => setLiveTextInput(e.target.value)}
                  placeholder="Optional: send a typed follow-up into the live voice session..."
                  className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-md"
                />
                <button
                  type="submit"
                  disabled={!liveTextInput.trim()}
                  className="px-3.5 py-2 text-xs font-medium bg-[#0D9488] text-white rounded-md disabled:bg-slate-300"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO TRANSCRIPTION STUDIO + CLOUD SITE NOTES */}
      {activeTab === 'transcribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
                Multilingual Field Audio Transcriber
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Dictate site inspection logs, operator briefings, or job requirements using Gemini (`gemini-3.5-transcribe`) in {languageOption.nativeName} or English, then save directly to Firestore.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={transProcessing}
                onClick={() => void toggleStandaloneRecording()}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-md transition-colors ${
                  transRecording
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : 'bg-[#0D9488] hover:bg-[#0F766E] text-white disabled:bg-slate-300'
                }`}
              >
                {transRecording ? <MicOff className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
                <span>{transRecording ? 'Stop & Transcribe' : 'Record Voice Note'}</span>
              </button>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-300 rounded-md cursor-pointer">
                <FileAudio className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                <span>Upload Audio Clip</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => void handleAudioFileUpload(e)}
                  className="hidden"
                />
              </label>

              {transProcessing && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" aria-hidden="true" />
                  Transcribing audio...
                </span>
              )}
            </div>

            {transError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{transError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Site Note Title</label>
                <input
                  type="text"
                  value={noteLabel}
                  onChange={(e) => setNoteLabel(e.target.value)}
                  placeholder="e.g. Chakan Site JCB 3DX Pre-Dispatch Checklist"
                  className="w-full px-3 py-2 text-sm bg-[#F8FAFC] border border-slate-200 rounded-md"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Transcribed Output</label>
                  {transcriptText && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(transcriptText);
                        setCopiedTranscript(true);
                        setTimeout(() => setCopiedTranscript(false), 1800);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#0F766E] hover:underline"
                    >
                      {copiedTranscript ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                      <span>{copiedTranscript ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={6}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Spoken transcription appears here. You can edit before saving to Firestore..."
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8FAFC] border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!transcriptText.trim()}
                  onClick={() => void handleSaveTranscriptAsNote()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-300 rounded-md"
                >
                  <Cloud className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
                  <span>{firebaseUser ? 'Save to Firestore Site Notes' : 'Sign in with Google to Save'}</span>
                </button>
                {noteSavedToast && <span className="text-xs font-medium text-emerald-700">{noteSavedToast}</span>}
              </div>
            </div>
          </div>

          {/* Right Column: Synced Cloud Site Notes */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0F172A]">Your Cloud Site Notes</h2>
              <span className="text-xs font-mono text-slate-500">{siteNotes.length} notes</span>
            </div>

            {!firebaseUser ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Connect your Google account to sync transcribed field inspection notes and saved machinery watchlists securely in Cloud Firestore.
                </p>
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
                >
                  Continue with Google
                </button>
              </div>
            ) : siteNotes.length === 0 ? (
              <p className="text-xs text-slate-500">No saved site notes yet. Record a voice note on the left to save one.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {siteNotes.map((n) => (
                  <div key={n.id} className="p-3.5 bg-[#F8FAFC] border border-slate-200 rounded-md space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A]">{n.equipmentTitle}</div>
                        {n.locationLabel && <div className="text-[11px] text-slate-500">{n.locationLabel}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteSiteNote(n.id)}
                        aria-label="Delete note"
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio file.'));
    reader.readAsDataURL(blob);
  });
}
