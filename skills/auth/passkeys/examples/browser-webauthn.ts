import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

if (!browserSupportsWebAuthn()) {
  // Show the password (or other) sign-in path instead.
}

// Registration: fetch options, run the ceremony, post the response.
const options = await (await fetch("/auth/passkeys/register/options")).json();
const response = await startRegistration({ optionsJSON: options });
await fetch("/auth/passkeys/register/verify", {
  method: "POST",
  body: JSON.stringify(response),
});

// Authentication: same shape, with an empty allowCredentials list on the
// server so the authenticator offers the user's discoverable credentials.
const authOptions = await (await fetch("/auth/passkeys/login/options")).json();
const assertion = await startAuthentication({ optionsJSON: authOptions });
await fetch("/auth/passkeys/login/verify", {
  method: "POST",
  body: JSON.stringify(assertion),
});
