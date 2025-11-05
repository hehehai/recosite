export default defineContentScript({
  matches: ["*://*.google.com/*"],
  main() {
    console.warn("Hello content.");
  },
});
