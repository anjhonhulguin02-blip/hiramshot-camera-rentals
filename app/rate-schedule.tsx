import { dailyRateTier, dailyRateText, rateTierLabel, peso, type Equipment } from '../lib/catalog';

export default function RateSchedule({ equipment, days, variantName }: {
  equipment: Equipment;
  days?: number;
  variantName?: string;
}) {
  const variants = variantName
    ? equipment.variants.filter(v => v.name === variantName)
    : equipment.variants;

  return <div className="rate-schedule" aria-label={`${equipment.name} daily rental rates`}>
    {variants.map(variant => {
      const selectedTier = dailyRateTier(variant, days ?? 1);
      return <div className="rate-package" key={variant.name}>
        <p className="rate-package-name">{variant.name} · daily rental rates</p>
        <dl>
          {variant.tiers.map(tier => <div
            className={selectedTier === tier ? 'rate-tier current' : 'rate-tier'}
            key={`${tier.minDays}-${tier.maxDays}`}
          >
            <dt>{rateTierLabel(tier)}</dt>
            <dd>{dailyRateText(tier)}</dd>
          </div>)}
        </dl>
        <p className="rate-package-deposit">Refundable deposit: {peso(variant.deposit[1])}</p>
      </div>;
    })}
  </div>;
}
