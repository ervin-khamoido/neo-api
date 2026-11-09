# Notes for templates:

## ** IMPORTANT **

Whenever a template is updated, we need to increment the cache version in the API so that the new templates are fetched whenever the API is next deployed.

### To update the cache version:

1. Navigate to the src/utils folder, open the cache-util.ts file
2. Find the CacheKey enum in the cache-util file
3. Increment the version at the end of the MailTemplates key by +1
   See example: static readonly MailTemplates: CacheParams = new CacheParams(CacheConfigKey.MailTemplates, 2 <increment this number>)

### Other notes about formatting and preparing the templates:

1. The "Prettier" extension will break the formatting of the HTML, so it should be disabled for HTML specifically

   - To disable it for HTML
     - Press Ctrl + Shift + P in VSCode
     - Search "settings"
     - Select the "Preferences: Open Settings (JSON)" option
     - Add the "[html]" part to the JSON file:
       "editor.formatOnSave": true,
       "editor.defaultFormatter": "esbenp.prettier-vscode",
       "[html]": { "editor.formatOnSave": false }

2. Dynamic variables should be encompassed with double curly braces: {{var}}

3. Remove any variables encompassed with '\*'|sample|'\*'

   - These are Mailchimp variables that we will not be using, so they should either be replaced with text, another {{var}}, or removed.

4. Emojis
   - If mailchimp is having trouble displaying/exporting HTML with emojis, we can add them ourselves to the HTML with hex codes
   - Use the hex codes from one of the following sites. Example for HTML (for hex specifically): &#x1F642
     - https://www.quackit.com/character_sets/emoji/emoji_v3.0/unicode_emoji_v3.0_characters_all.cfm
     - https://unicode.org/emoji/charts/full-emoji-list.html
