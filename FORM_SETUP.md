# Waitlist form → Google Forms setup

The "Join the Waitlist" form submits sign-ups to a **Google Form**. Google Forms
stores every response automatically and can dump them into a linked Google Sheet
— no backend, no code to host, and no third-party service.

Until you fill in the three values below, the form still shows the success screen
but does **not** store anything — so wire this up before launch.

---

## 1. Create the Google Form

1. Go to <https://forms.google.com> and start a **Blank** form. Name it e.g. **"Sol Waitlist"**.
2. Add two **Short answer** questions, in this order:
   - **Name**
   - **Email**
3. (Optional) **Responses** tab → **Link to Sheets** to collect entries in a spreadsheet.

## 2. Get the form action URL + field IDs

1. Click **Send** → the **link (🔗)** icon → copy the share URL. It looks like:
   `https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxx/viewform`
2. Open that `viewform` link in your browser, then **right-click → View page source**
   (or open the form and inspect the fields).
3. Find each input's field ID — search the source for `entry.` . You'll see values like:
   - `entry.1234567890` → the **Name** question
   - `entry.0987654321` → the **Email** question

   > Tip: the order in the source matches the order of your questions. To be sure,
   > pre-fill the form (**⋮ menu → Get pre-filled link**), type dummy values, and
   > the generated URL shows exactly which `entry.XXXX` maps to which field.

4. The **action URL** is the same as the share URL but ending in `formResponse`
   instead of `viewform`:
   `https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxx/formResponse`

## 3. Wire it into the site

Open **`index.html`**, find the `/* 5. FORM ... */` script near the bottom, and
fill in the three constants:

```javascript
const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxx/formResponse';
const ENTRY_NAME  = 'entry.1234567890';
const ENTRY_EMAIL = 'entry.0987654321';
```

## 4. Test

Reload the page, submit the form, then check the Google Form's **Responses** tab
(or the linked Sheet) — your test entry should appear.

---

### Notes

- Requests use `mode: 'no-cors'` because Google Forms can't return CORS headers.
  The browser can't read the response, so a completed request is treated as
  success; only true network failures surface the inline error message.
- Make sure the form is **not** set to "limit to 1 response" or require sign-in,
  otherwise anonymous visitors can't submit.
- If you add more questions later, add matching `entry.XXXX` fields to the
  `payload` in the form script.
