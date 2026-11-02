import {DOCUMENT_KINDS} from './verification';
type ReceivedDocument={kind:string;deleted_at?:string|null;scan_status?:string};
// A successful receipt can advance the form before refreshed props arrive.
export function nextDocumentKind(docs:ReceivedDocument[],receivedKind?:string){
 return DOCUMENT_KINDS.find(kind=>kind!==receivedKind&&!docs.some(doc=>doc.kind===kind&&!doc.deleted_at&&doc.scan_status==='CLEAN'));
}
