const fs = require('fs');
const p = 'app/storefront.tsx'; let s=fs.readFileSync(p,'utf8');
s=s.replace("import { GEAR, rentalDays, todayManila, validateDates, type GearId } from '../lib/rental';", "import { INITIAL_CATALOG, type Equipment } from '../lib/catalog';\nimport { BOOKING_STEPS } from '../lib/policies';\nimport { todayManila, validateDates } from '../lib/rental';");
s=s.replace("const [filter, setFilter] = useState('All gear'), [selected, setSelected] = useState<GearId | null>(null);", "const [filter, setFilter] = useState('All gear'), [gearList, setGearList] = useState<Equipment[]>(INITIAL_CATALOG);\n  useEffect(() => { fetch('/api/catalog').then(r => r.json()).then((v: any) => { if (v.catalog) setGearList(v.catalog); }).catch(() => {}); }, []);\n  function setSelected(id: string) { window.location.href = '/book?gear=' + encodeURIComponent(id) + '&start=' + dates.start + '&end=' + dates.end; }");
const replace={
'Hiram ang<br />camera.<br /><span>Sa’yo ang<br className="desktop-break" /> memories.</span>':'Borrow the<br />gear.<br /><span>Own the<br className="desktop-break" /> moment.</span>',
'Yung lakad, ituloy mo na. Rent a camera or drone<br className="desktop-only" /> and bring home more than just the pasalubong.':'Big plans deserve great gear. Rent a camera or drone<br className="desktop-only" /> and bring every perspective home.',
'Hiram ang camera.':'Borrow the gear.','Sa’yo ang memories.':'Own the moment.',
'May lakad ka na?':'Your next trip?','Gala-ready.':'Adventure-ready.','Ikaw na lang.':'Just add you.',
'Let’s plan your next gala':'Plan your next adventure','Good gear. <span>Great stories.</span>':'Great gear. <span>Greater stories.</span>',
'Tatlong steps.<br /><span>Ang daming memories.</span>':'Five clear steps.<br /><span>One great adventure.</span>',
'First time? We’ll keep it simple.<br />Pili. Request. Gala.':'From choosing your gear to receiving your deposit refund.<br />Know what happens at every step.',
'Tanong mo.<br /><span>Sagot namin.</span>':'A few questions.<br /><span>Clear answers.</span>',
'MAY GALA KA SOON?':'YOUR NEXT ADVENTURE IS WAITING',
'May camera kang <span>mahihiram.</span>':'Your story. <span>Our gear.</span>',
'Your next story deserves more than a “sayang, sana.”':'Make room for the moments you will want to replay.',
'Para sa <em>“tara, alis tayo”</em><br />at sa <em>“buti na lang sumama ako.”</em>':'For the <em>“let’s go somewhere”</em><br />and the <em>“I’m glad we did.”</em>',
'Choose your dates. Get a quote. Make memories.':'Choose your dates. See your rate. Make memories.',
'Quote before you commit':'Clear rates before you commit',
'Your dates, your quote. All rentals are subject to HiramShot confirmation.':'Exact rates. Flexible plans. Slots are reserved only after verified downpayment.',
'First time renting?':'How renting works',
'Choose your plus-one for the next adventure.':'Your next travel companion. Daily rates get better the longer you rent.',
'No payments or ID upload required.':'Private verification and a clear booking process.',
};
for(const [a,b]of Object.entries(replace))s=s.split(a).join(b);
const a=s.indexOf('const faq = ['),b=s.indexOf('export default function Storefront');
s=s.slice(0,a)+`const faq = [
 ['How are rental rates calculated?', 'Daily rates depend on the unit, package, and rental duration: 1–2 days, 3–6 days, or 7+ days. The calculator includes selected add-ons and a PHP 150/day combo discount for an Insta360 camera with DJI Neo 2.'],
 ['How much is the reservation downpayment?', 'The downpayment is 30% of the rental total, with a PHP 500 minimum. Any amount above the rental fee is credited toward your refundable deposit. Your slot is locked only after HiramShot confirms receipt.'],
 ['What is required for verification?', 'After reservation, complete your details, two government IDs, company or school ID, proof of billing, a selfie with one ID, and a one-minute video verification call through the private process.'],
 ['Can a courier collect my first rental?', 'First-time renters must use self-pickup or an agreed meetup. Third-party couriers are not permitted for first-time rentals. Pickup location and exact times are agreed before confirmation.'],
 ['When are my identity documents deleted?', 'Uploaded KYC files are scheduled for deletion seven calendar days after your rental is marked Cleared & Returned. Booking transaction history and contract integrity hashes are retained.'],
 ['When is my security deposit refunded?', 'The full security deposit is due for immediate refund once the return inspection confirms that the equipment and accessories are complete, undamaged, and working properly.'],
];\n`+s.slice(b);
s=s.replace("GEAR.filter(g => filter === 'All gear' || (filter === 'Drones' ? g.category === 'Drone' : g.category === 'Action camera'))", "gearList.filter(g => g.active && (filter === 'All gear' || g.category === filter))");
s=s.replace("['All gear', 'Action cameras', 'Drones'].map", "['All gear', ...Array.from(new Set(gearList.filter(g => g.active).map(g => g.category)))].map");
s=s.replace('{g.tag}', '{g.category}');
s=s.replace("{g.id === 'neo2' ? 'Standard / Fly More Combo' : 'Optional charger + extra battery'}", "{g.variants.map(v => v.name).join(' / ')}");
s=s.replace('<strong>Request a quote</strong>', '<strong>From ₱{Math.min(...g.variants.flatMap(v => v.tiers.map(t => t.min))).toLocaleString()}/day</strong>');
s=s.replace("{g.battery ? 'Battery add-on: +₱150/day' : 'Choose your preferred package'}", "{`Deposit from ₱${Math.min(...g.variants.map(v => v.deposit[0])).toLocaleString()}`}");
s=s.replace('View ${g.name} rental options','View ${g.name} rental options');
s=s.replace('<p className="catalog-note">', '<div className="kit-videos">{gearList.filter(g => g.active && g.video).map(g => <article key={g.id}><div className="video-heading"><Camera size={16} aria-hidden="true" /><h3>{g.name} · Kit preview</h3></div><video controls playsInline preload="none" poster={g.image} aria-label={`${g.name} kit preview`}><source src={g.video} type="video/mp4" /><track kind="captions" srcLang="en" label="English captions" src="/assets/kit-captions.vtt" default /></video><p>Product footage with on-screen labels; no spoken narration.</p></article>)}</div><p className="catalog-note">');
const stepStart=s.indexOf('<ol className="steps">'),stepEnd=s.indexOf('</ol>',stepStart);
s=s.slice(0,stepStart)+'<ol className="steps">{BOOKING_STEPS.map(([title, description], i) => <li key={title}><span className="step-number">0{i+1}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={21} aria-hidden="true" /></li>)}</ol>'+s.slice(stepEnd+5);
s=s.replace("<Footer />{selected && <RentalDialog gearId={selected} dates={dates} user={user} close={() => setSelected(null)} />}", '<Footer />');
s=s.slice(0,s.indexOf('\nfunction RentalDialog'));
s=s.replace('<a href="/#faqs" onClick={() => setMenu(false)}>FAQs</a>', '<a href="/#faqs" onClick={() => setMenu(false)}>FAQs</a><a href="/policies" onClick={() => setMenu(false)}>Policies</a>');
fs.writeFileSync(p,s);
const l='app/layout.tsx';s=fs.readFileSync(l,'utf8').replace('Hiram ang camera. Sa’yo ang memories.','Borrow the gear. Own the moment.').replace('lang="fil"','lang="en"');fs.writeFileSync(l,s);
