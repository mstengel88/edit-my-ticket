# iOS Release Checklist

This project is ready for a TestFlight-style release flow, but there are still a few account and App Store Connect tasks that must be completed outside the repo.

## Local release flow

1. Sync the latest web app into the native shell:

```sh
npm run build:ios
```

2. Open the Xcode workspace:

```sh
npm run cap:open:ios
```

3. In Xcode:

- Set your Apple Developer team under Signing & Capabilities.
- Replace the default bundle identifier `com.ticketcreator.app` with your production identifier if needed.
- Confirm the app version and build number before each release.
- Archive the app from Product > Archive, or use the CLI command below.

4. Optional CLI archive:

```sh
npm run ios:archive
```

5. Optional export using the included App Store Connect export template:

```sh
npm run ios:export:appstore
```

The export template lives at `ios/App/ExportOptions-AppStore.plist`.

## App icon and screenshots

The app now has a branded placeholder icon in the native asset catalog, but it should still be replaced with a final production icon set before launch.

Prepare:

- Final App Store icon: 1024 x 1024, no transparency.
- iPhone screenshots: capture the current iPhone-size UI with real data.
- iPad screenshots: capture the tablet layouts added in this pass, in both major workflows and a representative orientation.

Suggested screenshot set:

- Ticket list
- Ticket editor
- Ticket preview / print preview
- Reports
- Customers or Products management

## App Store Connect metadata

Before TestFlight external testing or App Store submission, prepare:

- App name
- Subtitle
- Description
- Keywords
- Support URL
- Marketing URL if you have one
- Privacy Policy URL
- App Review contact information
- Demo account or review credentials if sign-in is required

## Privacy and compliance

This project currently does not include a checked-in privacy policy file or public privacy-policy URL. You will need one before App Store distribution.

Review these items:

- App Privacy answers in App Store Connect
- Export compliance / encryption answers
- Whether Supabase auth, analytics, logs, or email flows collect customer or operator data
- Any third-party SDK data collection that must be disclosed

## TestFlight readiness

Before inviting external testers:

- Verify sign-in flow on a clean device
- Verify keyboard behavior on iPhone
- Verify tablet layouts on iPad
- Verify email and print flows
- Verify error states when offline or when Supabase is unavailable
- Add release notes for testers

## Recommended release notes draft

```text
Initial TestFlight build for Ticket Creator.

- Native iPhone and iPad app shell
- Ticket management, editing, preview, and reporting
- Improved iPad layouts and native keyboard/status bar behavior
```
