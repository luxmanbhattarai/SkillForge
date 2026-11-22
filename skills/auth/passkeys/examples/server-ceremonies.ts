import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const rpName = "My App";
const rpID = "example.com"; // Bare domain; credentials are bound to it.
const origin = `https://${rpID}`;

// Registration step 1: options for the browser to pass to the authenticator.
const options = await generateRegistrationOptions({
  rpName,
  rpID,
  userID: user.webauthnId, // Opaque random ID, not the email.
  userName: user.email,
  userDisplayName: user.name,
  authenticatorSelection: {
    residentKey: "required", // Discoverable credential (a passkey).
    userVerification: "preferred",
  },
});
// Store options.challenge (single-use, short TTL) against the session.

// Registration step 2: verify the authenticator's response.
const verification = await verifyRegistrationResponse({
  response: bodyFromClient,
  expectedChallenge: storedChallenge,
  expectedOrigin: origin,
  expectedRPID: rpID,
});
if (verification.verified && verification.registrationInfo) {
  const { credential } = verification.registrationInfo;
  // Store credential.id, credential.publicKey, credential.counter,
  // credential.transports, and credentialDeviceType/backup flags.
}
