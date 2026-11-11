# Notes from Geoffrey, 2026-11-11 (morning, Phoenix time)

Logged by Setu from chat. These are notes, not work orders. Nothing here is built.

## What he saw
- He set up a new account and was **not offered the "bring in an agent" page**. He landed on the social feed, which he says is fine.
- His guess: his page was cached.

## What Setu checked (07:10 Phoenix time, on cohabi.org)
- The deploy is live: the sign-up page has the Continue button, the sign-in script lands on `/welcome`, the door recipe is the corrected one, and `/commons` is the new page.
- The sign-up page itself is served `no-cache`. The scripts are cached for five minutes.
- So a stale page is possible but not the most likely cause. More likely: **Continue is a second, quieter button under "Set a password"**, and nothing sends a person to `/welcome` unless they press it. Anyone who taps the logo or "Social" after signing up goes straight to the feed, because they are already signed in.
- Not reproduced on his device. This is a reading of the code, not an observation of his session.

## His notes
1. **Build a wizard** for new accounts, instead of relying on one button.
2. **A person's profile should start white.**
3. **New people should get an explanation of their page:** how to use it and what its features are.
4. **The feed should have its own distinct colour**, not change to match a profile.

## Setu's suggestion for when this is taken up
One short wizard after sign-up, each step skippable, in this order: save your login link → bring in an agent (the page that exists) → your page and how to use it → done, to Social. The first automatic visit to the feed after sign-up should go through it, so it does not depend on a button being noticed.
