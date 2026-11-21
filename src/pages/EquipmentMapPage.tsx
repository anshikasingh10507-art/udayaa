import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  FlaskConical,
  Box,
  Compass,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import type { EquipmentListing } from '../types';
import { useLanguage } from '../context/LanguageContext';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const JOB_SITE_PRESETS: Array<{ label: string; city: string; lat: number; lng: number }> = [
  { label: 'Hinjewadi Phase 2 Tech Park, Pune', city: 'Pune', lat: 18.5913, lng: 73.7389 },
  { label: 'Chakan MIDC Industrial Area, Pune', city: 'Pune', lat: 18.7606, lng: 73.8636 },
  { label: 'Andheri SEEPZ Logistics Hub, Mumbai', city: 'Mumbai', lat: 19.1268, lng: 72.8752 },
  { label: 'Whitefield Bio-Tech Corridor, Bengaluru', city: 'Bengaluru', lat: 12.9698, lng: 77.75 },
  { label: 'Genome Valley Research Park, Hyderabad', city: 'Hyderabad', lat: 17.6197, lng: 78.5754 },
  { label: 'Okhla Industrial Phase III, Delhi NCR', city: 'Delhi NCR', lat: 28.5476, lng: 77.2725 },
];

const CITY_FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  pune: { lat: 18.5204, lng: 73.8567 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  'delhi ncr': { lat: 28.6139, lng: 77.209 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  nashik: { lat: 19.9975, lng: 73.7898 },
};

interface RouteSummary {
  distanceKm: number;
  durationMin: number;
  estimatedTransportINR: number;
}

interface MapsGroundingSource {
  type: 'web' | 'maps';
  title: string;
  uri: string;
  snippet?: string;
}

function getListingCoords(item: EquipmentListing, index: number): { lat: number; lng: number } {
  const baseLat =
    typeof item.latitude === 'number' && Number.isFinite(item.latitude)
      ? item.latitude
      : CITY_FALLBACK_COORDS[item.location_city.toLowerCase()]?.lat ?? 18.5204;
  const baseLng =
    typeof item.longitude === 'number' && Number.isFinite(item.longitude)
      ? item.longitude
      : CITY_FALLBACK_COORDS[item.location_city.toLowerCase()]?.lng ?? 73.8567;

  // Deterministic gentle spiral offset so co-located yards remain individually clickable
  const angle = index * 1.37;
  const radius = 0.012 + (index % 4) * 0.008;
  return {
    lat: baseLat + Math.sin(angle) * radius,
    lng: baseLng + Math.cos(angle) * radius,
  };
}

function get3DModelSlug(item: EquipmentListing): string {
  const hay = `${item.category_slug || ''} ${item.title}`.toLowerCase();
  if (hay.includes('hplc') || hay.includes('lab') || hay.includes('microscope') || hay.includes('spectro')) {
    return 'hplc';
  }
  if (hay.includes('cnc') || hay.includes('machin') || hay.includes('lidar')) {
    return 'cnc';
  }
  return 'excavator';
}

interface MapPolylineHandle {
  setOptions: (opts: { strokeColor?: string; strokeWeight?: number; strokeOpacity?: number }) => void;
  setMap: (map: unknown) => void;
}

function DeliveryRouteLayer({
  origin,
  destination,
  onRouteComputed,
  onRouteError,
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  onRouteComputed: (summary: RouteSummary | null) => void;
  onRouteError: (msg: string) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<MapPolylineHandle[]>([]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    onRouteError('');

    if (!routesLib || !map || !origin || !destination) {
      onRouteComputed(null);
      return;
    }

    let cancelled = false;
    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    const RouteClass = (routesLib as unknown as {
      Route?: {
        computeRoutes: (req: unknown) => Promise<{
          routes?: Array<{
            distanceMeters?: number;
            durationMillis?: number;
            viewport?: unknown;
            createPolylines: () => MapPolylineHandle[];
          }>;
        }>;
      };
    }).Route;

    if (!RouteClass?.computeRoutes) {
      onRouteError('Routes library is initializing. Try selecting the destination again.');
      return;
    }

    RouteClass.computeRoutes(request)
      .then(({ routes }) => {
        if (cancelled) return;
        if (!routes || routes.length === 0) {
          onRouteComputed(null);
          onRouteError('No drivable delivery corridor found between these two locations.');
          return;
        }
        const primary = routes[0];
        const newPolylines = primary.createPolylines();
        newPolylines.forEach((pl) => {
          pl.setOptions({
            strokeColor: '#0D9488',
            strokeWeight: 5,
            strokeOpacity: 0.9,
          });
          pl.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primary.viewport) {
          (map as unknown as { fitBounds: (bounds: unknown, padding?: number) => void }).fitBounds(
            primary.viewport,
            60
          );
        }

        const distanceKm = Number(((primary.distanceMeters ?? 0) / 1000).toFixed(1));
        const durationMin = Math.max(1, Math.round((primary.durationMillis ?? 0) / 60000));
        const estimatedTransportINR = Math.round(1200 + distanceKm * 65);
        onRouteComputed({ distanceKm, durationMin, estimatedTransportINR });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('REQUEST_DENIED') ||
          msg.includes('QUOTA')
        ) {
          window.dispatchEvent(
            new CustomEvent('gmp-quota-exceeded', {
              detail: { source: 'routes', message: msg },
            })
          );
        }
        onRouteComputed(null);
        onRouteError('Could not calculate driving route for this pair right now.');
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin, destination, onRouteComputed, onRouteError]);

  return null;
}

function MapCameraFocus({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(12);
  }, [map, target]);
  return null;
}

export function EquipmentMapPage() {
  const { lang, languageOption } = useLanguage();
  const [listings, setListings] = useState<EquipmentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<'all' | 'construction' | 'laboratory' | 'precision_industrial'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedJobSiteIdx, setSelectedJobSiteIdx] = useState<number>(0);
  const [routeActive, setRouteActive] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeError, setRouteError] = useState('');

  // Maps Grounding nearby scout state
  const [scoutQuery, setScoutQuery] = useState('');
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutAnswer, setScoutAnswer] = useState('');
  const [scoutSources, setScoutSources] = useState<MapsGroundingSource[]>([]);
  const [scoutError, setScoutError] = useState('');

  useEffect(() => {
    apiFetch<{ equipment: EquipmentListing[] }>('/api/equipment')
      .then((res) => setListings(res.equipment || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredWithCoords = useMemo(() => {
    return listings
      .filter((item) => {
        if (verifiedOnly && !item.is_verified_machinery) return false;
        if (sectorFilter !== 'all' && item.category_sector !== sectorFilter) return false;
        return true;
      })
      .map((item, idx) => ({
        item,
        coords: getListingCoords(item, idx),
      }));
  }, [listings, sectorFilter, verifiedOnly]);

  const selectedEntry = useMemo(
    () => filteredWithCoords.find((e) => e.item.id === selectedId) || null,
    [filteredWithCoords, selectedId]
  );

  const selectedJobSite = JOB_SITE_PRESETS[selectedJobSiteIdx] || JOB_SITE_PRESETS[0];

  const handleMapsGroundingScout = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || scoutLoading) return;
    setScoutLoading(true);
    setScoutError('');
    try {
      const anchor = selectedEntry ? selectedEntry.coords : { lat: selectedJobSite.lat, lng: selectedJobSite.lng };
      const res = await apiFetch<{
        replyText: string;
        sources: MapsGroundingSource[];
      }>('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message: clean,
          history: [],
          mode: 'maps',
          languageName: languageOption.englishName,
          latLng: { latitude: anchor.lat, longitude: anchor.lng },
        }),
      });
      setScoutAnswer(res.replyText);
      setScoutSources(res.sources || []);
    } catch (err) {
      setScoutError(err instanceof Error ? err.message : 'Unable to query nearby places.');
    } finally {
      setScoutLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header + Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
            Live Equipment Yard & Route Locator
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect idle machinery and NABL-calibrated lab instruments on Google Maps, compute real driving delivery corridors, and discover nearby industrial hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'construction', 'laboratory', 'precision_industrial'] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => {
                setSectorFilter(sec);
                setRouteActive(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                sectorFilter === sec
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sec === 'all'
                ? 'All Assets'
                : sec === 'construction'
                  ? 'Construction'
                  : sec === 'laboratory'
                    ? 'Lab Instruments'
                    : 'Industrial CNC'}
            </button>
          ))}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="accent-[#0D9488]"
            />
            <span>Verified Only</span>
          </label>
        </div>
      </div>

      {/* Main Split: Interactive Google Map + Logistics & Grounding Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Container (Explicit non-zero height per CF2) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {!MAPS_API_KEY ? (
            <div className="h-[540px] flex flex-col items-center justify-center p-8 text-center bg-slate-50">
              <MapPin className="w-8 h-8 text-amber-600 mb-2" aria-hidden="true" />
              <p className="font-display text-base font-bold text-[#0F172A]">Google Maps API Key Not Found</p>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                Configure <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to render live equipment yard pins and Routes API delivery corridors.
              </p>
            </div>
          ) : (
            <div className="w-full h-[540px] lg:h-[620px] relative">
              <APIProvider apiKey={MAPS_API_KEY} language={lang} region="IN">
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  defaultCenter={{ lat: 18.5204, lng: 73.8567 }}
                  defaultZoom={6}
                  gestureHandling="greedy"
                  mapTypeControl={true}
                  streetViewControl={false}
                  style={{ width: '100%', height: '100%' }}
                >
                  {selectedEntry && !routeActive && <MapCameraFocus target={selectedEntry.coords} />}

                  {filteredWithCoords.map(({ item, coords }) => {
                    const isSelected = selectedId === item.id;
                    const isLab = item.category_sector === 'laboratory' || item.rent_only_high_capex;
                    return (
                      <AdvancedMarker
                        key={item.id}
                        position={coords}
                        title={item.title}
                        onClick={() => {
                          setSelectedId(item.id);
                          setRouteActive(false);
                          setRouteSummary(null);
                        }}
                      >
                        <Pin
                          background={isSelected ? '#0F172A' : isLab ? '#0D9488' : '#D97706'}
                          borderColor="#FFFFFF"
                          glyphColor="#FFFFFF"
                          scale={isSelected ? 1.25 : 1}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* Destination Job Site Marker when routing */}
                  {routeActive && (
                    <AdvancedMarker
                      position={{ lat: selectedJobSite.lat, lng: selectedJobSite.lng }}
                      title={`Job Site: ${selectedJobSite.label}`}
                    >
                      <Pin background="#2563EB" borderColor="#FFFFFF" glyphColor="#FFFFFF" scale={1.15} />
                    </AdvancedMarker>
                  )}

                  {selectedEntry && (
                    <InfoWindow
                      position={selectedEntry.coords}
                      onCloseClick={() => {
                        setSelectedId(null);
                        setRouteActive(false);
                      }}
                    >
                      <div className="max-w-[260px] p-1 space-y-2 text-[#0F172A]">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                          <span>{selectedEntry.item.category_name}</span>
                          <span>·</span>
                          <span>{selectedEntry.item.location_city}</span>
                        </div>
                        <div className="font-display text-sm font-bold leading-snug">
                          {selectedEntry.item.title}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-[#0F766E]">
                            {formatINR(selectedEntry.item.daily_rate)}/day
                          </span>
                          {selectedEntry.item.is_verified_machinery && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setRouteActive(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded"
                          >
                            <Navigation className="w-3 h-3" aria-hidden="true" />
                            <span>Route to Job Site</span>
                          </button>
                          <Link
                            to={`/equipment/${selectedEntry.item.id}`}
                            className="px-2.5 py-1 text-xs font-medium text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            Details
                          </Link>
                          <Link
                            to={`/inspector-3d?model=${get3DModelSlug(selectedEntry.item)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                          >
                            <Box className="w-3 h-3" aria-hidden="true" />
                            <span>3D</span>
                          </Link>
                        </div>
                      </div>
                    </InfoWindow>
                  )}

                  {routeActive && selectedEntry && (
                    <DeliveryRouteLayer
                      origin={selectedEntry.coords}
                      destination={{ lat: selectedJobSite.lat, lng: selectedJobSite.lng }}
                      onRouteComputed={setRouteSummary}
                      onRouteError={setRouteError}
                    />
                  )}
                </GoogleMap>
              </APIProvider>
            </div>
          )}

          {/* Legend Strip */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                Construction Machinery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                High-Capex Lab & CNC
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                Target Job Site
              </span>
            </div>
            <span className="font-mono text-slate-500">
              {loading ? 'Loading fleet...' : `${filteredWithCoords.length} mapped assets`}
            </span>
          </div>
        </div>

        {/* Right Panel: Delivery Route Estimator + Maps Grounding Nearby Scout + Asset List */}
        <div className="lg:col-span-4 space-y-5">
          {/* Delivery Route Corridor Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                <span>Routes API Delivery Estimator</span>
              </h2>
              {routeActive && (
                <button
                  type="button"
                  onClick={() => {
                    setRouteActive(false);
                    setRouteSummary(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  Clear
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Job Site / Lab</label>
              <select
                value={selectedJobSiteIdx}
                onChange={(e) => setSelectedJobSiteIdx(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-md text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              >
                {JOB_SITE_PRESETS.map((site, idx) => (
                  <option key={site.label} value={idx}>
                    {site.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedEntry ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
                <div className="font-semibold text-[#0F172A] truncate">{selectedEntry.item.title}</div>
                <div className="text-slate-600">
                  Origin yard: {selectedEntry.item.location_area ? `${selectedEntry.item.location_area}, ` : ''}
                  {selectedEntry.item.location_city}
                </div>
                <button
                  type="button"
                  onClick={() => setRouteActive(true)}
                  className="w-full py-2 px-3 bg-[#0D9488] hover:bg-[#0F766E] text-white font-medium rounded-md transition-colors"
                >
                  Compute Live Driving Route
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Select any equipment pin on the map or from the list below to calculate real-world driving distance and flatbed transport cost.
              </p>
            )}

            {routeError && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                {routeError}
              </div>
            )}

            {routeSummary && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="p-2 bg-teal-50/70 rounded">
                  <div className="text-[11px] text-slate-600">Distance</div>
                  <div className="font-mono text-sm font-bold text-[#0F172A]">{routeSummary.distanceKm} km</div>
                </div>
                <div className="p-2 bg-teal-50/70 rounded">
                  <div className="text-[11px] text-slate-600">Drive Time</div>
                  <div className="font-mono text-sm font-bold text-[#0F172A]">{routeSummary.durationMin} min</div>
                </div>
                <div className="p-2 bg-teal-50/70 rounded">
                  <div className="text-[11px] text-slate-600">Est. Haulage</div>
                  <div className="font-mono text-sm font-bold text-[#0F766E]">
                    {formatINR(routeSummary.estimatedTransportINR)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Google Maps Grounding Nearby Scout */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h2 className="font-display text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
              <span>Nearby Industrial & Lab Scout (Maps Grounding)</span>
            </h2>
            <p className="text-xs text-slate-600">
              Ask Gemini grounded with Google Maps for nearby equipment yards, diesel stations, NABL calibration labs, or highway access around{' '}
              <span className="font-medium text-[#0F172A]">
                {selectedEntry ? selectedEntry.item.location_city : selectedJobSite.city}
              </span>
              .
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Nearby NABL calibration labs & testing centers',
                'Heavy machinery service yards & hydraulic spares nearby',
                'Nearest industrial estate logistics hubs',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setScoutQuery(preset);
                    void handleMapsGroundingScout(preset);
                  }}
                  className="text-[11px] px-2.5 py-1 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded text-slate-700 text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleMapsGroundingScout(scoutQuery);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={scoutQuery}
                onChange={(e) => setScoutQuery(e.target.value)}
                placeholder="Ask about nearby places..."
                className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
              <button
                type="submit"
                disabled={scoutLoading || !scoutQuery.trim()}
                className="px-3 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-300 rounded-md"
              >
                {scoutLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Ask'}
              </button>
            </form>

            {scoutError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">{scoutError}</div>
            )}

            {scoutAnswer && (
              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-md space-y-2.5 max-h-60 overflow-y-auto">
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{scoutAnswer}</p>
                {scoutSources.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500">Google Maps Places</div>
                    {scoutSources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-2 p-2 bg-white border border-slate-200 hover:border-[#0D9488] rounded text-xs transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[#0F172A] truncate">{src.title}</div>
                          {src.snippet && <div className="text-[11px] text-slate-500 line-clamp-2">{src.snippet}</div>}
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Mapped Assets Quick-Focus List */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#0F172A]">Mapped Fleet Directory</h2>
              <span className="text-xs text-slate-500">{filteredWithCoords.length} items</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {filteredWithCoords.map(({ item }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setRouteActive(false);
                    setRouteSummary(null);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                    selectedId === item.id ? 'bg-teal-50/60' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                      {item.rent_only_high_capex && (
                        <FlaskConical className="w-3.5 h-3.5 text-[#0D9488] shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.location_city} · {item.category_name}
                    </div>
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#0F172A] shrink-0">
                    {formatINR(item.daily_rate)}/d
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
