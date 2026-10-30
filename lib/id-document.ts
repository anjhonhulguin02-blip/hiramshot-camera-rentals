// HiramShot's supported capture categories. A selected type is a client claim,
// not an issuer-authenticated verdict. Never store ID numbers in this metadata.
export const GOVERNMENT_IDS=[
 {id:'drivers-license',label:'Driver’s License (LTO)'},
 {id:'national-id',label:'National ID / PhilID / ePhilID / Digital National ID'},
 {id:'passport',label:'Philippine Passport'},
 {id:'umid',label:'UMID'},
 {id:'prc-id',label:'PRC Professional Identification Card'},
 {id:'philhealth-id',label:'PhilHealth ID'},
 {id:'sss-id',label:'SSS ID'},
 {id:'gsis-id',label:'GSIS eCard / ID'},
 {id:'postal-id',label:'Postal ID'},
 {id:'voters-id',label:'Voter’s ID'},
 {id:'senior-citizen-id',label:'Senior Citizen ID'},
 {id:'pwd-id',label:'PWD ID'},
 {id:'tin-id',label:'BIR / TIN ID with photo'},
 {id:'ibp-id',label:'Integrated Bar of the Philippines ID'},
] as const;
export const ORGANIZATION_IDS=[{id:'company-id',label:'Company ID'},{id:'school-id',label:'School ID'}] as const;
export function governmentKind(kind:string){return kind==='government-id-1'||kind==='government-id-2';}
export function identityPhotoKind(kind:string){return governmentKind(kind)||kind==='company-school-id'||kind==='selfie-with-id';}
export function idOptions(kind:string){return governmentKind(kind)?GOVERNMENT_IDS:kind==='company-school-id'?ORGANIZATION_IDS:[];}
export function idTypeLabel(type?:string|null){return [...GOVERNMENT_IDS,...ORGANIZATION_IDS].find(item=>item.id===type)?.label||'ID type not recorded';}
export function captureMetadata(kind:string,value:unknown,source:unknown){
 const options=idOptions(kind);let idType:string|null=null;
 if(options.length){if(typeof value!=='string'||!options.some(option=>option.id===value))throw new Error('Choose the type of ID you are submitting.');idType=value;}
 else if(value!==null&&value!==undefined&&value!=='')throw new Error('This requirement does not use a government ID type.');
 if(source!=='camera'&&source!=='file')throw new Error('Choose camera capture or a document from your device.');
 return {idType,captureSource:source as 'camera'|'file'};
}
export function validateGovernmentIdPair(docs:{kind:string;id_type?:string|null;deleted_at?:string|null}[]){
 const first=docs.find(doc=>doc.kind==='government-id-1'&&!doc.deleted_at),second=docs.find(doc=>doc.kind==='government-id-2'&&!doc.deleted_at);
 if(!first?.id_type||!second?.id_type||![first,second].every(doc=>GOVERNMENT_IDS.some(type=>type.id===doc.id_type)))throw new Error('Both government IDs need a supported ID type. Request replacement of older submissions without one.');
 if(first.id_type===second.id_type)throw new Error('Use two different government ID types. The front and back of one ID cannot count as two IDs.');
}
export function imageDimensions(bytes:Uint8Array,mime:string):{width:number;height:number}|null{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/png'&&bytes.length>=24)return {width:view.getUint32(16),height:view.getUint32(20)};
 if(mime==='image/jpeg'){
  let offset=2;while(offset+4<bytes.length){if(bytes[offset++]!==255)return null;while(bytes[offset]===255)offset++;if(offset+3>bytes.length)return null;const marker=bytes[offset++];if(marker===0xda||marker===0xd9)return null;const length=view.getUint16(offset);if(length<2||offset+length>bytes.length)return null;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7)return {width:view.getUint16(offset+5),height:view.getUint16(offset+3)};offset+=length;
  }
 }
 if(mime==='image/webp'){
  const tag=(offset:number)=>String.fromCharCode(...bytes.slice(offset,offset+4));let offset=12;
  while(offset+8<=bytes.length){const type=tag(offset),length=view.getUint32(offset+4,true),data=offset+8;if(data+length>bytes.length)return null;
   if(type==='VP8X'&&length>=10)return {width:1+bytes[data+4]+(bytes[data+5]<<8)+(bytes[data+6]<<16),height:1+bytes[data+7]+(bytes[data+8]<<8)+(bytes[data+9]<<16)};
   if(type==='VP8 '&&length>=10&&bytes[data+3]===157&&bytes[data+4]===1&&bytes[data+5]===42)return {width:view.getUint16(data+6,true)&16383,height:view.getUint16(data+8,true)&16383};
   if(type==='VP8L'&&length>=5&&bytes[data]===47)return {width:1+(((bytes[data+2]&63)<<8)|bytes[data+1]),height:1+(((bytes[data+4]&15)<<10)|(bytes[data+3]<<2)|(bytes[data+2]>>6))};
   offset=data+length+(length%2);
  }
 }
 return null;
}
export function validateIdentityPhoto(kind:string,bytes:Uint8Array,mime:string){
 if(!identityPhotoKind(kind))return;
 const size=imageDimensions(bytes,mime);if(!size)throw new Error('Use a clear JPG, PNG or WebP photo for IDs and selfies. PDFs are accepted for billing proof.');
 const short=Math.min(size.width,size.height),long=Math.max(size.width,size.height);
 if(short<360||long<600||(kind==='selfie-with-id'&&short<480))throw new Error('This photo is too small to review. Retake a closer, clear photo with the whole ID visible.');
 if(size.width>12000||size.height>12000||size.width*size.height>40000000)throw new Error('This image is too large to process. Use the camera scanner or export a smaller photo.');
}
