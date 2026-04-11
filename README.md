# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Capacitor for native iOS packaging

## Native iOS

This app can now be packaged as a native iOS app with Capacitor.

1. Install dependencies:

```sh
npm install
```

2. Build the web app and sync it into the native iOS project:

```sh
npm run build:ios
```

3. Open the Xcode workspace:

```sh
npm run cap:open:ios
```

Or open this file directly in Xcode:

```sh
ios/App/App.xcworkspace
```

4. In Xcode, choose a simulator or connected device and run the app.

Notes:

- Before the first iOS run, install CocoaPods on your Mac and initialize the native project with `npm run ios:init`.
- The current bundle identifier is `com.ticketcreator.app` in `capacitor.config.ts`.
- Native iOS shell defaults now include a non-overlaid status bar and iOS keyboard resize handling.
- Native Apple Sign-In expects `VITE_APPLE_CLIENT_ID` and `VITE_APPLE_REDIRECT_URI` to be set in your environment.
- In Xcode, set your Apple Developer team under Signing & Capabilities before installing to a real device.
- If you want your own production app id, update it before shipping.
- Any time you change the React app, rerun `npm run build:ios` before opening or rebuilding in Xcode.
- For TestFlight and App Store prep, see `docs/testflight-release.md`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
