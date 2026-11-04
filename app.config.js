// Extend the existing local app.json without overwriting Firebase, package,
// Supabase EAS project or Android app signing configuration.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []).filter((item) => item !== "./plugins/with-autoassist-fcm"),
    "./plugins/with-autoassist-fcm",
  ],
});
