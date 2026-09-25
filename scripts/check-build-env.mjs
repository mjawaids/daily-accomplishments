/* Fails a Netlify build that is missing a variable the client cannot run
   without. Vite inlines VITE_* values at build time, so a missing one does not
   break the build -- it ships a site that throws on load (src/lib/supabase.ts)
   or silently drops push (src/lib/onesignal.ts). Run from netlify.toml's build
   command only; plain `npm run build` is unaffected. */

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_ONESIGNAL_APP_ID'];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Missing build environment variables: ${missing.join(', ')}.\n` +
      'Set them in Netlify > Project configuration > Environment variables, ' +
      'with the "Builds" scope and a value for the Production context.'
  );
  process.exit(1);
}
console.log(`Build environment OK (${required.join(', ')}).`);
