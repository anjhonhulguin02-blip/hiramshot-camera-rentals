export function unbase64(s:string) { return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
export async function digest(data:Uint8Array|string){const input=typeof data==='string'?new TextEncoder().encode(data):data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',input as BufferSource))].map(b=>b.toString(16).padStart(2,'0')).join('');}
