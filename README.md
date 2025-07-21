# auto-report-samourai-dither
_As a member of [Samourai Coop](https://github.com/orgs/samouraiworld/)_
## Why?
Because I'm lazy.

It just generates two textual weekly reports:
- One for a private Samourai's Notion page (Markdown).
- One for a private Samourai's Signal message.

## How to use?
- Add a `.env` including a Github token.
- Personalize `constants.ts`.
- Personalize `index.ts`. I added many comments to be clear on the algorithm and the expected generated reports.
- Run `npm i` to install de dependencies.
- Run `npm start`. The report will be generated in your terminal.
- Copy-past your report and enjoy your lazyness!

## Alternative behavior
Instead of filtering authors by "members of **samouraiworld**", you can filter authors by `EXCLUDED_USERS`:  
If you prefer this behavior, you can refer to this commit: https://github.com/samouraiworld/auto-report-samourai-dither/commit/0c4210e61a4d0cd03614f7c66af14bbf292f5f73#diff-22b7ddb3fe827e6367c5214dd94c93733405fad09f72d932b88d033e7bcd0e10L2
___