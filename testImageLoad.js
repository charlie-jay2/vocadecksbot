const path = require("path");
const { loadImage } = require("canvas");

async function testBadges() {
  const badges = [
    "COMMON.png",
    "EXTRA.png",
    "RARE.png",
    "LEGENDARY.png",
    "UNTOUCHED.png",
    "INSANE.png",
  ];
  for (const badge of badges) {
    const badgePath = path.join(__dirname, "Images", badge); // no ".."
    console.log("Loading image:", badgePath);
    try {
      await loadImage(badgePath);
      console.log(`Loaded ${badge} successfully.`);
    } catch (e) {
      console.error(`Failed to load ${badge}:`, e.message);
    }
  }
}
testBadges();
