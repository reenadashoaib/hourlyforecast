# Hourly Forecast

A static, ad-supported hourly weather website. Plain HTML, CSS and JavaScript with no build step; forecasts load in the visitor's browser from [Open-Meteo](https://open-meteo.com/).

```
public/
  index.html      the forecast page
  privacy.html    privacy policy (required by AdSense)
  404.html
  ads.txt         AdSense seller declaration
  robots.txt
  _headers        Cloudflare response headers
  css/styles.css
  js/config.js    the one file to edit: ad IDs, creatives, weather API
  js/ads.js       renders ad slots, the floating video and the popup
  js/weather.js   fetches and renders the forecast
wrangler.jsonc    Cloudflare deployment config
```

## Preview locally

```bash
cd public && python3 -m http.server 8080
```

Then open http://localhost:8080.

## Ad spaces

| Slot (`config.js` key) | Size | Where |
| --- | --- | --- |
| `topBanner` | 728 × 90, responsive | Under the header |
| `railSkyscraper` | 300 × 600 | Sticky right column, screens 1100px and wider |
| `tile1`–`tile3` | 300 × 250 | Under the 48-hour strip |
| `inTable` | 728 × 90, responsive | Inside the hour-by-hour table |
| `tile4`–`tile6` | 300 × 250 | Under the 7-day outlook |
| `footerBanner` | 728 × 90, responsive | Above the footer |
| Floating video | 16:9 | Bottom right, closable, appears after 4 s |
| Full-screen popup | up to 800 × 600 | Once per session, after 12 s, closable |

Until a slot has an ID or creative, it shows a striped placeholder with its size.

### Connecting AdSense

1. Apply for AdSense with your live domain. To verify the site, uncomment the `google-adsense-account` meta tag in `index.html` and add your publisher ID.
2. In `public/js/config.js`, set `adsense.client` to your publisher ID (`ca-pub-…`).
3. In AdSense, create a display ad unit for each slot in the table above and paste each unit's `data-ad-slot` number into `adsense.slots`.
4. Edit `public/ads.txt` and replace the commented line with your own publisher ID.
5. Set up a consent message for visitors in the EEA, UK and Switzerland under AdSense > Privacy & messaging. Google requires a certified consent tool there.
6. Replace `privacy@example.com` in `privacy.html` with a real contact address.

### The video and popup spaces

AdSense doesn't allow its ads inside custom popups, interstitials or floating players, and placing them there can get the account suspended. These two spaces are therefore set up for **direct-sold ads**: fill in `directAds.video` (an MP4 URL and click-through link) and `directAds.popup` (an image and link) in `config.js`. To earn from these placements through Google instead:

- **Full-screen:** turn on Auto ads > *Vignette ads* in AdSense. Google then shows its own compliant full-screen ad between page views; set `popup.enabled` to `false` in `config.js` if you don't want both.
- **Bottom-right:** AdSense *Anchor ads* and *Side rail ads* are Google's floating formats. Outstream video needs a video ad network or Google Ad Manager.

Popups also count toward Google's "intrusive interstitial" signals in search ranking. The popup here waits 12 seconds, shows once per session, and closes with the button, the Escape key or a click outside it.

AdSense also rejects sites that show more ads than content. If approval stalls, remove some `<aside class="ad">` blocks from `index.html`; leaving a slot's ID empty doesn't hide it, it just shows the placeholder.

## Weather data and licensing

Open-Meteo's free API is for **non-commercial use only**, and an ad-funded site counts as commercial. Before going live, buy an Open-Meteo API plan, then in `config.js` switch `forecastUrl` and `geocodeUrl` to the `customer-` endpoints shown in the comments and set `apiKey`. The data is licensed CC BY 4.0, so keep the "Weather data by Open-Meteo.com" link in the footer.

## Deploy to Cloudflare

With Workers static assets (recommended):

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

`wrangler.jsonc` serves the `public/` folder. Then add your domain under the Worker's *Settings > Domains & Routes*.

Or with Cloudflare Pages: connect this GitHub repository, leave the build command empty, and set the build output directory to `public`.

## Customising

- Default city for first-time visitors: `weather.defaultPlace` in `config.js`.
- Popup and video timing: `popup` and `video` in `config.js`.
- Colours and fonts: the tokens at the top of `css/styles.css`, with dark-mode values just below them.
