import { PDFDocument,StandardFonts,rgb,type PDFPage } from 'pdf-lib';
import { LOGO_BASE64 } from './logo-data';
import { POLICIES,POLICY_VERSION } from './policies';
import { digest,unbase64 } from './crypto';
import type { Quote } from './catalog';
export type Signature={name:string;strokes:number[][][]};
export function validateSignature(v:unknown):Signature{const s=v as Signature;if(!s||typeof s.name!=='string'||s.name.trim().length<2||s.name.length>100||!Array.isArray(s.strokes)||s.strokes.length>150)throw new Error('Provide your full legal name and signature.');let points=0;for(const stroke of s.strokes){if(!Array.isArray(stroke)||stroke.length<1)throw new Error('Invalid signature.');for(const p of stroke){if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))throw new Error('Invalid signature coordinates.');if(++points>5000)throw new Error('Signature is too large.');}}return {name:s.name.trim(),strokes:s.strokes};}
export async function generateContract(input:{id:string;name:string;start:string;end:string;days:number;quote:Quote;timestamp:string;ip:string;signature:Signature;contactEmail:string}){
  const canonical=JSON.stringify({...input,policyVersion:POLICY_VERSION,policies:POLICIES});const contentHash=await digest(canonical);
  const pdf=await PDFDocument.create();pdf.setTitle('HiramShot Camera & Gear Rental Agreement');pdf.setAuthor('HiramShot Camera Rentals');pdf.setCreationDate(new Date(input.timestamp));
  const regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),italic=await pdf.embedFont(StandardFonts.TimesRomanItalic),logo=await pdf.embedPng(unbase64(LOGO_BASE64));
  const charcoal=rgb(.118,.118,.118),gray=rgb(.37,.39,.41),orange=rgb(1,.353,.122);let page!:PDFPage,y=0;
  const clean=(s:string)=>s.replace(/₱/g,'PHP ').replace(/[–—]/g,'-').replace(/[^\x20-\x7e\u00a0-\u00ff\u2018-\u201d]/g,'?');
  function newPage(){page=pdf.addPage([595.28,841.89]);y=735;page.drawImage(logo,{x:45,y:758,width:94,height:62.4});page.drawText('CAMERA & GEAR RENTAL AGREEMENT',{x:166,y:793,size:12,font:bold,color:charcoal});page.drawText('HiramShot Camera Rentals',{x:166,y:774,size:9,font:regular,color:gray});page.drawLine({start:{x:45,y:745},end:{x:550,y:745},thickness:1,color:orange});}
  function paragraph(text:string,size=9.5,font=regular,color=charcoal){const width=505,words=clean(text).split(/\s+/);let line='';for(const w of words){const candidate=line?line+' '+w:w;if(font.widthOfTextAtSize(candidate,size)>width&&line){if(y<65)newPage();page.drawText(line,{x:45,y,size,font,color});y-=size*1.55;line=w;}else line=candidate;}if(line){if(y<65)newPage();page.drawText(line,{x:45,y,size,font,color});y-=size*1.55;}y-=7;}
  function heading(text:string){if(y<110)newPage();y-=6;paragraph(text,11,bold);}
  newPage();heading('Parties and booking');paragraph(`Booking reference: ${input.id}`);paragraph(`Renter: ${input.name} | Lessor: HiramShot Camera Rentals`);paragraph(`Pickup date: ${input.start} | Return date: ${input.end} | Rental days: ${input.days}`);paragraph(`Business contact: ${input.contactEmail}`);
  if(input.quote.agreementTerms){const t=input.quote.agreementTerms;paragraph(`Agreed pickup location: ${t.location}`);paragraph(`Pickup: ${t.pickupAt} | Return cutoff: ${t.returnAt}`);for(const l of input.quote.lines)paragraph(`${l.name} agreed market replacement value: PHP ${t.replacementValues[l.equipmentId]}`);}
  heading('Equipment and charges');for(const l of input.quote.lines)paragraph(`${l.name} - ${l.variant}. Daily rate: PHP ${l.dailyMax}. Add-ons: ${l.addons.map(a=>`${a.name} (PHP ${a.max}/day)`).join(', ')||'None'}. Inclusions: ${l.inclusions.join('; ')}.`);
  paragraph(`Combo discount: PHP ${input.quote.discount}. Total rental: PHP ${input.quote.totalMax}. Refundable deposit: PHP ${input.quote.depositMax}. Reservation downpayment: PHP ${input.quote.reservationMax}.`);
  paragraph('Any downpayment exceeding the rental charge is credited toward the refundable deposit. The remaining rental balance and deposit are payable before or at turnover.');
  paragraph('The exact pickup location, cutoff times, inspection record, and documented replacement values must be agreed in the handover record before equipment is released. This agreement does not itself prove payment or handover.');
  heading(`Rental terms - version ${POLICY_VERSION}`);for(const p of POLICIES){heading(p.title);paragraph(p.text);}
  heading('Privacy and verification');paragraph('Verification documents are accessed only through authorized private review. Uploaded KYC files are scheduled for deletion seven calendar days after Cleared & Returned, and the personal verification form is removed at that time. The transaction record and contract integrity hashes are retained. Contract retention is governed by the published privacy notice and applicable legal requirements.');
  heading('Electronic acknowledgement and signature');paragraph('By signing, the renter confirms that they reviewed and accepted every listed policy and authorized the recorded electronic signature. A file hash supports integrity checking; it does not independently establish identity, legal enforceability, or non-repudiation.');
  if(y<230)newPage();const boxY=y-110;page.drawRectangle({x:45,y:boxY,width:505,height:100,borderWidth:.6,borderColor:gray});
  if(input.signature.strokes.length){for(const stroke of input.signature.strokes)for(let i=1;i<stroke.length;i++)page.drawLine({start:{x:58+stroke[i-1][0]*470,y:boxY+92-stroke[i-1][1]*80},end:{x:58+stroke[i][0]*470,y:boxY+92-stroke[i][1]*80},thickness:1.4,color:charcoal});}else page.drawText(clean(input.signature.name).slice(0,60),{x:60,y:boxY+40,size:25,font:italic,color:charcoal});y=boxY-20;
  paragraph(`Signed by: ${input.signature.name}`,10,bold);paragraph(`Signed at: ${input.timestamp} | Source IP: ${input.ip}`,8);paragraph(`Agreement content SHA-256: ${contentHash}`,7);paragraph('The exact PDF file SHA-256 is stored separately and supplied with the download for independent verification.',8);
  const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:45,y:43},end:{x:550,y:43},thickness:.5,color:gray});p.drawText(`HIRAMSHOT  |  ${input.id.slice(0,8).toUpperCase()}  |  ${POLICY_VERSION}`,{x:45,y:29,size:7,font:regular,color:gray});p.drawText(`${i+1} / ${pages.length}`,{x:520,y:29,size:7,font:regular,color:gray});});
  const bytes=await pdf.save();return {bytes,hash:await digest(bytes),contentHash};
}


