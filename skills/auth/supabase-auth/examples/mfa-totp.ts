// Enroll: returns a QR code (totp.uri) and a secret; the user proves
// enrollment by entering a valid code before the factor is verified.
const { data: factor } = await supabase.auth.mfa.enroll({
  factorType: "totp",
  friendlyName: "Authenticator app",
});

// Sign-in challenge step: challenge, then verify the code from the app.
const { data: challenge } =
  await supabase.auth.mfa.challenge({ factorId: factor.id });
const { data } = await supabase.auth.mfa.verify({
  factorId: factor.id,
  challengeId: challenge.id,
  code: codeFromUser,
});
// A verified factor upgrades the session JWT to aal2.
