'use server';
export async function continueWithGoogle(){if(!process.env.AUTH_GOOGLE_ID||!process.env.AUTH_GOOGLE_SECRET||!process.env.AUTH_SECRET)throw new Error('Google sign-in is awaiting configuration.');const {signIn}=await import('../../auth');await signIn('google',{redirectTo:'/account'});}
