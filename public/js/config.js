// Site configuration. This is the only file you need to edit to connect
// AdSense, direct-sold ads and the weather API.
window.SITE_CONFIG = {
  adsense: {
    // Your AdSense publisher ID, e.g. 'ca-pub-1234567890123456'.
    // While empty, every slot shows a labelled placeholder with its size.
    client: '',
    // Ad unit IDs from AdSense > Ads > By ad unit (the data-ad-slot number).
    // A slot left empty keeps showing its placeholder.
    slots: {
      topBanner: '',      // 728 x 90, responsive, under the header
      railSkyscraper: '', // 300 x 600, sticky right column (wide screens)
      tile1: '',          // 300 x 250 tiles under the 48-hour strip
      tile2: '',
      tile3: '',
      inTable: '',        // 728 x 90, responsive, inside the hourly table
      tile4: '',          // 300 x 250 tiles under the 7-day outlook
      tile5: '',
      tile6: '',
      footerBanner: ''    // 728 x 90, responsive, above the footer
    }
  },

  // Creatives for the floating video and the full-screen popup. AdSense does
  // not allow its ads inside custom popups or floating players, so these two
  // spaces take direct-sold ads (or another network's tag). See README.md.
  directAds: {
    video: {
      src: '',      // MP4 or WebM URL; plays muted on loop
      poster: '',   // optional still image shown before the video loads
      clickUrl: ''  // where a click on the video goes
    },
    popup: {
      image: '',    // creative image URL, ideally 800 x 600
      alt: '',      // describe the creative for screen readers
      clickUrl: ''
    }
  },

  video: { enabled: true, delaySeconds: 4 },
  popup: { enabled: true, delaySeconds: 12, oncePerSession: true },

  weather: {
    // Open-Meteo's free endpoints are for non-commercial use. For an ad-funded
    // site, buy an API plan and switch to the customer endpoints with your key:
    //   forecastUrl: 'https://customer-api.open-meteo.com/v1/forecast'
    //   geocodeUrl:  'https://customer-geocoding-api.open-meteo.com/v1/search'
    forecastUrl: 'https://api.open-meteo.com/v1/forecast',
    geocodeUrl: 'https://geocoding-api.open-meteo.com/v1/search',
    apiKey: '',
    // Shown on a visitor's first visit, until they search or share their location.
    defaultPlace: {
      name: 'New York',
      region: 'New York',
      country: 'United States',
      lat: 40.71427,
      lon: -74.00597
    }
  }
};
