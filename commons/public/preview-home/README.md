# Cohabi social-first homepage — implementation handoff

This is a working responsive static homepage prototype, **not deployed** and **not integrated with the production API**. It uses cropped concept art derived from the two approved mockups, with real HTML text, responsive CSS, and safe JavaScript rendering hooks. The visual result approximates the mockup but is not a pixel-identical recreation of the original painted composite.

## Preview locally

From this directory run `python3 -m http.server 8080`, then visit `http://localhost:8080/`. No dependencies, npm installation, or paid services required. The static page works without a backend; links to `/signup`, `/login`, `/social`, `/marketplace`, and `/store` will only work when mounted on a host with those routes.

## Integration steps for Setu

1. Create a feature branch and copy this directory into the repository, e.g. `commons/public/cohabi-home/`. Do not overwrite `/` or `/arrive` until reviewed. Serve a staging route (`/homepage-preview`) with static assets at a stable prefix. If served at a prefix, update CSS and JS asset URLs or configure a base path.
2. Confirm actual route names for Social, Marketplace, sign-in, sign-up, coin/store, and Commons. Change links as needed; the current links are assumptions, not verified routes.
3. Feed verified public Social posts to `window.CohabiHomepage.renderSocial([{author,text}, ...])` and public listings to `renderMarketplace([{title,category,url}, ...])`. Only pass safe, public data. Render functions use `textContent`, and marketplace URLs are restricted to same-origin relative paths. No invented engagement counts or prices are displayed.
4. Replace any illustration crops that contain artifacts from the concept render with original approved/licensed art assets; audit image optimization, credits, and mobile performance. The background crops are a visual prototype, not a full production art pack.
5. Ensure sign-up creates only the correct social-level identity; the Commons application must be a separate process with server-side role/standing enforcement. The public read-only experience must remain available. Do not treat homepage navigation as authorization.
6. Coin language is intentionally conservative: credits are experimental, not money or investments. Review any claims of earning, spending, treasury, ownership, or governance with the approved project policy and applicable legal advice.
7. Test mobile navigation, keyboard access, screen readers, 320px width, slow connections, all links, content security policy, asset caching, authenticated/anonymous states, and live API failures. Obtain independent review and deployment approval before replacing the public home.

## Scope

Implemented: desktop/mobile responsive page, functional menu, real navigable anchors, page sections, semantic text, skip link, focus states, reduced motion support, live-data render hooks, no fake listings/posts, original concept-based artwork crops.

Not implemented: login/signup backend, live feeds, marketplace commerce, wallet, coin accounting, actual governance, application workflow, persistent world, or production deployment. Those must remain with existing Cohabi services and be separately validated.

## Ownership copy

“The days of simply using the internet are giving way to the days of helping own what we build.” This is aspirational language, not a representation that social membership currently grants ownership or financial rights.
