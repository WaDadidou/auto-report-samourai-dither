# auto-report-samourai-dither

## Why?
Because I'm lazy.

It just generates two textual weekly reports:
- One for a private Samourai's Notion page.
- One for a private Samourai's Signal message.

## How to use?
- Add a `.env` including a Github token.
- Personalize `constants.ts`.
- Personalize `index.ts`. I added many comments to be clear on the algorithm and the expected generated report.
- Run `npm start`. The report will be generated in your terminal.