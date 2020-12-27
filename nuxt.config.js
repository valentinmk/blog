export default {
  // Disable server-side rendering (https://go.nuxtjs.dev/ssr-mode)
  ssr: false,

  // Target (https://go.nuxtjs.dev/config-target)
  target: 'static',
  // router: {
  //   base: '/blog/',
  // },
  generate: {
    fallback: '404.html',
  },
  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    title: 'Valentinmk Dev blog',
    meta: [
      {
        charset: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        hid: 'Valentinmk Dev blog',
        name: 'Valentinmk Dev blog',
        content: 'Valentinmk Dev blog',
      },
    ],
    link: [
      {
        rel: 'icon',
        type: 'image/png',
        href: '/icons8-code-48.png',
      },
    ],
  },

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: ['~assets/css/main.css'],

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,

  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [
    // https://go.nuxtjs.dev/eslint
    '@nuxtjs/eslint-module',
    'nuxt-ackee',
    '@nuxtjs/fontawesome',
  ],

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    // https://go.nuxtjs.dev/bootstrap
    '@nuxtjs/bulma',
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    // https://go.nuxtjs.dev/pwa
    '@nuxtjs/pwa',
    '@nuxt/content',
    '@marcdiethelm/nuxtjs-countly',
    [
      '@nuxtjs/fontawesome',
      {
        component: 'fa',
        icons: {
          solid: [
            'faEnvelope',
            'faCode',
            'faHeart',
            'faAngleDoubleRight',
            'faSearch',
          ],
          brands: [
            'faPython',
            'faJs',
            'faNode',
            'faVuejs',
            'faGithub',
            'faTelegramPlane',
            'faMediumM',
            'faJira',
            'faWindows',
          ],
        },
      },
    ],
    'nuxt-purgecss',
  ],
  purgeCSS: {
    whitelistPatterns: [/-fa$/, /^fa-/, /-icon$/, /^icon-/],
    whitelistPatternsChildren: [/token$/],
    whitelist: [
      'pre',
      'code',
      'prism',
      'line-numbers',
      'tag',
      'toolbar-item',
      'toolbar',
      'code-toolbar',
      'span',
      'button',
      'line-numbers-rows',
      'url-link',
      'attr-name',
      'attr-value',
      'punctuation',
      'keyword',
      'keyword-let',
      'operator',
      'string',
    ],
  },
  content: {
    // Options
    dir: 'posts',
    liveEdit: false,
  },
  // Axios module configuration (https://go.nuxtjs.dev/config-axios)
  axios: {},
  // Build Configuration (https://go.nuxtjs.dev/config-build)
  pwa: {
    icon: {
      fileName: 'icons8-code-48.png',
      purpose: 'maskable',
    },
  },
  ackee: {
    server: 'https://ackee.ragekitchen.com',
    domainId: '839bf3d5-32d0-4a38-a099-5bbe092bb8e0',
    ignoreLocalhost: false, // defaults to true
    detailed: true, // defaults to false
  },
  countly: {
    url: process.env.MYAPP_COUNTLY_URL || 'http://counter.ragekitchen.com',
    app_key:
      process.env.MYAPP_COUNTLY_APP_KEY ||
      '9b62629032d2ef73dd7fc2b46b10be021246a986',
    trackerSrc:
      process.env.MYAPP_COUNTLY_TRACKER_SRC ||
      'https://counter.ragekitchen.com/sdk/web/countly.min.js',
    trackers: [
      'track_sessions',
      'track_pageview',
      'track_clicks',
      'track_scrolls',
      'track_errors',
      'track_links',
      'track_forms',
      'collect_from_forms',
    ],
    noScript: true,
    debug: process.env.NODE_ENV !== 'production',
  },
  build: {
    postcss: {
      preset: {
        features: {
          customProperties: false,
        },
      },
    },
  },
}
