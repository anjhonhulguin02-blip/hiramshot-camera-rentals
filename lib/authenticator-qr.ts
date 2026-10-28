import qrcode from 'qrcode-generator';

// The provisioned secret stays in page memory. Never send this URI to a QR API.
export function authenticatorQr(uri:string,secret:string){
 if(uri.length>1024||!/^[A-Z2-7]{32}$/.test(secret))throw new Error('Invalid authenticator setup.');
 const url=new URL(uri);
 if(url.protocol!=='otpauth:'||url.hostname!=='totp'||!url.pathname.startsWith('/HiramShot:')||url.searchParams.get('secret')!==secret||url.searchParams.get('issuer')!=='HiramShot'||url.searchParams.get('algorithm')!=='SHA1'||url.searchParams.get('digits')!=='6'||url.searchParams.get('period')!=='30')throw new Error('Invalid authenticator setup.');
 const qr=qrcode(0,'M');qr.addData(uri,'Byte');qr.make();
 const count=qr.getModuleCount(),quiet=4,size=count+quiet*2;
 let path='';
 for(let row=0;row<count;row++)for(let col=0;col<count;){
  if(!qr.isDark(row,col)){col++;continue;}
  const start=col;while(col<count&&qr.isDark(row,col))col++;
  path+=`M${start+quiet} ${row+quiet}h${col-start}v1h-${col-start}z`;
 }
 return {size,path};
}
