import type {ReactNode} from 'react';
import {Header,Footer} from '../storefront';
import './auth.css';
export default function AuthShell({children}:{children:ReactNode}){return <><Header/><main className="auth-layout wrap"><aside className="auth-story"><p className="eyebrow">YOUR NEXT ADVENTURE STARTS HERE</p><h2>Good gear.<br/>Great stories.</h2><div className="auth-photo"><img src="/assets/x5.jpg" alt="The actual HiramShot Insta360 X5 camera rental kit"/></div><div className="auth-caption"><span>HIRAMSHOT CAMERA RENTALS</span><p>Choose your gear.<br/>Make the moment yours.</p></div></aside><section className="auth-card" aria-label="Your HiramShot account">{children}</section></main><Footer/></>;}
