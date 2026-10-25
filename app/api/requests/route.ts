export async function GET(){return Response.json({error:'This legacy endpoint has been replaced by /api/bookings.'},{status:410,headers:{'Cache-Control':'no-store'}});}
export const POST=GET;
export const PATCH=GET;
