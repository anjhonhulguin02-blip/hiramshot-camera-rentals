import {siteUrl,contactEmail} from '../../lib/site';
export function generateMetadata(){return {alternates:{canonical:siteUrl('/policies')}};}
import { Header,Footer } from '../storefront';
import { POLICIES,POLICY_VERSION } from '../../lib/policies';
export default function Policies(){const email=contactEmail();return <><Header/><main className="account-page wrap legal"><p className="eyebrow">CLEAR TERMS. BETTER RENTALS.</p><h1 className="page-title">Rules & policies.</h1><p>Read these terms before booking. They are included in the digital rental agreement. Version: {POLICY_VERSION}.</p>{POLICIES.map(p=><section key={p.title}><h2>{p.title}</h2><p>{p.text}</p></section>)}<h2>Questions before booking?</h2><p>Email <a href={'mailto:'+email}>{email}</a>. Equipment availability, exact pickup arrangements, and documented replacement values are confirmed before reservation.</p><a className="button" href="/book">Calculate your rental</a></main><Footer/></>;}
