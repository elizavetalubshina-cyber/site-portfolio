# Gym Bro portfolio prototype

The page at `/gym-bro-demo/` replays the Gym Log Figma design without a Figma
iframe, account, application database, service worker or external API. Screen
images and links were exported from the connected Desktop Bridge on 2026-11-05.
The Figma document itself was read without modification.

`screens.json` retains the source node IDs, geometry and supported transitions.
Images live in `public/gym-bro-demo/` and load on demand. Do not preload the whole
collection. The page has its own entry in `vite.config.js`.

Six starting scenarios expose the workout, Bro, plan, history, profile and first
launch flows. Bro has direct entries for invitations, progress, live status and
the kick. Double tap and long press on Bro workout cards run locally; reactions
use the original Figma icons. Restart clears the current scenario's state.

The page uses the same night-sky renderer and background as the portfolio.
Sending a kick animates the original paw and avatar layers, then leaves the
disabled sent button. There is no cancellation toast or undo transition.
Returning to the kick within the scenario preserves its sent state; only
restarting the demo resets it. Reduced motion shows the confirmation directly.

This is a click-through prototype: names, weights, search, dates, account and
sharing flows are prepared examples. It does not send messages, authenticate,
install an app, create workouts or change anyone's data. Static controls without
source links stay visual. The highlight control identifies available actions.

The player adds a keyboard Done transition, local gesture reactions and a
remaining-set transition; corrects the swapped template/delete sample links;
and chooses the returning-user summary outside the first-launch scenario.
These adaptations are confined to the web player, not the Figma source.

Validation: `npm run build` includes the existing site page-weight checks. Browser
checks cover the workout through summary, Bro acceptance, double-tap and held
reactions, kick animation and sent-state persistence, scenario reset, long-page scrolling, mobile layout and the
link from the case. Browser-size checks do not establish real-device behavior.
