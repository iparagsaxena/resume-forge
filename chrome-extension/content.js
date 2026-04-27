// ResumeForge content script — marker only.
// The popup dynamically injects extraction logic via chrome.scripting.executeScript.
// This file exists to make the extension ready for future in-page UI (e.g. an inline
// "Tailor with ResumeForge" button on LinkedIn/Indeed/Naukri).

(() => {
    // Simple floating badge on recognised job pages so users know the extension is active.
    if (window.top !== window) return; // only inject in top frame
    const host = location.hostname;
    const supported =
        host.includes("linkedin.com") ||
        host.includes("indeed.com") ||
        host.includes("naukri.com") ||
        host.includes("glassdoor.com") ||
        host.includes("wellfound.com") ||
        host.includes("ycombinator.com");
    if (!supported) return;
    if (document.getElementById("rf-inline-badge")) return;

    const badge = document.createElement("div");
    badge.id = "rf-inline-badge";
    badge.textContent = "RF";
    badge.title = "Open ResumeForge to tailor your resume";
    Object.assign(badge.style, {
        position: "fixed",
        bottom: "18px",
        right: "18px",
        zIndex: 2147483647,
        width: "36px",
        height: "36px",
        background: "#09090b",
        color: "#ffffff",
        fontFamily:
            '"Chivo", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        fontWeight: "900",
        fontSize: "13px",
        letterSpacing: "0.05em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #09090b",
        boxShadow: "4px 4px 0 0 rgba(9,9,11,0.25)",
        cursor: "pointer",
        userSelect: "none",
    });
    badge.addEventListener("mouseenter", () => {
        badge.style.background = "#27272a";
    });
    badge.addEventListener("mouseleave", () => {
        badge.style.background = "#09090b";
    });
    badge.addEventListener("click", () => {
        try {
            chrome.runtime.sendMessage({ type: "rf_open_popup" });
        } catch {
            /* no-op */
        }
    });
    document.documentElement.appendChild(badge);
})();
