export const MAX_FILE=5*1024*1024;
const decoder=new TextDecoder('latin1');
export function sanitizeUpload(name:string,mime:string,bytes:Uint8Array){
  if(!bytes.length||bytes.length>MAX_FILE)throw new Error('Each document must be no larger than 5 MB.');
  const ext=name.toLowerCase().split('.').pop();let expected='';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)expected='image/jpeg';
  else if(bytes.length>24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))expected='image/png';
  else if(decoder.decode(bytes.slice(0,4))==='RIFF'&&decoder.decode(bytes.slice(8,12))==='WEBP')expected='image/webp';
  else if(decoder.decode(bytes.slice(0,5))==='%PDF-')expected='application/pdf';
  const extensions:Record<string,string[]>= {'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp'],'application/pdf':['pdf']};
  if(!expected||mime!==expected||!extensions[expected].includes(ext??''))throw new Error('File extension, MIME type, and file contents must match JPG, PNG, WebP, or PDF.');
  if(expected==='application/pdf'){
    const text=decoder.decode(bytes);
    if(!text.slice(-1024).includes('%%EOF')||/\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|RichMedia|XFA|Encrypt|AcroForm)\b/i.test(text)||/#(?:4a|4A|6a|6A|53|73)/.test(text))throw new Error('Use a plain, unencrypted PDF without scripts, attachments, or interactive forms.');
    return {bytes,mime:expected};
  }
  const parts:Uint8Array[]=[];
  if(expected==='image/jpeg'){
    parts.push(bytes.slice(0,2));let p=2,scan=false;
    while(p<bytes.length){if(bytes[p]!==255)throw new Error('Invalid JPEG structure.');const start=p;while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===0xda){parts.push(bytes.slice(start));scan=true;break;}if(marker===0xd9){parts.push(bytes.slice(start,p));break;}if(p+2>bytes.length)throw new Error('Invalid JPEG segment.');const len=(bytes[p]<<8)|bytes[p+1];if(len<2||p+len>bytes.length)throw new Error('Invalid JPEG length.');if(marker===0xc2)throw new Error('Please re-save progressive JPEG images as a standard JPEG or PNG.');if(!(marker>=0xe1&&marker<=0xef)&&marker!==0xfe)parts.push(bytes.slice(start,p+len));p+=len;}
    if(!scan||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw new Error('Incomplete JPEG image.');
  }else if(expected==='image/png'){
    parts.push(bytes.slice(0,8));let p=8,header=false,data=false,end=false;
    while(p+12<=bytes.length){const len=new DataView(bytes.buffer,bytes.byteOffset+p,4).getUint32(0),type=decoder.decode(bytes.slice(p+4,p+8));if(len>MAX_FILE||p+12+len>bytes.length)throw new Error('Invalid PNG length.');if(type==='IHDR'){if(header||p!==8||len!==13)throw new Error('Invalid PNG header.');header=true;}if(type==='IDAT')data=true;if(['IHDR','PLTE','IDAT','IEND','tRNS'].includes(type))parts.push(bytes.slice(p,p+12+len));p+=12+len;if(type==='IEND'){end=true;break;}}
    if(!header||!data||!end||p!==bytes.length)throw new Error('Invalid PNG structure.');
  }else{
    if(new DataView(bytes.buffer,bytes.byteOffset+4,4).getUint32(0,true)+8!==bytes.length)throw new Error('Invalid WebP length.');parts.push(bytes.slice(0,12));let p=12,image=false;
    while(p+8<=bytes.length){const type=decoder.decode(bytes.slice(p,p+4)),len=new DataView(bytes.buffer,bytes.byteOffset+p+4,4).getUint32(0,true),end=p+8+len+(len%2);if(end>bytes.length)throw new Error('Invalid WebP chunk.');if(type==='ANIM'||type==='ANMF')throw new Error('Animated document images are not supported.');if(type==='VP8 '||type==='VP8L')image=true;if(!['EXIF','XMP ','ICCP'].includes(type)){const chunk=bytes.slice(p,end);if(type==='VP8X'&&chunk.length>8)chunk[8]&=~(0x08|0x04|0x20);parts.push(chunk);}p=end;}if(!image||p!==bytes.length)throw new Error('Invalid WebP structure.');
  }
  const size=parts.reduce((n,b)=>n+b.length,0),result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}if(expected==='image/webp')new DataView(result.buffer).setUint32(4,result.length-8,true);
  return {bytes:result,mime:expected};
}
export async function boundedBytes(request:Request,limit:number){if(Number(request.headers.get('content-length'))>limit)throw new Error('Upload is too large.');const reader=request.body?.getReader();if(!reader)throw new Error('A file is required.');const chunks:Uint8Array[]=[];let size=0;while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit){await reader.cancel();throw new Error('Upload is too large.');}chunks.push(r.value);}const all=new Uint8Array(size);let p=0;for(const c of chunks){all.set(c,p);p+=c.length;}return all;}
