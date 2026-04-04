const API_URL = "https://ext-sys.onrender.com/api/keywords";

let positiveKeywords = [];

// Load keywords from backend
async function loadKeywords() {
  try {
    const res = await fetch(API_URL);
    positiveKeywords = (await res.json()).map(k => k.toLowerCase());
    console.log("✅ Keywords loaded:", positiveKeywords.length);
  } catch (err) {
    console.error("❌ Keyword fetch failed", err);
  }
}

// Click helper
function simulateClick(el) {
  ["mousedown", "mouseup", "click"].forEach(evt =>
    el.dispatchEvent(new MouseEvent(evt, { bubbles: true }))
  );
}

// Check if page contains positive keyword in title
function pageHasPositiveKeyword() {
  const title = document.querySelector("h2, .prdtlita, .product-title")?.innerText.toLowerCase() || "";
  return (
    positiveKeywords.some(k => title.includes(k)) 
  );
}

// Check India + allowed states
function isIndiaLocation() {
  const loc = document.querySelector("input[name='flag_iso']")?.value?.toLowerCase() || "";
  if (loc !== "in") return false;

  const locSpan = document.querySelector("span.state_click.tcont, span.coutry_click.tcont");
  const locationText = (locSpan?.textContent || "").toLowerCase();

  const blockedStates = ["tamil nadu", "telangana", "andhra pradesh", "kerala"];
  if (blockedStates.some(state => locationText.includes(state))) return false;

  return true;
}

// Wait for button and click
function waitForButtonAndClick() {
  const observer = new MutationObserver(() => {
    const btn = document.querySelector(".cmsbutton, .btnCBN, .btnCBN1, #cta0");
    if (btn) {
      console.log("✔ BUTTON FOUND → CLICKING...");
      simulateClick(btn);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Main logic
function tryLead() {
  if (!isIndiaLocation()) return;
  if (!pageHasPositiveKeyword()) return;

  console.log("✔ INDIA + POSITIVE KEYWORD → WAITING FOR BUTTON...");
  waitForButtonAndClick();
}

// Boot
window.addEventListener("load", async () => {
  await loadKeywords();

  // Try lead after short delay
  setTimeout(() => tryLead(), 1000);

  // Optional: reload page after 6 seconds
  setTimeout(() => location.reload(), 6000);
});
