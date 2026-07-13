# Account Owner Actions

The repository and automation cannot legally or securely complete these actions without the account holder.

## Apple

1. Enroll or confirm Apple Developer Program membership.
2. Confirm the legal seller/developer name.
3. Reserve `io.github.paq6809.reelscribe` or approve a replacement identifier.
4. Create the App Store Connect record.
5. Create and protect distribution certificates/profiles.
6. Accept agreements and complete required contact/tax details.
7. Approve App Privacy answers and age rating.
8. Upload the signed build and submit it for review.
9. Approve phased public release.

## Google Play

1. Create/verify the developer account.
2. Reserve the application ID.
3. Create and securely back up the upload key.
4. Enable Play App Signing.
5. Complete developer identity, contact and required testing tracks.
6. Approve Data Safety, ads, app access and content rating answers.
7. Upload the signed Android App Bundle.
8. Submit the production release and approve staged rollout.

## Information not to send in chat or commit

- Apple private keys or `.p12` passwords.
- Provisioning profiles containing private signing material.
- Android keystore files or passwords.
- App Store Connect API private keys.
- Google service-account private keys.
- Recovery codes, passkeys or two-factor codes.

Use each platform's secure credential store or protected CI environment. The repository should contain only public identifiers and non-secret configuration.
