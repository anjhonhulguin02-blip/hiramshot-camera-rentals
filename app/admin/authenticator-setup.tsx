'use client';
import {useMemo} from 'react';
import {authenticatorQr} from '../../lib/authenticator-qr';

export default function AuthenticatorSetup({secret,uri}:{secret:string;uri:string}){
 const qr=useMemo(()=>{try{return authenticatorQr(uri,secret);}catch{return null;}},[uri,secret]);
 return <div className="authenticator-setup">
  {qr&&<div className="authenticator-qr"><svg role="img" aria-label="Scan this QR code with your authenticator app" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${qr.size} ${qr.size}`} width="260" height="260" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="#fff"/><path d={qr.path} fill="#111"/></svg></div>}
  <div className="authenticator-instructions"><h3>{qr?'Scan to connect your authenticator.':'Connect your authenticator.'}</h3><ol><li>Open Google Authenticator or Microsoft Authenticator.</li><li>{qr?'Add an account, choose Scan a QR code, then scan here.':'Add an account using the manual setup key below.'}</li><li>Enter the six-digit code below to confirm enrollment.</li></ol><details><summary>Can’t scan? Use the manual setup key</summary><p className="admin-notice">Manual authenticator setup key: <strong className="account-id">{secret}</strong><br/>Use time-based codes, 6 digits, and a 30-second period.</p></details><p className="authenticator-private">Keep the QR code and setup key private. Setup expires after 10 minutes.</p></div>
 </div>;
}
