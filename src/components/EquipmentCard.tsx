import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Lock, Bookmark, BookmarkCheck } from 'lucide-react';
import type { EquipmentListing } from '../types';
import { formatINR } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { useFirebase } from '../context/FirebaseContext';
import { VerifiedMachineryBadge } from './StatusLabel';

function formatCompactINR(amount: number): string {
  if (amount >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(0)} L`;
  }
  return formatINR(amount);
}

export function EquipmentImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4 text-center text-slate-500">
        <Wrench className="w-8 h-8 mb-2 text-slate-400" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function EquipmentCard({ item }: { item: EquipmentListing }) {
  const { t } = useLanguage();
  const { isBookmarked, toggleBookmark } = useFirebase();
  const [savingBookmark, setSavingBookmark] = useState(false);

  const saved = isBookmarked(item.id);

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (savingBookmark) return;
    setSavingBookmark(true);
    try {
      await toggleBookmark({
        equipmentId: item.id,
        title: item.title,
        categoryName: item.category_name || 'Equipment',
        locationCity: item.location_city,
        dailyRate: item.daily_rate,
        imageUrl: item.image_url || '',
        isVerified: Boolean(item.is_verified_machinery),
      });
    } catch {
      // handled in context
    } finally {
      setSavingBookmark(false);
    }
  };

  const availabilityText =
    item.availability_status === 'available'
      ? t('card.openForRequests')
      : item.availability_status === 'maintenance'
        ? t('card.underMaintenance')
        : t('card.paused');

  return (
    <Link
      to={`/equipment/${item.id}`}
      className="group block bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        <EquipmentImage
          src={item.image_url}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <button
          type="button"
          onClick={(e) => void handleBookmarkClick(e)}
          disabled={savingBookmark}
          aria-label={saved ? 'Remove from saved watchlist' : 'Save to cloud watchlist'}
          title={saved ? 'Saved in Cloud Watchlist' : 'Save to Cloud Watchlist'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-md inline-flex items-center justify-center border transition-colors ${
            saved
              ? 'bg-[#0D9488] text-white border-[#0D9488]'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:border-[#0D9488] hover:text-[#0F766E]'
          }`}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <span className="font-medium text-slate-700 truncate">{item.category_name}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{item.location_city}</span>
          {item.is_sample && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-700 font-medium shrink-0">Sample</span>
            </>
          )}
        </div>

        <h3 className="font-display text-base font-semibold text-[#0F172A] leading-snug line-clamp-2 min-h-[2.75rem]">
          {item.title}
        </h3>

        {/* Trust & High-Capex metadata line (zero pill bloat) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs min-h-[1.25rem]">
          <VerifiedMachineryBadge
            isVerified={item.is_verified_machinery}
            tier={item.verification_badge_tier}
            certificateId={item.verification_certificate_id}
            compact
          />
          {item.rent_only_high_capex && (
            <span className="font-medium text-[#0F766E] whitespace-nowrap">
              {t('badge.highCapexRentOnly')}
              {item.replacement_value_inr ? ` · ${t('card.assetValue')} ${formatCompactINR(item.replacement_value_inr)}` : ''}
            </span>
          )}
          {!item.is_verified_machinery && !item.rent_only_high_capex && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" aria-hidden="true" />
              <span>{t('escrow.protectedBadge')}</span>
            </span>
          )}
        </div>

        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{item.operator_available ? t('card.operatorOption') : t('card.dryHire')}</span>
          <span aria-hidden="true">·</span>
          <span>{item.transport_available ? t('card.deliveryAvailable') : t('card.pickupTransport')}</span>
        </div>

        <div className="pt-3 mt-1 border-t border-slate-100 flex items-baseline justify-between gap-3">
          <div>
            <span className="font-mono tabular-nums text-base font-semibold text-[#0F172A]">
              {formatINR(item.daily_rate)}
            </span>
            <span className="text-xs text-slate-500"> {t('card.perDay')}</span>
          </div>
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              item.availability_status === 'available' ? 'text-[#0F766E]' : 'text-amber-700'
            }`}
          >
            {availabilityText}
          </span>
        </div>
      </div>
    </Link>
  );
}
