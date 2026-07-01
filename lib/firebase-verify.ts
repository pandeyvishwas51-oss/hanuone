/**
 * Verify a Firebase phone-auth ID token WITHOUT the Admin SDK / service account.
 *
 * Firebase ID tokens are RS256 JWTs signed by Google. We verify them against
 * Google's public JWKS and check issuer + audience = our project id. This is
 * exactly what the Admin SDK does under the hood for ID tokens.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

// Google's public keys for Firebase secure tokens (JWKS form).
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface FirebaseClaims {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseClaims> {
  if (!PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID not configured");
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID
  });
  const uid = (payload.sub as string) || (payload.user_id as string) || "";
  if (!uid) throw new Error("Token missing subject");
  return {
    uid,
    phoneNumber: (payload.phone_number as string) || null,
    email: (payload.email as string) || null,
    emailVerified: !!payload.email_verified,
    name: (payload.name as string) || null,
    picture: (payload.picture as string) || null
  };
}
