# Hourly Forecast

A static, ad-supported hourly weather website. Plain HTML, CSS and JavaScript with no build step; forecasts load in the visitor's browser from [Open-Meteo](https://open-meteo.com/).

```
public/
  index.html      the forecast page
  guides/         weather guides (original content for AdSense review)
  about.html, contact.html, privacy.html, terms.html
  sitemap.xml     list of pages for search engines (update it when you add a page)
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
npx wrangler dev
```

Then open the address it prints. Wrangler serves pages the same way Cloudflare does, at clean addresses such as `/about` and `/guides/uv-index-explained`.

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

The AdSense code for publisher `ca-pub-8884353000483064` is in the `<head>` of every page, and `ads.txt` declares the same ID.

On the live site, a slot with no ad unit ID (or the video and popup with no creative) is hidden. To see every slot as a striped placeholder with its size, add `?adpreview` to the address, e.g. `https://hourlyforecast.live/?adpreview`, or run the site locally.

### Connecting AdSense

1. Add https://hourlyforecast.live as a site in AdSense. The verification code is already on every page.
2. `adsense.client` in `public/js/config.js` is already set to your publisher ID.
3. In AdSense, create a display ad unit for each slot in the table above and paste each unit's `data-ad-slot` number into `adsense.slots`.
4. `public/ads.txt` already lists your publisher ID.
5. Set up a consent message for visitors in the EEA, UK and Switzerland under AdSense > Privacy & messaging. Google requires a certified consent tool there.
6. The contact address on the About and Privacy pages is asad@pldash.com.

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

`wrangler.jsonc` serves the `public/` folder at https://hourlyforecast.live and https://www.hourlyforecast.live. The domain is registered at Namecheap with its nameservers pointed at Cloudflare (`cesar.ns.cloudflare.com`, `ziggy.ns.cloudflare.com`).

Or with Cloudflare Pages: connect this GitHub repository, leave the build command empty, and set the build output directory to `public`.

## Customising

- Default city for first-time visitors: `weather.defaultPlace` in `config.js`.
- Popup and video timing: `popup` and `video` in `config.js`.
- Colours and fonts: the tokens at the top of `css/styles.css`, with dark-mode values just below them.
