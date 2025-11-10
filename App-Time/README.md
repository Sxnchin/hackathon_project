# LiquidSplit iOS App (SwiftUI)

This folder contains the SwiftUI source for the native LiquidSplit app.  
You can open the ready-to-run Xcode project in `LiquidSplitAppTime/LiquidSplitAppTime.xcodeproj`, or reuse the raw source in `LiquidSplitApp/` if you prefer to wire it into a different project.

## Structure

```
LiquidSplitApp/
├── App/                  # App entry point + routing
├── Theme/                # Colors, typography, spacing tokens
├── Components/           # Reusable UI building blocks
├── Features/
│   ├── Auth/             # Login + onboarding flows
│   ├── Pots/             # Pot list/detail screens
│   └── Wallet/           # Apple Wallet helpers
├── Models/               # Shared data models
├── Networking/           # REST client + endpoints
├── Utilities/            # Helpers (Keychain, extensions, errors)
├── Assets.xcassets/      # Color + icon placeholders
└── Resources/            # Static JSON / localizable strings
```

## Getting Started

Using the included project:
1. Open `LiquidSplitAppTime/LiquidSplitAppTime.xcodeproj` in Xcode.
2. Pick a simulator/device from the scheme menu (`LiquidSplitAppTime` target) and build (`⌘B`) to verify.
3. Update the bundle identifier + signing team if you plan to run on device.
4. Set your backend base URL in `LiquidSplitAppTime/Resources/AppConfig.swift`.

Rolling your own project from the raw source:
1. In Xcode, create a new **App** project (SwiftUI + Swift).
2. Remove the template `ContentView.swift` / `App` files.
3. Drag the folders inside `LiquidSplitApp/` into the Xcode project, keeping the group structure.
4. Replace your `Assets.xcassets` with the one provided (or merge as needed).
5. Configure signing + environment variables as above, then run on a simulator.

Apple Wallet pass generation happens server-side. Implement `WalletService` to hit your `/pots/{id}/pass` endpoint once it’s available.

## Requirements

- macOS with Xcode 15+
- iOS 17+ deployment target (adjust in `App/Launch/AppLifecycle.swift` if needed)
- Backend running locally or accessible via HTTPS

Happy building! 🎉
