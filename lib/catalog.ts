export type Tier = { minDays: number; maxDays: number; min: number; max: number };
export type Variant = { name: string; deposit: [number, number]; tiers: Tier[]; inclusions: string[] };
export type Addon = { id: string; name: string; min: number; max: number };
export type Equipment = { id: string; name: string; category: string; description: string; image: string; video: string; active: boolean; units: number; variants: Variant[]; addons: Addon[] };
const tiers = (a: [number,number], b: [number,number], c: [number,number]): Tier[] => [{ minDays: 1, maxDays: 2, min: a[0], max: a[1] }, { minDays: 3, maxDays: 6, min: b[0], max: b[1] }, { minDays: 7, maxDays: 30, min: c[0], max: c[1] }];
const addons: Addon[] = [{ id: 'battery', name: 'Extra battery', min: 150, max: 150 }, { id: 'dive', name: 'Official dive case', min: 200, max: 200 }, { id: 'mount', name: 'Motorcycle / helmet mount kit', min: 150, max: 150 }];
const cameraInclusions = ['Camera unit', '1–2 batteries with security stickers', 'Charging cable / hub', '64GB or 128GB high-speed memory card', 'Protective case', 'Invisible Selfie Stick'];
export const INITIAL_CATALOG: Equipment[] = [
  { id: 'x5', name: 'Insta360 X5', category: 'Action cameras', description: 'For road trips, spontaneous weekends, and every story in between.', image: '/assets/x5.jpg', video: '/assets/x5.mp4', active: true, units: 1, variants: [{ name: 'Standard', deposit: [1000,1000], tiers: tiers([650,650],[550,550],[450,450]), inclusions: cameraInclusions }], addons },
  { id: 'x6', name: 'Insta360 X6', category: 'Action cameras', description: 'A fresh perspective for your next destination and your next great memory.', image: '/assets/x6.jpg', video: '/assets/x6.mp4', active: true, units: 1, variants: [{ name: 'Standard', deposit: [1500,1500], tiers: tiers([800,800],[700,700],[600,600]), inclusions: cameraInclusions }], addons },
  { id: 'neo2', name: 'DJI Neo 2', category: 'Drones', description: 'Take the scenic route. Choose the drone alone or the Fly More Combo.', image: '/assets/neo2.jpg', video: '/assets/neo2.mp4', active: true, units: 1, variants: [{ name: 'Standard', deposit: [800,800], tiers: tiers([500,500],[450,450],[350,350]), inclusions: ['Drone unit only; final accessories confirmed before reservation'] }, { name: 'Fly More Combo', deposit: [800,800], tiers: tiers([700,700],[600,600],[500,500]), inclusions: ['Drone unit', 'Remote controller', 'Extra batteries', 'Charging accessories and case; final inclusions confirmed before reservation'] }], addons: [addons[0]] },
];
export type Selection = { equipmentId: string; variant: string; addons: string[] };
export function dailyRateTier(variant: Variant, days: number) {
  return variant.tiers.find(t => days >= t.minDays && days <= t.maxDays);
}
export function rateTierLabel(tier: Tier) {
  if (tier.maxDays === 30) return `${tier.minDays}+ days`;
  return tier.minDays === tier.maxDays ? `${tier.minDays} day` : `${tier.minDays}–${tier.maxDays} days`;
}
export function peso(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
}
export function dailyRateText(tier: Tier) {
  return tier.min === tier.max ? `${peso(tier.max)}/day` : `${peso(tier.min)}–${peso(tier.max)}/day`;
}
export function calculateQuote(catalog: Equipment[], items: Selection[], days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 30 || !Array.isArray(items) || items.length < 1 || items.length > 8) throw new Error('Choose 1–8 different units and a rental of 1–30 days.');
  if (new Set(items.map(i => i.equipmentId)).size !== items.length) throw new Error('Each equipment model may be selected once per booking.');
  const lines = items.map(item => {
    const equipment = catalog.find(g => g.id === item.equipmentId && g.active), variant = equipment?.variants.find(v => v.name === item.variant);
    if (!equipment || !variant || !Array.isArray(item.addons) || new Set(item.addons).size !== item.addons.length) throw new Error('Choose valid equipment, packages, and add-ons.');
    const selected = item.addons.map(id => { const a = equipment.addons.find(a => a.id === id); if (!a) throw new Error('An add-on is not available for this unit.'); return a; });
    const tier = dailyRateTier(variant, days);
    return { equipmentId: equipment.id, name: equipment.name, category: equipment.category, variant: variant.name, addons: selected, dailyMin: tier?.min ?? null, dailyMax: tier?.max ?? null, addonMin: selected.reduce((n,a) => n+a.min,0)*days, addonMax: selected.reduce((n,a) => n+a.max,0)*days, depositMin: variant.deposit[0], depositMax: variant.deposit[1], inclusions: variant.inclusions };
  });
  const combo = lines.some(l => /^Insta360 /i.test(l.name)) && lines.some(l => l.equipmentId === 'neo2');
  const discount = combo ? days * 150 : 0, custom = lines.some(l => l.dailyMin === null);
  const totalMin = custom ? null : Math.max(0, lines.reduce((n,l) => n + l.dailyMin! * days + l.addonMin,0) - discount);
  const totalMax = custom ? null : Math.max(0, lines.reduce((n,l) => n + l.dailyMax! * days + l.addonMax,0) - discount);
  return { lines, days, discount, custom, totalMin, totalMax, depositMin: lines.reduce((n,l) => n+l.depositMin,0), depositMax: lines.reduce((n,l) => n+l.depositMax,0), reservationMin: totalMin === null ? null : Math.max(500, Math.ceil(totalMin*.3)), reservationMax: totalMax === null ? null : Math.max(500, Math.ceil(totalMax*.3)) };
}
export type AgreementTerms={location:string;pickupAt:string;returnAt:string;replacementValues:Record<string,number>};
export type Quote = ReturnType<typeof calculateQuote>&{agreementTerms?:AgreementTerms};
export function validateEquipment(value: unknown): Equipment {
  const e = value as Equipment;
  const text = (s: unknown, max: number) => typeof s === 'string' && s.length > 0 && s.length <= max;
  if (!e || !/^[a-z][a-z0-9-]{1,39}$/.test(e.id) || !text(e.name,100) || !text(e.category,60) || !text(e.description,500) || typeof e.active !== 'boolean' || !Number.isInteger(e.units) || e.units < 1 || e.units > 20) throw new Error('Invalid equipment details.');
  for (const path of [e.image,e.video]) if (typeof path !== 'string' || !/^\/assets\/[a-zA-Z0-9_./-]+$/.test(path) || path.includes('..')) throw new Error('Media must use a local /assets/ path.');
  const price = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 1000000;
  if (!Array.isArray(e.variants) || !e.variants.length || e.variants.length>10 || !Array.isArray(e.addons) || e.addons.length>15) throw new Error('Invalid variants or add-ons.');
  if (new Set(e.variants.map(v=>v.name)).size !== e.variants.length || new Set(e.addons.map(a=>a.id)).size !== e.addons.length) throw new Error('Variants and add-ons must be unique.');
  for (const v of e.variants) {
    if (!text(v.name,80) || !Array.isArray(v.deposit) || v.deposit.length!==2 || !v.deposit.every(price) || v.deposit[0]!==v.deposit[1] || !Array.isArray(v.inclusions) || v.inclusions.length>20 || !v.inclusions.every(x=>text(x,200)) || !Array.isArray(v.tiers) || !v.tiers.length || v.tiers.length>30) throw new Error('Packages require a fixed deposit and valid inclusions.');
    const covered = new Set<number>();
    for (const t of v.tiers) { if (!Number.isInteger(t.minDays)||!Number.isInteger(t.maxDays)||t.minDays<1||t.maxDays>30||t.minDays>t.maxDays||!price(t.min)||!price(t.max)||t.min!==t.max||t.min<1) throw new Error('Use a fixed positive daily rate for each tier.'); for(let d=t.minDays;d<=t.maxDays;d++){if(covered.has(d))throw new Error('Rate tiers overlap.');if(t.max*d+v.deposit[1]<Math.max(500,Math.ceil(t.max*d*.3)))throw new Error('The rental plus deposit must cover the minimum reservation payment.');covered.add(d);} }
    if(covered.size!==30)throw new Error('Rates must cover every rental day from 1 through 30.');
  }
  for(const a of e.addons) if(!/^[a-z][a-z0-9-]{1,39}$/.test(a.id)||!text(a.name,80)||!price(a.min)||!price(a.max)||a.min!==a.max)throw new Error('Add-ons require fixed prices and valid details.');
  return e;
}

