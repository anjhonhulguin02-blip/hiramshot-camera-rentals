export function captureCrop(sourceWidth:number,sourceHeight:number,viewWidth:number,viewHeight:number,guideWidth:number,guideHeight:number){
 if([sourceWidth,sourceHeight,viewWidth,viewHeight,guideWidth,guideHeight].some(value=>!Number.isFinite(value)||value<=0))throw new Error('The camera is not ready. Wait for its preview.');
 const scale=Math.max(viewWidth/sourceWidth,viewHeight/sourceHeight),width=Math.min(sourceWidth,guideWidth/scale),height=Math.min(sourceHeight,guideHeight/scale);
 return {x:(sourceWidth-width)/2,y:(sourceHeight-height)/2,width,height};
}
export function cameraErrorMessage(error:unknown){
 const name=error&&typeof error==='object'&&'name' in error?String(error.name):'';
 if(['NotAllowedError','PermissionDeniedError','SecurityError'].includes(name))return 'Camera access was not allowed. Enable it for hiramshot.com, use your phone camera below, or choose an existing photo.';
 if(['NotFoundError','DevicesNotFoundError'].includes(name))return 'No camera was found. Open HiramShot on your phone or choose an existing photo.';
 if(['NotReadableError','TrackStartError'].includes(name))return 'Another app may be using your camera. Close it and try again, or use your phone camera below.';
 return error instanceof Error&&error.message?error.message:'The camera could not start. Try the phone camera option or choose an existing photo.';
}
