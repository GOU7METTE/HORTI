# HORTI mobile scaffold

React Native with Expo SDK 58 and strict TypeScript. Android/Google Play remains the
initial release target; iPhone Expo Go preview/testing is enabled. This is
one screen with local single-photo selection/preview and explicit upload to FastAPI.
It supports still-photo capture from the device camera but does not display predictions. FastAPI remains the only
inference host. The web prototype is not a prerequisite for mobile development.

`App.tsx` owns one ephemeral selection shared by `PhotoSelection` and `UploadPanel`.
Only pressing Upload sends a request; selection never auto-submits. An accepted selection
increments a revision even for the same URI, aborting/resetting the previous upload.
Cancellation or rejected replacement preserves the selection and current request.
The unavailable service returns HTTP 503 for valid images; no prediction is fabricated.
The owner confirms iPhone health and a real upload after the SDK multipart fix. Displayed
UUID `43089f0b-3aad-4bab-9962-0fe15b446186` matches the phone's POST/503 backend diagnostic.
That verifies the unavailable-model path, not predictions or all device acceptance.
Expo Go Local Network permission is enabled. The validation-error popup
is now owner-confirmed on-device; VoiceOver and enlarged text remain pending.

## Setup

### Current connection diagnosis and camera checks

The development screen now includes **Check service connection**, which explicitly
requests `/health` from inside Expo Go without sending an image. It shows the validated
configured address and fixed safe feedback. It is not included in production UI.
The laptop API listener/health check cannot prove the phone can reach it.

Restart Metro in the same terminal where you set the public URL, then fully reload Expo Go.
From inside `mobile/` (do not add another `--prefix mobile`):

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://10.0.0.157:8000'
npm.cmd run preview:iphone
```

Use plain `http://`, without a backslash. That address is this test session's confirmed
LAN address; recheck it when networks change. Do not hardcode it in application source.
Check the displayed service address, press Check service connection and report its exact
fixed message. If iPhone browser health also fails, resolve LAN reachability before
testing multipart upload. Agent made no CORS/ATS/firewall/profile/tunnel change; the
owner-created temporary scoped rule remains a separate diagnostic to clean up after testing.

**Take leaf photo** opens the device's still-camera UI from HORTI. Camera access is
checked/requested only after pressing it. Test permission grant, denial, cancellation,
capture preview, replacement and removal. Denial or cancellation must preserve the
previous photo, and library selection must remain usable. Capture alone sends nothing;
only Upload submits. Known unsupported/over-limit captures use the same red error popup.
No video, live inference or automatic save to Photos is added. SDK cache files can exist.
Native permission configuration supplies a camera purpose string; microphone and broad
library access remain disabled. Expo Go displays its host permission prompts, so its
behavior does not verify a future native build's permission text/configuration.
Real camera, orientation, permission and upload results remain pending owner/device checks.

From the repository root, use a supported Node LTS version in package.json's engine
range (22.13+, 24.3+, or 26.x) and npm. The scaffold was checked with Node 26.12.0 and
npm 11.20.0. Use npm.cmd in Windows PowerShell if npm.ps1 is blocked.

```powershell
npm.cmd --prefix mobile ci --cache .cache/npm --no-audit --no-fund
```

The mobile/package-lock.json records this app's dependencies independently of frontend/.
Do not run installs in the repository root or introduce a workspace manager. Expo's
SDK 58 template aligns React 19.3.0 with React Native 0.88.1. The Expo bundled module
metadata selects safe-area-context 5.10.1 and expo-status-bar 58.0.4. ESLint 9 is used
because Expo's React lint plugin peers exclude ESLint 10; revisit when compatible.
No global Expo/EAS CLI installation is needed. Latest `npm audit --json` reports 28
findings (three high, 25 low), propagated from zod/deepmerge advisories, now also through
Jest/component-testing dependencies. No compatible fix was reported. No forced fix,
SDK downgrade or install-script approval was applied. Revisit before release.

## Windows-to-iPhone preview

Compatibility checked October 29, 2026: the Canadian App Store lists Expo Go **58.0.5**
with release notes adding **SDK 58** support and requires **iOS 16.4+**. Project Expo
58.0.21 / RN 0.88.1 agrees with Expo's SDK metadata. No SDK change is needed on this
published evidence. Your specific phone's iOS/client version still needs confirmation.
The store description mentions older RN 0.86 despite the SDK 58 release notes; use
version/release notes and Expo's SDK mapping rather than that stale description. Expo's
versions endpoint also lists iOS client 58.0.7; that is not proof that this version is
available in the physical-device App Store. Do not install simulator archives on a phone.

If the phone is below iOS 16.4, cannot install an SDK-58-compatible Expo Go, or displays
an SDK mismatch, stop and record the exact version/error before considering a separately
reviewed SDK change. Do not downgrade dependencies or build/sign a native app to bypass it.

1. On the iPhone, install/update **Expo Go** from the
   [official App Store listing](https://apps.apple.com/ca/app/expo-go/id982107779).
   Apple Account/App Store sign-in is performed by you. A paid Apple Developer membership
   or a HORTI App Store app record is not needed for an Expo Go preview.
2. Current [physical-iPhone Expo Go policy](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/)
   requires the **same free Expo account** in Expo CLI and Expo Go. Sign in yourself;
   never put passwords, tokens or account output in Git/chat. No EAS/cloud project is
   required. From a Windows PowerShell terminal at the repository root:

   ```powershell
   Push-Location mobile
   try { .\node_modules\.bin\expo.cmd login } finally { Pop-Location }
   ```

   In Expo Go, open its account/profile menu and sign in to that same account. The CLI
   handles your credentials outside the repository. Do not run login through an agent
   or supply credentials as command-line arguments. If accounts differ, sign in correctly
   and restart Metro; a running server alone does not prove the phone can authenticate.
3. Put the Windows computer and iPhone on the same trusted local network. Ethernet/Wi-Fi
   combinations are fine only if devices can reach each other. Guest/client-isolated
   networks may block access. No tunnel, firewall change, VPN change or router change is
   part of this step. If the connection is blocked, report it and agree a setup step first.
4. Start the existing local Expo Go preview workflow:

   ```powershell
   npm.cmd --prefix mobile run preview:iphone
   ```

   It runs `expo start --go --lan`, serves Metro on the local network and prints a QR
   code. Use the shown LAN address, not localhost on the phone. No FastAPI process is
   needed for local selection alone. To test explicit upload, follow the API steps below.
5. Scan the terminal QR with the iPhone Camera and tap **Open in Expo Go**. Allow Expo
   Go's **Local Network** access if iOS requests it; that is expected for LAN preview.
   This is not HORTI camera permission. HORTI checks/requests camera access only when
   Take leaf photo is pressed; it should not request broad-library, location or account
   permissions. The system photo picker is expected
   after pressing Choose/Replace. Expo Go may show its own onboarding
   or development controls; distinguish those from HORTI UI.
6. Keep Metro running during testing. Use Ctrl+C in that terminal to stop it afterward.
   Do not use `expo run:ios` or the `i` simulator shortcut on Windows: neither provides a
   Windows iOS simulator. This preview runs JavaScript inside Expo Go, not a HORTI native
   development build, release build, TestFlight distribution or approved iOS product.

### Device observations and remaining checklist

Record iPhone model, iOS version, Expo Go version/build, date and who observed each result.
Do not include device identifiers, accounts or credentials. Report failures/errors as well
as passes. On October 29, 2026, the owner confirmed HORTI opens and displays the
unavailable-predictions notice on an iPhone 13 Pro Max, reported iOS 26.5, Expo Go 58.0.5.
This is owner-reported evidence, not an agent-observed run. Enlarged text and VoiceOver
are explicitly untested; rotation, scrolling, safe areas and permission prompts are
unconfirmed. The remaining checklist below is not a record of passing checks.

- Open HORTI: title and **Predictions are not yet available** notice appear; no crash/red
  error overlay or unexpected app permission request. Note separately any Expo Go prompts.
- VoiceOver: Settings > Accessibility > VoiceOver. Right-swipe through HORTI and confirm
  HORTI heading, subtitle, unavailable-predictions heading, explanation and remaining
  paragraphs are read in visual order. Check headings navigation if familiar with it.
  With VoiceOver on, selection uses a single tap and activation a double tap; scrolling
  uses a three-finger swipe. Enable only when comfortable turning it off again.
- Large text: Settings > Accessibility > Display & Text Size > Larger Text; enable larger
  accessibility sizes and try the largest setting. All paragraphs/headings should wrap,
  remain readable and be reachable by scrolling without horizontal clipping.
- Rotation: with portrait lock off, try portrait and landscape at normal and enlarged
  text sizes. Verify scrolling reaches the final paragraph, headings are not cut off,
  and content stays clear of the notch/Dynamic Island and home indicator.
- Restore your preferred phone accessibility/rotation settings afterward. Report the
  actual observations; JavaScript export cannot validate these behaviors.

Android runtime checks remain pending because the reported available device is an
**iPhone**; no configured Android device/emulator was established. iPhone VoiceOver
results cannot establish Android TalkBack, native permissions or layout behavior.

## Android preview (when a device/toolchain is available)

`npm.cmd --prefix mobile start` starts Metro. With an already configured Android
SDK/emulator/device, `npm.cmd --prefix mobile run android` starts Expo and attempts to
open Android. It is not a native release build. Android Studio/SDK/emulator/ADB were not
found in inspected locations; no Android launch is claimed. JAVA_HOME points to JDK 24
while PATH Java reports JDK 25; neither was changed. Native build setup is a separate step.

## Verify

Run from the repository root:

```powershell
npm.cmd --prefix mobile test
npm.cmd --prefix mobile run lint
npm.cmd --prefix mobile run typecheck
npm.cmd --prefix mobile run check:dependencies
npm.cmd --prefix mobile run check:bundle:android
npm.cmd --prefix mobile run check:bundle:ios
```

Or run `npm.cmd --prefix mobile run check` for tests and all checks in sequence. `check:bundle` runs both platform exports. Lint and strict
type checks catch source issues; Expo checks SDK version alignment; export compiles an
Android and iOS JavaScript bundles into ignored mobile/dist/android/ and mobile/dist/ios/.
None launches a device, verifies TalkBack/VoiceOver, tests permissions, or creates an
APK/AAB/IPA. Component/unit and screen tests cover shared selection and explicit upload
using mocked native/network boundaries; they do not replace runtime or
accessibility acceptance.

On an actual Android launch, verify the HORTI and unavailable-predictions headings with
TalkBack, readable text at enlarged system font sizes, portrait/landscape scrolling,
safe-area spacing and no clipped content. These device checks remain pending.

## Boundaries

Owner-reported selection check (October 29, 2026): on iPhone 13 Pro Max, reported iOS
26.5 and Expo Go 58.0.5, choose/preview, replace, cancel preserving selection, remove,
unsupported/oversized-input feedback and no automatic upload were reported successful.
The owner did not identify which invalid-input fixture was used; exact format/size
boundaries remain automated-test evidence, not separately measured device results.
VoiceOver and enlarged-text checks remain pending. This report precedes the new red popup.

To check the updated error presentation, reopen the app, select a known unsupported or
oversized image and confirm a compact red error popup appears. Dismiss it and confirm
the previous selected photo is unchanged; repeat to verify the same error can reopen.
The popup does not dismiss itself. Large text, rotation and VoiceOver inside the popup
still require device checks. No image is uploaded by these actions.

No continuous camera/video, broad-library access, persistence, accounts, history, Supabase,
model weights or production mock results are included. ImagePicker is installed for
local selection; the existing upload client/panel is mounted for explicit submission. Android and iOS are
configured for development; this does not approve iOS/App Store release. The owner linked
the app to EAS project `@horti/horti` (`264e6efb-c0f6-4151-a73a-5ef0e69cb83c`).
`app.json` records owner `horti`, slug `horti` and `extra.eas.projectId`.
There is no final store application ID or signing setup. Project linking alone does not
build or publish the app, and the Expo slug does not reserve a Play Store identity.
Generated .expo/, dist/, android/ and ios/ folders are ignored. Keep native generation
and any future decision to version native code explicit.

Sources checked for selection: [Expo SDK compatibility](https://docs.expo.dev/versions/latest/),
[TypeScript](https://docs.expo.dev/guides/typescript/),
[ESLint](https://docs.expo.dev/guides/using-eslint/) and
[local Android development](https://docs.expo.dev/guides/local-app-development/).
See [architecture](../docs/ARCHITECTURE.md) for the framework decision and
[validation](../docs/VALIDATION.md) for measured results and environmental limitations. P6-06 remains incomplete.

## Local photo selection: iPhone checks

Run from the repository root:

```powershell
npm.cmd --prefix mobile run preview:iphone
```

Use the same-network, Expo Go sign-in and QR workflow above. No API process or API URL
is required for selection. Restart/reload the app after installing the new dependency.
`expo-image-picker` 58.0.10 is included in the SDK-58-compatible Expo Go client; a custom
native build is not needed for this preview. Do not change SDK versions if a client
mismatch occurs; record the actual version/error first.

1. Open HORTI. Confirm **Choose leaf photo**, JPEG/PNG and 5 MiB guidance, and the text
   that selection does not upload anything. Upload starts disabled without a selected
   photo or correctly configured public API address.
2. Press Choose once and select a small synthetic JPEG or PNG from Photos. Confirm one
   local preview and Replace/Remove actions. No camera or broad-library grant should be
   requested by HORTI. The system selection sheet is expected; distinguish Expo Go host
   prompts from HORTI behavior. Report any unexpected permission request without granting
   broader access to work around it.
3. Press Replace and cancel/dismiss the sheet. Confirm the same preview remains, with
   cancellation feedback. Then Replace with a different JPEG/PNG: only the new preview
   should remain. Try rapid repeated taps: only one picker should open.
4. If available, select an existing HEIC/HEIF or other unsupported synthetic image.
   Confirm clear unsupported-format feedback; any previous accepted preview should remain.
   The app does not rename or convert it. Likewise a reported size over 5 MiB should
   yield a smaller-photo message. Missing format/size metadata must say it is unverified;
   do not manufacture a pass if the device never returns missing metadata.
5. Press Remove. Confirm the preview disappears and Choose returns. Check in Photos
   that the original still exists. Close/reopen the app: it must start with no selection.
6. With VoiceOver, navigate heading, hints, Choose/Replace, preview, Remove and feedback;
   confirm sensible order, labels, disabled/busy state and feedback announcements.
   With maximum Larger Text and portrait/landscape, confirm controls wrap, all content
   scrolls into view, and notch/home-indicator safe areas remain clear. These checks
   have not been performed; automatic announcement behavior needs real iOS evidence.
7. Report device, iOS/Expo Go versions, date and each observed result/failure. Do not
   share personal photo data, local URIs or account credentials. Stop Metro with Ctrl+C.

State is a small `SelectedPhoto` (`uri`, optional `mimeType`/`fileSize`), structurally
compatible with the existing upload interface. It lives only in App's shared selection
state, paired with a revision counter. Both children receive that same selection, with
no second photo state. Cancellation, picker failure or rejected replacement preserves the previous photo.
Metadata checks are hints, not decoding or proof of validity. Unknown metadata can be
previewed with a warning; later backend validation remains authoritative. Preview errors
show fixed safe feedback, never native error text or paths.

No application file copy, conversion, EXIF/base64 request, filesystem delete, logging or
persistence is added. Expo's picker itself may create a cache copy; removing a selection
clears memory, not the user's original or a promise of immediate SDK-cache erasure.
The iOS current-representation option avoids transcoding where the platform supports it;
we do not guarantee byte-for-byte behavior of every system provider. JPEG/PNG hints use
returned metadata only. Native config supplies a camera purpose message, disables
microphone/photo-library usage descriptions and blocks broad Android storage/media
permissions for future builds. Camera permission is checked/requested on action only.
Expo Go has its own native permission configuration; exports do not validate a native
manifest or prove the device has no prompts. No native build was generated.

See the [SDK 58 ImagePicker contract](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/)
for the system-picker permission model, nullable metadata and current representation.
The installed Expo UI skill informed the single scrolling screen and Expo Go workflow;
no router, UI framework or test stack was added.

## Upload/error integration and remaining iPhone checks

Public configuration: set `EXPO_PUBLIC_API_URL` to the API origin (no trailing endpoint,
credentials, query string or secret). Expo embeds `EXPO_PUBLIC_` values into JavaScript;
these are public. Restart Metro after changes. The client appends `/api/v1/predictions`.
Only an explicit press submits one multipart `image`; native networking sets the boundary.
No request/body/URI logging, persistence, automatic retries or success predictions exist.
Timeout is 30 seconds. Cancel aborts locally and ignores late responses; it cannot recall
bytes already received by the API. Retry explicitly sends the selected photo again.
Envelope messages/details are never rendered; fixed safe messages and a validated UUID
are shown. Conflicting header/body request IDs are rejected as malformed responses.

Phone health, upload503 and matching UUID are now evidenced. The remaining race,
accessibility/layout and new status-card checks below are pending owner/device results.
Do not infer those passes from exports or mocked tests.

1. Connect Windows and iPhone to the same trusted, non-isolated network. In Windows run
   `Get-NetIPAddress -AddressFamily IPv4` and identify the active LAN interface address
   yourself. Do not publish the output. Phone `localhost`/`127.0.0.1` is the phone, not Windows.
2. In a repository-root terminal, replacing the example address with that LAN address:

   ```powershell
   $env:UV_CACHE_DIR = Join-Path (Get-Location) '.cache/uv'
   uv run --project backend --locked uvicorn app.main:app --app-dir backend --host 192.168.1.20 --port 8000
   ```

   This exact-interface LAN binding is for local testing only; no reload, production
   hosting, tunnel or firewall changes. Keep the API terminal open. Use an available port
   if 8000 is occupied; never stop an unrelated process. Stop this process with Ctrl+C.
3. On iPhone Safari open `http://192.168.1.20:8000/health`; expect exactly
   `{"status":"ok"}`. If unreachable, stop and report reachability as blocked. Existing
   firewall rules, guest-network isolation or iOS local-network/transport policy may
   prevent access. Do not bypass them or add transport/security exceptions here.
4. In a second repository-root terminal:

   ```powershell
   $env:EXPO_PUBLIC_API_URL = 'http://192.168.1.20:8000'
   npm.cmd --prefix mobile run preview:iphone
   ```

   Follow the Expo Go/sign-in/QR steps above; sign in personally. HTTP is only a trusted
   LAN diagnostic here; a future hosted service should use HTTPS. Native requests do not
   use browser CORS, so broadening the backend CORS allowlist is not a connectivity fix.
5. Choose a small **synthetic JPEG/PNG**, confirm the API terminal receives no POST from
   selection alone, press **Upload leaf photo** once, and expect the safe model-unavailable
   message with a UUID request ID. Compare that UUID with the API's safe diagnostic log.
   No prediction should appear. Try repeated taps: only one request should be submitted.
   If loading lasts long enough to interact, test Cancel then Retry and replace/remove
   during loading: the prior result must not overwrite the new state. Reselect the same
   photo too: it requires a new Upload press and clears the previous feedback. Picker
   cancellation or unsupported replacement must preserve the previous selection.
   The current local 503 may finish too quickly for cancellation: record that timing
   limitation rather than claiming a manual pass. Do not slow/change the backend for it.
   Use no personal photos or sensitive query strings. Cancel cannot recall bytes already
   sent to the service; Retry sends them again only after another explicit press.
6. With VoiceOver, check heading/control/error/request-ID reading order and loading/cancel
   feedback; with maximum larger text and both orientations check wrapping, scrolling and
   safe areas. Record device/iOS/Expo Go versions, steps and observed outcome per check.
   These accessibility/device checks remain pending, including whether iOS announces the
   alert automatically. Recheck the red popup with unsupported input: red heading/message,
   Dismiss, unchanged prior preview, sensible modal focus/reading order, no clipping at
   enlarged text. These new popup checks remain pending even though earlier basic
   selection checks were owner-reported successful. A component assertion does not
   verify VoiceOver behavior.
7. Stop only the API/Metro terminals you started; remove the session environment variable
   using `Remove-Item Env:EXPO_PUBLIC_API_URL`. No credential belongs in Git.

Sources inspected October 29, 2026: [Expo unit testing](https://docs.expo.dev/develop/unit-testing/),
[Expo public configuration](https://docs.expo.dev/guides/environment-variables/), and
[React Native networking](https://reactnative.dev/docs/network). Used the installed Expo
plugin's `native-data-fetching` guidance for cancellation, errors and public configuration;
SDK 58 installs Expo fetch by default; its serializer rejects the older React Native
`{uri, name, type}` descriptor. Uploads now explicitly use `expo/fetch` with
`formData.append('image', new File(selectedUri))` from `expo-file-system`, matching
[Expo's File upload example](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/).
Creating this File references the existing picker file; no create/copy/write/move/delete
operation, conversion or base64 step is added. The backend remains authoritative for
format/size. The SDK generates multipart headers and boundary. The client never logs
the file or renders filenames/paths. Expo-file-system58.0.13 is now a direct dependency;
that same version was already present transitively in Expo58.0.21. No SDK upgrade.

After this fix, stop only your Metro terminal with Ctrl+C and run from the repository root:

```powershell
$env:EXPO_PUBLIC_API_URL = 'http://10.0.0.157:8000'
npm.cmd --prefix mobile run preview:iphone -- --clear
```

This address is the current owner-confirmed trusted home LAN, not an application default;
recheck it when networks change. Reload Expo Go, reselect a small synthetic JPEG/PNG and
press Upload. Expected outcome is safe model-unavailable503 and a UUID, not a prediction.
Report the displayed UUID for comparison with the API log. One corrected upload/503 and
UUID match is recorded; repeated/race and new UI acceptance remain pending. The earlier network issue was resolved after
approved outside-sandbox API startup; do not disable Codex's inbound sandbox block rule.

### Interface-state checks

Reload HORTI in your existing Expo Go session after these source changes (no dependency
change). Upload shows a labeled busy indicator and Cancel; retries clear the previous
card. Model unavailable uses an amber card, rejected images show replacement guidance,
failed requests/timeouts use distinct error headings, and cancellation uses neutral
feedback. Headings, text and selectable request IDs wrap without fixed text heights.
The red selection-error popup is preserved. Colors are supplemented by text/roles.

Try the existing available-model503 path, unsupported image popup and replacing/removing
the selection to clear feedback. Cancellation may finish too quickly to observe against
immediate503; report it as unobserved if so. Offline failures can be tested later in an
agreed device setup; no firewall/transport changes are needed for this UI work.
VoiceOver announcements, text scaling, rotation and status-card layout remain pending.

`UncertainPrediction` is a prepared component exercised only with synthetic test fixtures.
It explains uncertainty/calibration limits and offers Choose another photo. It is not
mounted in the live upload flow:503 is model unavailable, never an uncertain prediction.
Real uncertainty requires a validated future inference response and reviewed policy.
Run `npm.cmd --prefix mobile test -- --runTestsByPath src/__tests__/interface-states.test.tsx`
to check the component behavior; this is not a device preview or model-quality test.
