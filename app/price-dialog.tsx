'use client';

import { useEffect, useRef } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import type { Equipment } from '../lib/catalog';
import RateSchedule from './rate-schedule';

export default function PriceDialog({ equipment, days, start, end, onClose }: {
  equipment: Equipment;
  days?: number;
  start: string;
  end: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const bookingUrl = `/book?gear=${encodeURIComponent(equipment.id)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  return <dialog
    ref={dialog}
    className="prices-dialog"
    aria-labelledby="prices-title"
    onClose={onClose}
    onClick={event => {
      if (event.target !== dialog.current || !dialog.current) return;
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
    }}
  >
    <button
      type="button"
      className="icon-button prices-close"
      aria-label="Close prices"
      onClick={() => dialog.current?.close()}
    ><X size={20} aria-hidden="true" /></button>
    <p className="eyebrow">RENTAL PRICES</p>
    <h2 id="prices-title">{equipment.name}</h2>
    <p className="prices-context">{days
      ? `Your selected rental: ${days} day${days === 1 ? '' : 's'}. The applicable rate is highlighted.`
      : 'Daily rates depend on your rental duration.'}</p>
    <RateSchedule equipment={equipment} days={days} />
    <p className="prices-note">Rates are per rental day. Add-ons are charged separately. The security deposit is refundable after a cleared return inspection.</p>
    <a className="button full-width" href={bookingUrl}>Choose dates & book <ArrowUpRight size={18} aria-hidden="true" /></a>
  </dialog>;
}
