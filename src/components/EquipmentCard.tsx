import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import type { EquipmentListing } from '../types';
import { formatINR } from '../lib/api';

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
  const availabilityText =
    item.availability_status === 'available'
      ? 'Listed as open for requests'
      : item.availability_status === 'maintenance'
        ? 'Under maintenance'
        : 'Paused by owner';

  return (
    <Link
      to={`/equipment/${item.id}`}
      className="group block bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
    >
      <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        <EquipmentImage
          src={item.image_url}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </div>

      <div className="p-5 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <span className="font-medium text-slate-700 truncate">{item.category_name}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{item.location_city}</span>
          {item.is_sample && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-700 font-medium shrink-0">Sample listing</span>
            </>
          )}
        </div>

        <h3 className="font-display text-base font-semibold text-[#0F172A] leading-snug line-clamp-2 min-h-[2.75rem]">
          {item.title}
        </h3>

        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{item.operator_available ? 'Operator option' : 'Dry hire'}</span>
          <span aria-hidden="true">·</span>
          <span>{item.transport_available ? 'Delivery available' : 'Pickup / arrange transport'}</span>
        </div>

        <div className="pt-3 mt-1 border-t border-slate-100 flex items-baseline justify-between gap-3">
          <div>
            <span className="font-mono tabular-nums text-base font-semibold text-[#0F172A]">
              {formatINR(item.daily_rate)}
            </span>
            <span className="text-xs text-slate-500"> / day</span>
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
