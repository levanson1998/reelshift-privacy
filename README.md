# ReelShift

ReelShift is a Microsoft Edge extension that automatically advances to the next YouTube Short or Facebook Reel when the current video ends.

Settings stay on your device. ReelShift does not collect analytics or send browsing data to a server.

## Install in Microsoft Edge (developer mode)

1. Open `edge://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder (the folder that contains `manifest.json`).
5. Confirm the toolbar shows **ReelShift**.
6. Open the popup to enable sites and set the delay before next.

## Package for Microsoft Edge Add-ons

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-extension.ps1
```

Creates `reelshift-1.0.0.zip` for Partner Center upload.

## Permissions

- `storage` — saves your on/off toggles and delay preference locally.

Content scripts run only on YouTube and Facebook pages you open.

## Privacy

See [privacy/privacy-policy.html](privacy/privacy-policy.html) and [store/PRIVACY_POLICY.md](store/PRIVACY_POLICY.md).

## Store submission

- Vietnamese guide: [store/HUONG_DAN_PUBLISH.md](store/HUONG_DAN_PUBLISH.md)
- Partner Center copy: [store/PARTNER_CENTER_COPY.md](store/PARTNER_CENTER_COPY.md)
- Checklist: [store/CHECKLIST.md](store/CHECKLIST.md)
