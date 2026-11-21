import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured. Please configure it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function transcribeAudioWithGemini(
  base64Audio: string,
  mimeType: string,
  languageName: string
): Promise<string> {
  const ai = getGeminiClient();
  const safeMime = mimeType && mimeType.startsWith('audio/') ? mimeType.split(';')[0] : 'audio/webm';

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: safeMime,
            data: base64Audio,
          },
        },
        {
          text: `Transcribe the spoken audio accurately. The speaker is likely speaking ${languageName} or English (or code-switching between them) about renting machinery, lab equipment, escrow payments, or construction tools. Return only the clean transcript text without commentary.`,
        },
      ],
    },
  });

  return (response.text ?? '').trim();
}

export interface VoiceAssistCatalogItem {
  id: number;
  title: string;
  category_name: string;
  category_slug: string;
  sector: string;
  location_city: string;
  daily_rate: number;
  replacement_value_inr: number | null;
  is_verified_machinery: boolean;
  availability_status: string;
}

export interface VoiceAssistResult {
  replyText: string;
  action: {
    type: 'none' | 'navigate' | 'search_marketplace' | 'open_equipment' | 'open_job_request';
    path: string;
    query: string;
    categorySlug: string;
    city: string;
    verifiedOnly: boolean;
    equipmentId: number;
  };
  recommendedIds: number[];
}

export async function runVoiceAssistantWithGemini(params: {
  query: string;
  languageCode: string;
  languageName: string;
  currentPath: string;
  catalog: VoiceAssistCatalogItem[];
  categories: Array<{ slug: string; name: string; sector: string }>;
}): Promise<VoiceAssistResult> {
  const ai = getGeminiClient();

  const systemInstruction = `You are Udaya Voice Assistant for the Udaya Zero-Idle Equipment Marketplace.
Udaya connects owners of idle high-value machinery (construction machinery like JCBs/excavators/generators AND expensive rent-only scientific laboratory instruments like HPLC spectrometers, confocal microscopes, 5-axis CNC centers, and 3D LiDAR scanners) with renters and researchers.

Key platform capabilities you must explain accurately when asked:
1. Multi-language support: English, Hindi, Marathi, Tamil, Telugu, Spanish.
2. Zero-Idle Job Matching: Renters post a job request once and transparent rule-based matching alerts compatible nearby owners.
3. Verified Machinery Badge: Machines inspected with verified maintenance/calibration documents carry the "Udaya Verified Machinery" badge with certificate ID.
4. Escrow Payment Protection: Renters fund rental fees + refundable security deposit into Udaya Escrow before dispatch. Funds are held securely until handover and safe equipment return inspection, then released to the owner (5% platform fee) while the deposit is refunded to the renter. Disputes freeze escrow for Admin resolution.

STRICT RULES:
- Respond ONLY in ${params.languageName} (language code: ${params.languageCode}). Keep the spoken reply natural, concise (2-4 short sentences max so it sounds crisp when spoken aloud), factual, and grounded ONLY in the live catalog below.
- Never invent equipment, prices, or fake statistics not in the catalog.
- If the user wants to find or filter machinery, set action.type to "search_marketplace" and populate query/categorySlug/city/verifiedOnly as relevant.
- If the user asks about one specific listing in the catalog, set action.type to "open_equipment" and set action.equipmentId to its exact ID.
- If the user wants to post a job request or use Zero-Idle matching, set action.type to "open_job_request" and action.path to "/renter/job-requests/new".
- If the user wants to visit a page (bookings "/renter/bookings", cost estimator "/cost-estimator", owner dashboard "/owner/dashboard", marketplace "/marketplace", map "/map", 3d inspector "/inspector-3d"), set action.type to "navigate" and set action.path.
- Include up to 3 relevant catalog IDs in recommendedIds whenever recommending equipment.`;

  const userPrompt = JSON.stringify({
    userSpokenOrTypedQuery: params.query,
    currentPath: params.currentPath,
    availableCategories: params.categories,
    liveCatalog: params.catalog,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: userPrompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          replyText: {
            type: Type.STRING,
            description: 'Concise, friendly spoken response in the user selected language.',
          },
          action: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description:
                  'One of: none, navigate, search_marketplace, open_equipment, open_job_request',
              },
              path: {
                type: Type.STRING,
                description: 'Route path if navigating, else empty string.',
              },
              query: {
                type: Type.STRING,
                description: 'Search keyword if searching marketplace, else empty string.',
              },
              categorySlug: {
                type: Type.STRING,
                description: 'Category slug from availableCategories if relevant, else empty string.',
              },
              city: {
                type: Type.STRING,
                description: 'City name if mentioned, else empty string.',
              },
              verifiedOnly: {
                type: Type.BOOLEAN,
                description: 'True if user specifically asked for verified machinery.',
              },
              equipmentId: {
                type: Type.INTEGER,
                description: 'Exact listing id if opening a specific equipment item, else 0.',
              },
            },
          },
          recommendedIds: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: 'Up to 3 relevant listing IDs from liveCatalog.',
          },
        },
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as Partial<VoiceAssistResult>;
  const validActionTypes = new Set([
    'none',
    'navigate',
    'search_marketplace',
    'open_equipment',
    'open_job_request',
  ]);
  const rawType = parsed.action?.type || 'none';
  const safeType = (validActionTypes.has(rawType) ? rawType : 'none') as VoiceAssistResult['action']['type'];

  return {
    replyText: String(parsed.replyText || '').trim(),
    action: {
      type: safeType,
      path: String(parsed.action?.path || ''),
      query: String(parsed.action?.query || ''),
      categorySlug: String(parsed.action?.categorySlug || ''),
      city: String(parsed.action?.city || ''),
      verifiedOnly: Boolean(parsed.action?.verifiedOnly),
      equipmentId: Number(parsed.action?.equipmentId || 0),
    },
    recommendedIds: Array.isArray(parsed.recommendedIds)
      ? parsed.recommendedIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0).slice(0, 3)
      : [],
  };
}

export async function synthesizeSpeechWithGemini(text: string, languageName: string): Promise<string> {
  const ai = getGeminiClient();
  const cleanText = text.trim().slice(0, 650);

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: cleanText,
            speechMetadata: {
              style: `Clear, warm, helpful marketplace assistant speaking naturally in ${languageName}`,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('Speech synthesis did not return audio output.');
  }
  return base64Audio;
}

export type GroundedChatMode = 'general' | 'fast' | 'search' | 'maps';

export interface GroundingSource {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  snippet?: string;
}

export interface GroundedChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface GroundedChatResult {
  replyText: string;
  modelUsed: string;
  mode: GroundedChatMode;
  sources: GroundingSource[];
}

export async function runGroundedChatWithGemini(params: {
  history: GroundedChatTurn[];
  message: string;
  mode: GroundedChatMode;
  languageName: string;
  latLng?: { latitude: number; longitude: number } | null;
  catalogSummary: string;
}): Promise<GroundedChatResult> {
  const ai = getGeminiClient();
  const mode: GroundedChatMode = ['general', 'fast', 'search', 'maps'].includes(params.mode)
    ? params.mode
    : 'general';

  const modelUsed = mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

  const systemInstruction = `You are Udaya AI Concierge for the Udaya Zero-Idle Equipment & High-Capex Lab Marketplace.
Respond clearly and helpfully in ${params.languageName}.
You assist contractors, equipment owners, and scientific researchers with:
- Matching jobs to Udaya's live equipment catalog (construction machinery, analytical lab instruments, 5-axis CNC, LiDAR scanners).
- Transparent rental cost breakdowns, operator/transport trade-offs, Udaya Verified Machinery inspection criteria, and Escrow Protection workflows.
- When Google Search grounding is enabled, cite up-to-date equipment specs, ISO/NABL calibration standards, Indian infrastructure benchmarks, or safety compliance facts.
- When Google Maps grounding is enabled, identify real industrial estates, equipment service yards, logistics corridors, testing labs, and nearby suppliers relevant to the user's location.
Never fabricate Udaya listings that are not in the live catalog below. Keep responses structured and easy to scan.

LIVE UDAYA CATALOG SNAPSHOT:
${params.catalogSummary}`;

  const contents = [
    ...params.history
      .slice(-14)
      .filter((t) => t.text && t.text.trim())
      .map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.text.trim().slice(0, 4000) }],
      })),
    {
      role: 'user',
      parts: [{ text: params.message.trim().slice(0, 4000) }],
    },
  ];

  const config: Record<string, unknown> = {
    systemInstruction,
  };

  if (mode === 'search') {
    config.tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    config.tools = [{ googleMaps: {} }];
    if (
      params.latLng &&
      Number.isFinite(params.latLng.latitude) &&
      Number.isFinite(params.latLng.longitude)
    ) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: params.latLng.latitude,
            longitude: params.latLng.longitude,
          },
        },
      };
    }
  } else if (mode === 'general') {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  let activeModel = modelUsed;
  let response;
  try {
    response = await ai.models.generateContent({
      model: activeModel,
      contents,
      config,
    });
  } catch (err) {
    const errText = err instanceof Error ? err.message : String(err);
    const isQuotaOrRate = errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED');
    if (isQuotaOrRate && activeModel !== 'gemini-3.1-flash-lite') {
      activeModel = 'gemini-3.1-flash-lite';
      const fallbackConfig: Record<string, unknown> = { systemInstruction };
      if (mode === 'search') {
        fallbackConfig.tools = [{ googleSearch: {} }];
      } else if (mode === 'maps') {
        fallbackConfig.tools = [{ googleMaps: {} }];
        if (config.toolConfig) fallbackConfig.toolConfig = config.toolConfig;
      }
      try {
        response = await ai.models.generateContent({
          model: activeModel,
          contents,
          config: fallbackConfig,
        });
      } catch (fallbackErr) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        if (fbMsg.includes('429') || fbMsg.includes('RESOURCE_EXHAUSTED')) {
          // Final clean fallback without external grounding tool if grounding quota is exhausted
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction: `${systemInstruction}\nNote: Live external grounding quota is temporarily rate-limited; answer accurately using the Udaya catalog and built-in engineering knowledge and mention that live citations will resume shortly.`,
            },
          });
        } else {
          throw new Error('Gemini service is temporarily busy. Please try again in a few seconds.');
        }
      }
    } else if (isQuotaOrRate) {
      throw new Error('Gemini API rate limit temporarily reached. Please retry in a few seconds.');
    } else {
      throw err;
    }
  }

  const sources: GroundingSource[] = [];
  const seenUris = new Set<string>();
  const metadata = response.candidates?.[0]?.groundingMetadata as
    | {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
          maps?: {
            uri?: string;
            title?: string;
            placeAnswerSources?: {
              reviewSnippets?: Array<{ content?: string; googleMapsUri?: string }>;
            };
          };
        }>;
      }
    | undefined;

  if (metadata?.groundingChunks) {
    for (const chunk of metadata.groundingChunks) {
      if (chunk.web?.uri && !seenUris.has(chunk.web.uri)) {
        seenUris.add(chunk.web.uri);
        sources.push({
          type: 'web',
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri,
        });
      }
      if (chunk.maps?.uri && !seenUris.has(chunk.maps.uri)) {
        seenUris.add(chunk.maps.uri);
        const firstReview = chunk.maps.placeAnswerSources?.reviewSnippets?.[0];
        sources.push({
          type: 'maps',
          title: chunk.maps.title || 'Google Maps Place',
          uri: chunk.maps.uri,
          snippet: firstReview?.content ? firstReview.content.slice(0, 180) : undefined,
        });
      }
    }
  }

  return {
    replyText: (response.text ?? '').trim() || 'I could not generate a response for that query. Please try rephrasing.',
    modelUsed: activeModel,
    mode,
    sources: sources.slice(0, 12),
  };
}

