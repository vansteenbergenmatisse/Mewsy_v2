// ── Config ────────────────────────────────────────────────────────────────────
// Update BACKEND_URL when deploying to production.
const BACKEND_URL = "http://localhost:3001/webhook/chat";

// ── Session ID ────────────────────────────────────────────────────────────────
const getSessionId = () => {
    let id = sessionStorage.getItem("mewsy_session_id");
    if (!id) {
        id = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem("mewsy_session_id", id);
    }
    return id;
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const widgetBtn    = document.getElementById("chat-widget-button");
const widget       = document.getElementById("chat-widget-container");
const closeBtn     = document.getElementById("chat-widget-close");
const input        = document.getElementById("chat-widget-input");
const sendBtn      = document.getElementById("chat-widget-send");
const body         = document.getElementById("chat-widget-body");
const fullscreenBtn = document.getElementById("chat-widget-fullscreen");
const helpBtn      = document.getElementById("chat-widget-help");
const helpPanel    = document.getElementById("help-panel");
const helpBackBtn  = document.getElementById("help-panel-back");
const helpDetailPanel   = document.getElementById("help-detail-panel");
const helpDetailBackBtn = document.getElementById("help-detail-back");
const helpDetailTitle   = document.getElementById("help-detail-title");
const helpDetailContent = document.getElementById("help-detail-content");
const unreadBadge  = document.getElementById("chat-unread-badge");
const helpSearchInput = document.getElementById("help-search-input");
const scrollToBottomBtn = document.getElementById("scroll-to-bottom");

// ── Unread badge ──────────────────────────────────────────────────────────────
let unreadCount = 0;
const originalTitle = document.title;

function updateUnreadUI() {
    if (unreadCount > 0) {
        unreadBadge.style.display = "flex";
        unreadBadge.textContent = unreadCount;
        document.title = `(${unreadCount}) New message from Mewsy`;
    } else {
        unreadBadge.style.display = "none";
        document.title = originalTitle;
    }
}

// ── Scroll ────────────────────────────────────────────────────────────────────
function autoScroll() {
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
    // scroll event will fire and hide the pill automatically
}

// Show/hide the scroll-to-bottom pill based on scroll position
body.addEventListener("scroll", () => {
    const distFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
    scrollToBottomBtn.classList.toggle("show", distFromBottom > 80);
}, { passive: true });

scrollToBottomBtn.addEventListener("click", () => {
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
});

// ── Accordion for long step lists ─────────────────────────────────────────────
/*
 * Called after each bot message renders. Finds any <ol> with 5+ items and
 * wraps them in 2–3 collapsible accordion sections. The first section is
 * expanded; others start collapsed. Max-height is driven via JS so the
 * open/close animation works with dynamic content heights.
 */
function initAccordions(container) {
    container.querySelectorAll("ol").forEach(ol => {
        const items = Array.from(ol.querySelectorAll("li"));
        if (items.length < 2) return; // single-item lists stay flat

        // 2–4 items → 1 collapsible section
        // 5–8 items → 2 sections
        // 9+  items → 3 sections
        const numGroups = items.length >= 9 ? 3 : items.length >= 5 ? 2 : 1;
        const groupSize = Math.ceil(items.length / numGroups);

        const accordion = document.createElement("div");
        accordion.className = "response-accordion";

        for (let g = 0; g < numGroups; g++) {
            const groupItems = items.slice(g * groupSize, (g + 1) * groupSize);
            if (groupItems.length === 0) continue;

            // Pull step numbers from the embedded <strong>N)</strong> badges
            const firstStrong = groupItems[0].querySelector("strong");
            const lastStrong  = groupItems[groupItems.length - 1].querySelector("strong");
            const firstNum = firstStrong ? parseInt(firstStrong.textContent) || g * groupSize + 1 : g * groupSize + 1;
            const lastNum  = lastStrong  ? parseInt(lastStrong.textContent)  || Math.min((g + 1) * groupSize, items.length) : Math.min((g + 1) * groupSize, items.length);
            const stepLabel = firstNum === lastNum ? `Step ${firstNum}` : `Steps ${firstNum}–${lastNum}`;

            // Title: up to 16 words of the first item's text (strip the leading "N) " badge)
            const rawText  = groupItems[0].textContent.trim().replace(/^\d+[).]\s*/, "");
            const words    = rawText.split(/\s+/);
            const title    = words.slice(0, 16).join(" ");

            // ── DOM: section ──────────────────────────────────────────────
            const section = document.createElement("div");
            section.className = "accordion-section";

            const header = document.createElement("button");
            header.type = "button";
            header.className = "accordion-header" + (g === 0 ? " open" : "");
            header.innerHTML = `
                <span class="accordion-step-badge">${stepLabel}</span>
                <span class="accordion-title">${title}</span>
                <svg class="accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>`;

            const bodyEl = document.createElement("div");
            bodyEl.className = "accordion-body";

            const inner = document.createElement("div");
            inner.className = "accordion-body-inner";

            const newOl = document.createElement("ol");
            groupItems.forEach(li => newOl.appendChild(li.cloneNode(true)));
            inner.appendChild(newOl);
            bodyEl.appendChild(inner);

            // Set initial heights — first section open (no constraint), rest collapsed
            bodyEl.style.maxHeight = g === 0 ? "none" : "0";

            // ── Toggle handler ─────────────────────────────────────────────
            header.addEventListener("click", () => {
                const isOpen = header.classList.contains("open");
                if (isOpen) {
                    // Closing: snapshot current height so transition has a start value
                    bodyEl.style.maxHeight = bodyEl.scrollHeight + "px";
                    // Double rAF ensures the browser has painted the snapshot before animating
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        bodyEl.style.maxHeight = "0";
                    }));
                    header.classList.remove("open");
                } else {
                    // Opening: animate from 0 → scrollHeight, then release constraint
                    bodyEl.style.maxHeight = bodyEl.scrollHeight + "px";
                    bodyEl.addEventListener("transitionend", () => {
                        if (header.classList.contains("open")) bodyEl.style.maxHeight = "none";
                    }, { once: true });
                    header.classList.add("open");
                }
            });

            section.appendChild(header);
            section.appendChild(bodyEl);
            accordion.appendChild(section);
        }

        ol.replaceWith(accordion);
    });
}

// ── Progressive reveal for prose bot messages ─────────────────────────────────
/*
 * Called after each bot message bubble renders. For prose bubbles (no accordion,
 * multiple block-level elements), reveals each paragraph one by one with a short
 * animated typing indicator between them — mimicking the feeling of the bot
 * composing each thought rather than dumping a wall of text at once.
 *
 * Skipped for:
 *   - Bubbles that contain an accordion (they have their own structure)
 *   - Single-element bubbles (nothing to reveal progressively)
 */
function applyProgressiveReveal(msgDiv) {
    const botText = msgDiv.querySelector(".bot-text");
    if (!botText) return;

    // Accordions already have collapsed sections — no extra reveal needed
    if (botText.querySelector(".response-accordion")) return;

    const units = Array.from(botText.children);
    if (units.length <= 1) return; // single block: show immediately, no animation

    // Hide every unit after the first
    units.slice(1).forEach(unit => {
        unit.style.visibility = "hidden";
        unit.style.opacity = "0";
        unit.style.transition = "opacity 0.22s ease";
    });

    // Sequentially: show typing dots → remove dots → fade in next unit
    const TYPING_MS  = 420; // how long the dots show before the paragraph appears
    const PAUSE_MS   = 160; // gap between the paragraph appearing and the next dots
    let delay = 280;        // initial delay before the first typing indicator

    units.slice(1).forEach(unit => {
        // Insert typing indicator just before this unit
        const typingEl = document.createElement("div");
        typingEl.className = "reveal-typing";
        typingEl.innerHTML =
            `<span class="reveal-dot"></span>` +
            `<span class="reveal-dot"></span>` +
            `<span class="reveal-dot"></span>`;

        setTimeout(() => {
            botText.insertBefore(typingEl, unit);
            autoScroll();
        }, delay);

        delay += TYPING_MS;

        // Remove dots, reveal the unit
        setTimeout(() => {
            typingEl.remove();
            unit.style.visibility = "visible";
            unit.style.opacity = "1";
            autoScroll();
        }, delay);

        delay += PAUSE_MS;
    });
}

// ── Request state ─────────────────────────────────────────────────────────────
let isRequestInProgress = false;

function setRequestInProgress(inProgress) {
    isRequestInProgress = inProgress;
    sendBtn.disabled = inProgress;
    input.disabled = inProgress;
}

// ── Language selection ────────────────────────────────────────────────────────
const LANGUAGES = [
    { code: 'en',    flag: '🇺🇸', label: 'English',           systemName: 'English' },
    { code: 'de',    flag: '🇩🇪', label: 'Deutsch',            systemName: 'German' },
    { code: 'de-ch', flag: '🇨🇭', label: 'Schweizerdeutsch',   systemName: 'Swiss German' },
    { code: 'de-at', flag: '🇦🇹', label: 'Österreichisch',     systemName: 'Austrian German' },
    { code: 'fr',    flag: '🇫🇷', label: 'Français',           systemName: 'French' },
    { code: 'nl',    flag: '🇳🇱', label: 'Nederlands',         systemName: 'Dutch' },
];

let selectedLanguage = sessionStorage.getItem("mewsy_lang") || null;
let isFirstMessage = !selectedLanguage;

// Translated UI strings for button labels and placeholders
const UI_STRINGS = {
    somethingElse: { en: 'Something else', de: 'Etwas anderes', 'de-ch': 'Etwas anderes', 'de-at': 'Etwas anderes', fr: 'Autre chose', nl: 'Iets anders' },
    typeOwn:       { en: 'Or type your own answer...', de: 'Oder eigene Antwort eingeben...', 'de-ch': 'Oder eigene Antwort eingeben...', 'de-at': 'Oder eigene Antwort eingeben...', fr: 'Ou tapez votre propre réponse...', nl: 'Of typ uw eigen antwoord...' },
    typeMsg:       { en: 'Type your message...', de: 'Nachricht eingeben...', 'de-ch': 'Nachricht eingeben...', 'de-at': 'Nachricht eingeben...', fr: 'Tapez votre message...', nl: 'Typ uw bericht...' },
    scrollLatest:  { en: 'Latest', de: 'Neueste', 'de-ch': 'Neueste', 'de-at': 'Neueste', fr: 'Dernier', nl: 'Nieuwste' },
};
function uiStr(key) {
    const lang = selectedLanguage || 'en';
    const map = UI_STRINGS[key];
    return map[lang] || map[lang.split('-')[0]] || map.en;
}
let langChanged = false; // true after mid-conversation language switch

const welcomeText = {
    en: [
        "Hi! I'm Mewsy, the Mews x OmniBoost support assistant.",
        "Whether you're onboarding, configuring your mapping, or troubleshooting an issue — I'm here to help. What do you need?"
    ],
    de: [
        "Hallo! Ich bin Mewsy, der Support-Assistent für Mews x OmniBoost.",
        "Egal ob Onboarding, Mapping-Konfiguration oder Fehlerbehebung — ich bin für dich da. Was brauchst du?"
    ],
    fr: [
        "Bonjour ! Je suis Mewsy, l'assistant support pour Mews x OmniBoost.",
        "Que vous soyez en cours d'intégration, de configuration ou de dépannage, je suis là pour vous aider. De quoi avez-vous besoin ?"
    ],
    nl: [
        "Hoi! Ik ben Mewsy, de support-assistent voor Mews x OmniBoost.",
        "Of je nu onboarding doet, je mapping instelt of een probleem oplost — ik ben hier om te helpen. Wat heb je nodig?"
    ],
};

// ── Welcome messages ──────────────────────────────────────────────────────────
let hasShownWelcome = false;

function showWelcomeMessages() {
    if (hasShownWelcome) return;
    hasShownWelcome = true;

    if (!selectedLanguage) {
        selectedLanguage = 'en';
        sessionStorage.setItem("mewsy_lang", 'en');
        updateFlagDisplay();
        buildLangDropdown();
    }

    showWelcomeInLanguage(selectedLanguage);
}

function showWelcomeInLanguage(lang) {
    const base = lang.split('-')[0]; // de-ch → de, de-at → de
    const messages = welcomeText[lang] || welcomeText[base] || welcomeText.en;

    const container = document.createElement("div");
    container.className = "bot-msg-container";
    const avatar = createBotAvatar();
    const messagesGroup = document.createElement("div");
    messagesGroup.className = "bot-messages-group";
    container.appendChild(avatar);
    container.appendChild(messagesGroup);
    body.appendChild(container);

    let currentDelay = 300;
    const typingDuration = 500;
    const messageDelay = 750;

    messages.forEach((messageText) => {
        setTimeout(() => {
            const typingBubble = document.createElement("div");
            typingBubble.className = "bot-msg welcome-typing";
            typingBubble.innerHTML = `<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
            messagesGroup.appendChild(typingBubble);
            autoScroll();

            setTimeout(() => {
                typingBubble.remove();
                const msgDiv = document.createElement("div");
                msgDiv.className = "bot-msg";
                msgDiv.textContent = messageText;
                messagesGroup.appendChild(msgDiv);
                autoScroll();
            }, typingDuration);
        }, currentDelay);
        currentDelay += messageDelay;
    });
}

// ── Avatar helper ─────────────────────────────────────────────────────────────
function createBotAvatar() {
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = `
        <svg viewBox="0 0 194.9 194.9" xmlns="http://www.w3.org/2000/svg">
            <style>.st0{fill:#3277A5;}.st1{fill:#FFFFFF;}.st2{fill:#EC6945;}.st3{fill:#F6A03C;}</style>
            <g>
                <path class="st0" d="M166.4,28.6c-38.1-38.1-99.8-38.1-137.9,0C5.3,51.8-3.8,83.9,1.4,114c6.4-3.2,14.4-1.7,19.2,4.1c0.2,0.2,0.3,0.4,0.4,0.6c2.5-0.8,5.1-1.2,7.5-1.2c11.9,0,21.7,9.2,22.7,20.8c2-0.6,4.1-0.9,6.2-0.9c5,0,9.7,1.8,13.5,4.8c6.7,3.1,11.4,9.9,11.4,17.8c0,3.4-0.9,6.5-2.3,9.3c4,3.1,6.6,8,6.6,13.5c0,4.2-1.5,8.1-4.1,11.1c29.6,4.5,60.9-4.6,83.7-27.4C204.4,128.3,204.4,66.6,166.4,28.6z"/>
                <polygon class="st1" points="46.1,177.5 15.6,147.8 109,78 118,87"/>
                <path class="st2" d="M113.6,81.9c11.8,11.8,14.5,28.8,7.3,40.8c4.6-1.7,8.8-4.3,12.4-7.9c13.9-13.9,13.4-36.8-1.1-51.3S94.8,48.5,81,62.4c-3.5,3.5-6.1,7.6-7.8,12C85.1,67.5,101.9,70.3,113.6,81.9z"/>
                <path class="st2" d="M177.9,42.6c9-18.3,8.1-31.8,8.1-31.8S172.8,9,153.9,18c4.1,3.9,8.2,7.9,12.3,12.1C170.2,34.3,174.1,38.4,177.9,42.6z"/>
                <path class="st3" d="M166.4,28.6c-3.9-3.9-8.1-7.4-12.5-10.6c-8.3,4.2-17.7,10.6-27.5,20.3C113,51.6,103.5,65.6,99.3,76.8c4,2.1,7.8,4.9,11.3,8.4c3.6,3.6,6.4,7.5,8.6,11.7c11.5-4.3,25.8-14.1,39.3-27.7c9.3-9.3,15.4-18.4,19.5-26.7C174.6,37.6,170.7,32.9,166.4,28.6z"/>
                <path class="st2" d="M119.5,83.1C105.1,97.4,97.7,98,97.7,98s0.8-7.6,14.9-21.8c13.3-13.3,21.8-14.9,21.8-14.9S133.1,69.4,119.5,83.1z"/>
                <circle class="st0" cx="152.2" cy="43.5" r="12.9"/>
                <circle class="st1" cx="152.2" cy="43.5" r="9.2"/>
                <path class="st1" d="M80.1,169.2c1.5-2.8,2.3-5.9,2.3-9.3c0-7.9-4.7-14.7-11.4-17.8c-3.8-3-8.4-4.7-13.5-4.8c-2.2,0-4.2,0.3-6.2,0.9c-1-11.6-10.8-20.8-22.7-20.8c-2.4,0-5,0.4-7.5,1.2c-0.2-0.2-0.3-0.4-0.4-0.6c-4.8-5.7-12.7-7.2-19.2-4.1c3.3,19.2,12.3,37.6,27.1,52.4c15.3,15.3,34.3,24.4,54.1,27.4c2.5-3,4-6.8,4-11.1C86.7,177.2,84.1,172.4,80.1,169.2z"/>
            </g>
        </svg>`;
    return avatar;
}

// ── Text formatting ───────────────────────────────────────────────────────────
function formatBotText(text) {
    if (!text) return "";
    let html = text.trim();

    // Strip any [checklist]...[/checklist] blocks — feature is disabled
    html = html.replace(/\[checklist\][\s\S]*?\[\/checklist\]/gi, "").trim();

    // ── Step 0: Extract [callout]...[/callout] blocks before any other processing.
    // They are saved as raw text, replaced with unique block-level placeholders,
    // then re-inserted after all markdown runs so their content is also formatted.
    const callouts = [];
    html = html.replace(/\[callout\]([\s\S]*?)\[\/callout\]/gi, (_, content) => {
        callouts.push(content.trim());
        // Surround with \n\n so the placeholder ends up in its own <p> after processing
        return `\n\nMEWSYCALLOUT${callouts.length - 1}MEWSYCALLOUT\n\n`;
    });

    // Normalise inline numbered lists: "1. Step 2. Step" → separate lines
    html = html.replace(/(?<!\n)\s+(\d+)[.)]\s+/g, (_, num) => `\n${num}. `);
    html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
    // Bare domains without protocol (e.g. omniboost.io/page) — prepend https://
    html = html.replace(/(?<![="\/])(\b(?:[a-z0-9-]+\.)+(?:io|com|org|net|co|be|nl|de|fr|eu)(?:\/[^\s<]*)?)/g, '<a href="https://$1" target="_blank">$1</a>');
    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
    html = html.replace(/((?:^\d+[\.)]\s+.*$\n?)+)/gm, match => {
        const items = match.trim().split(/\n(?=\d+[\.)]\s+)/);
        const listItems = items.map(item => {
            const m = item.match(/^(\d+)[\.)]\s+(.*)$/);
            return m ? `<li><strong>${m[1]})</strong> ${m[2]}</li>` : `<li>${item}</li>`;
        }).join("");
        return `<ol style="list-style: none; padding-left: 0;">${listItems}</ol>`;
    });
    html = html.replace(/((?:^\s*[-*•]\s+.*$\n?)+)/gm, match => {
        const items = match.trim().split(/\n(?=\s*[-*•]\s+)/);
        const listItems = items.map(item => `<li>${item.replace(/^\s*[-*•]\s+/, "")}</li>`).join("");
        return `<ul>${listItems}</ul>`;
    });
    html = html.replace(/\n\n+/g, "</p><p>");
    if (!html.startsWith("<h") && !html.startsWith("<ol") && !html.startsWith("<ul")) {
        html = `<p>${html}</p>`;
    }
    html = html.replace(/([^>])\n([^<])/g, "$1<br>$2");

    // ── Re-insert callouts.
    // Each placeholder is now wrapped in <p>...</p> — we replace the whole <p> with
    // the callout div so we never nest a block element inside a <p>.
    callouts.forEach((rawContent, idx) => {
        // Apply inline markdown to the callout content too
        let c = rawContent
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/__(.*?)__/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/_(.*?)_/g, "<em>$1</em>")
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
        const calloutHtml = `<div class="callout-box"><span class="callout-icon">i</span><span>${c}</span></div>`;
        // Replace <p>PLACEHOLDER</p> to avoid div-inside-p invalid HTML
        html = html.replace(`<p>MEWSYCALLOUT${idx}MEWSYCALLOUT</p>`, calloutHtml);
        // Fallback: plain placeholder (in case it wasn't wrapped in <p>)
        html = html.replace(`MEWSYCALLOUT${idx}MEWSYCALLOUT`, calloutHtml);
    });

    return `<div class="bot-text">${html}</div>`;
}

function splitResponseIntoMessages(text) {
    text = text.trim();
    if (!text) return [];
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 1) return [text];

    // Pass 1: collapse consecutive numbered-list paragraphs into one block.
    // This prevents a 7-step list from being spread across 3 tiny bubbles that
    // each fall below the accordion threshold — they become one block of 7 steps.
    const isListItem = p => /^\d+[.)]\s/.test(p);
    const grouped = [];
    let listBlock = null;
    for (const para of paragraphs) {
        if (isListItem(para)) {
            listBlock = listBlock === null ? para : listBlock + "\n\n" + para;
        } else {
            if (listBlock !== null) { grouped.push(listBlock); listBlock = null; }
            grouped.push(para);
        }
    }
    if (listBlock !== null) grouped.push(listBlock);

    // Pass 2: merge short non-list paragraphs (≤ 600 chars combined) into one bubble.
    const bubbles = [];
    let current = "";
    for (const block of grouped) {
        if (!current) {
            current = block;
        } else if (!isListItem(block) && !isListItem(current) && current.length + block.length < 600) {
            current += "\n\n" + block;
        } else {
            bubbles.push(current);
            current = block;
        }
    }
    if (current) bubbles.push(current);
    return bubbles;
}

// ── Message rendering ─────────────────────────────────────────────────────────
let lastMessageId = null;
let lastUserMessage = "";

function addUserMessage(text) {
    lastUserMessage = text;
    document.querySelectorAll(".bot-option-btn:not(:disabled)").forEach(btn => {
        btn.disabled = true;
    });
    const container = document.createElement("div");
    container.className = "user-msg-container";
    const msgDiv = document.createElement("div");
    msgDiv.className = "user-msg";
    msgDiv.textContent = text;
    const avatar = document.createElement("div");
    avatar.className = "user-avatar";
    avatar.textContent = "U";
    container.appendChild(msgDiv);
    container.appendChild(avatar);
    body.appendChild(container);
    autoScroll();
}

function addBotMessage(text, messageId) {
    const detected = detectOptionButtons(text);
    let detectedOptions = null;
    let detectedQuestion = null;
    let skipBodyMessages = false;

    if (detected) {
        detectedOptions = detected.options;
        detectedQuestion = detected.questionText || null;
        text = detected.bodyText ? detected.bodyText : "";
        skipBodyMessages = !detected.bodyText;
    } else {
        text = stripButtonSyntax(text);
    }

    const messages = skipBodyMessages ? [] : splitResponseIntoMessages(text);
    const delay = 800;
    let totalDelay = 0;
    const isNewGroup = lastMessageId !== messageId;
    lastMessageId = messageId;

    messages.forEach((msg, idx) => {
        setTimeout(() => {
            const container = document.createElement("div");
            container.className = "bot-msg-container";

            if (idx === 0 && isNewGroup) {
                container.appendChild(createBotAvatar());
            } else {
                const spacer = document.createElement("div");
                spacer.style.cssText = "width:44px; flex-shrink:0;";
                container.appendChild(spacer);
            }

            const messagesGroup = document.createElement("div");
            messagesGroup.className = "bot-messages-group";
            const msgDiv = document.createElement("div");
            msgDiv.className = "bot-msg";
            msgDiv.dataset.msgId = messageId;
            msgDiv.innerHTML = formatBotText(msg);
            initAccordions(msgDiv);        // wrap long step lists in collapsible sections
            applyProgressiveReveal(msgDiv); // reveal prose paragraphs one by one
            messagesGroup.appendChild(msgDiv);
            container.appendChild(messagesGroup);
            body.appendChild(container);
            autoScroll();

            if (widget.style.display === "none") {
                unreadCount++;
                updateUnreadUI();
            }
        }, totalDelay);
        totalDelay += delay;
    });

    setTimeout(() => {
        if (detectedOptions && detectedOptions.length > 0) {
            addOptionButtons(detectedOptions, detectedQuestion, messageId, skipBodyMessages);
        } else {
            postRenderListToButtons(messageId);
        }
    }, totalDelay);
}

// ── Option button detection ───────────────────────────────────────────────────

const BUTTON_MAX = 7;

// Imperative verbs that indicate a list is a step list, not an option list.
// Items starting with these words must never become buttons.
const BUTTON_IMPERATIVE_VERBS = /^(select|enter|go|click|open|navigate|complete|accept|connect|verify|choose|pick|set|configure|enable|add|create|map|copy|paste|tap|press|type|fill|save|check|disable|toggle|submit|upload|download|log in|sign in|make sure|ensure|hit|repeat|scroll|drag|drop|remove|delete|update|edit|move|find|look|visit|return|close|confirm|wait|allow|grant|install|restart|refresh|reload)\b/i;

function postRenderListToButtons(messageId) {
    const thisBubbles = Array.from(body.querySelectorAll(`.bot-msg[data-msg-id="${messageId}"]`));
    for (const msgDiv of thisBubbles) {
        // Only convert <ul> — never <ol> (numbered lists are always sequential steps)
        const list = msgDiv.querySelector("ul");
        if (!list) continue;

        const options = Array.from(list.querySelectorAll("li")).map(li => li.textContent.trim()).filter(Boolean);

        // Must have between 2 and BUTTON_MAX items
        if (options.length < 2 || options.length > BUTTON_MAX) continue;

        // All items must be ≤ 90 characters
        if (options.some(o => o.length > 90)) continue;

        // None of the items may start with an imperative verb
        if (options.some(o => BUTTON_IMPERATIVE_VERBS.test(o))) continue;

        // Reject if items look like informational bullets not choices
        if (options.some(o => o.includes(" - ") || o.includes(" – "))) continue;
        const infoPattern = /^(a |an )|\bcalled\b|\bincluding\b|\bsuch as\b/i;
        if (options.filter(o => infoPattern.test(o)).length > options.length / 2) continue;
        const instructionPhrase = /\b(at the bottom|at the top|in the settings|in the menu|on the screen|from the list|from the dropdown|in the field|in the box|on the page|by clicking|by selecting)\b/i;
        if (options.some(o => instructionPhrase.test(o))) continue;

        // The message must contain a sentence ending in ? (Mewsy asked a clarifying question)
        let questionText = null;
        const clone = msgDiv.cloneNode(true);
        clone.querySelectorAll("ul,ol").forEach(l => l.remove());
        const lines = clone.textContent.trim().split("\n").map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            if (line.includes("?") || /^(which|what|are you|do you|have you|would you|is this|did|can you|were you|should|select|choose|pick|could you|could)\b/i.test(line)) {
                questionText = line; break;
            }
        }
        if (!questionText) {
            for (const sib of thisBubbles) {
                if (sib === msgDiv) continue;
                if (sib.textContent.includes("?")) { questionText = sib.textContent.trim(); break; }
            }
        }
        // Must have a clarifying question — no question, no buttons
        if (!questionText) continue;

        list.remove();
        if (!msgDiv.textContent.trim()) msgDiv.closest(".bot-msg-container")?.remove();
        addOptionButtons(options, questionText, messageId, false);
        return;
    }
}

function detectOptionButtons(text) {
    if (!text || typeof text !== "string") return null;
    const trimmed = text.trim();
    const explicitMatch = trimmed.match(/\[BUTTONS:\s*([^\]]+)\]/i);
    if (explicitMatch) {
        const options = explicitMatch[1].split("|").map(s => s.trim()).filter(Boolean);
        const bodyText = trimmed.replace(/\s*\[BUTTONS:[^\]]*\]/gi, "").trim();
        return { bodyText, questionText: null, options };
    }
    const labelsMatch = trimmed.match(/\[LABELS:\s*([^\]]+)\]/i);
    if (labelsMatch) {
        const options = labelsMatch[1].split("|").map(s => s.trim()).filter(Boolean);
        const withoutTag = trimmed.replace(/\s*\[LABELS:[^\]]*\]/gi, "").trim();
        const { bodyText, questionText } = splitQuestionFromBody(withoutTag);
        return { bodyText, questionText, options };
    }
    return detectListButtons(trimmed);
}

function detectListButtons(text) {
    const lines = text.split(/\r?\n/);
    // Only match unordered list items (bullet markers) — never numbered lists
    const listRe = /^\s*(?:[•·▪▸\-\*])\s+(.+)$/;
    const items = [];
    for (const line of lines) {
        const m = line.match(listRe);
        if (m) {
            const item = m[1].trim().replace(/\*\*/g, "").trim();
            if (item.length > 0) items.push(item);
        }
    }

    // Must have between 2 and BUTTON_MAX items
    if (items.length < 2 || items.length > BUTTON_MAX) return null;

    // All items must be ≤ 65 characters
    if (items.some(i => i.length > 65)) return null;

    // The message must contain a sentence ending in ? (required)
    const hasQuestion = text.includes("?");
    if (!hasQuestion) return null;

    // None of the items may start with an imperative verb
    if (items.some(i => BUTTON_IMPERATIVE_VERBS.test(i))) return null;

    // Reject informational bullet patterns
    if (items.some(i => i.includes(" - ") || i.includes(" – "))) return null;
    const infoPattern = /^(a |an )|\bcalled\b|\bincluding\b|\bsuch as\b/i;
    if (items.filter(i => infoPattern.test(i)).length > items.length / 2) return null;
    const instructionPhrase = /\b(at the bottom|at the top|in the settings|in the menu|on the screen|from the list|from the dropdown|in the field|in the box|on the page|by clicking|by selecting)\b/i;
    if (items.some(i => instructionPhrase.test(i))) return null;

    const nonListLines = lines.filter(l => {
        const t = l.trim();
        return t && !listRe.test(t) && !/^\w[\w\s]*:$/.test(t);
    });
    let questionText = null;
    const otherLines = [];
    for (const line of nonListLines) {
        const t = line.trim();
        if (!questionText && (t.includes("?") || /^(which|what|are you|do you|have you|would you|is this|did|can you|were you|should|select|choose|pick)\b/i.test(t))) {
            questionText = t;
        } else if (t) {
            otherLines.push(t);
        }
    }
    if (!questionText) return null;
    const bodyText = otherLines.join(" ").trim() || null;
    return { bodyText, questionText, options: items };
}

function splitQuestionFromBody(text) {
    const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    for (let i = sentences.length - 1; i >= 0; i--) {
        if (sentences[i].endsWith("?") || /or not/i.test(sentences[i])) {
            return {
                questionText: sentences[i],
                bodyText: sentences.filter((_, j) => j !== i).join(" ").trim()
            };
        }
    }
    return { bodyText: text, questionText: null };
}

function stripButtonSyntax(text) {
    return text.replace(/\s*\[BUTTONS:[^\]]*\]/gi, "").replace(/\s*\[LABELS:[^\]]*\]/gi, "").trim();
}

function addOptionButtons(options, questionText, messageId, skipBody) {
    if (!options || options.length === 0) return;
    if (skipBody && questionText) {
        const qContainer = document.createElement("div");
        qContainer.className = "bot-msg-container";
        qContainer.appendChild(createBotAvatar());
        const group = document.createElement("div");
        group.className = "bot-messages-group";
        const qBubble = document.createElement("div");
        qBubble.className = "bot-msg bot-question-bubble";
        qBubble.textContent = questionText;
        group.appendChild(qBubble);
        qContainer.appendChild(group);
        body.appendChild(qContainer);
    }
    const wrapper = document.createElement("div");
    wrapper.className = "bot-option-buttons";
    wrapper.dataset.msgId = messageId;
    // Store the originating question on the container for button click context
    if (questionText) wrapper.dataset.question = questionText;

    // Detect if any option is an "other / something else" variant — those get pencil treatment
    const SOMETHING_ELSE_VARIANTS = /\b(something else|other|etwas anderes|autre chose|iets anders|anders)\b/i;

    // Build the regular option buttons (max 4), treating "other" options specially
    const cappedOptions = options.slice(0, 4);
    let foundSomethingElse = false;
    cappedOptions.forEach((label, idx) => {
        const isSomethingElse = SOMETHING_ELSE_VARIANTS.test(label);
        if (isSomethingElse) foundSomethingElse = true;
        const btn = document.createElement("button");
        if (isSomethingElse) {
            btn.className = "bot-option-btn bot-option-something-else";
            btn.innerHTML = `
                <span class="bot-option-pencil">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </span>
                <span class="bot-option-label">${label}</span>`;
            btn.onclick = () => {
                input.placeholder = uiStr('typeMsg');
                input.focus();
            };
        } else {
            btn.className = "bot-option-btn";
            btn.innerHTML = `
                <span class="bot-option-number">${idx + 1}</span>
                <span class="bot-option-label">${label}</span>
                <svg class="bot-option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>`;
            btn.onclick = () => {
                wrapper.querySelectorAll(".bot-option-btn").forEach(b => {
                    b.disabled = true;
                    b.classList.remove("selected");
                });
                btn.classList.add("selected");
                const originQuestion = wrapper.dataset.question || null;
                const contextMessage = originQuestion ? `${originQuestion} → ${label}` : label;
                addUserMessage(label);
                input.value = "";
                input.placeholder = uiStr('typeMsg');
                updateSendBtnState();
                setRequestInProgress(true);
                showThinking();
                sendToServer(contextMessage);
            };
        }
        wrapper.appendChild(btn);
    });

    const alreadyHasSomethingElse = foundSomethingElse;
    if (!alreadyHasSomethingElse) {
        const label = uiStr('somethingElse');
        const somethingElseBtn = document.createElement("button");
        somethingElseBtn.className = "bot-option-btn bot-option-something-else";
        somethingElseBtn.innerHTML = `
            <span class="bot-option-pencil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </span>
            <span class="bot-option-label">${label}</span>`;
        somethingElseBtn.onclick = () => {
            // Don't send — just focus the input so the user can type freely
            input.placeholder = uiStr('typeMsg');
            input.focus();
        };
        wrapper.appendChild(somethingElseBtn);
    }

    body.appendChild(wrapper);
    autoScroll();
    // Change placeholder to indicate the user can also type their own answer
    input.placeholder = uiStr('typeOwn');
}

// ── Thinking indicator ────────────────────────────────────────────────────────
let thinkingInterval = null;
let thinkingStartTime = null;
let requestTimeoutId = null;
const THINKING_TIMEOUT = 30000;

const thinkingMessagesMap = {
    en:    ["Mewsy is thinking...", "Checking the documentation...", "Almost there...", "Just a moment longer..."],
    de:    ["Mewsy denkt nach...", "Dokumentation wird geprüft...", "Fast fertig...", "Noch einen Moment..."],
    fr:    ["Mewsy réfléchit...", "Consultation de la documentation...", "Presque terminé...", "Encore un instant..."],
    nl:    ["Mewsy denkt na...", "Documentatie raadplegen...", "Bijna klaar...", "Nog even geduld..."],
};
function getThinkingMessages() {
    const base = (selectedLanguage || 'en').split('-')[0];
    return thinkingMessagesMap[selectedLanguage] || thinkingMessagesMap[base] || thinkingMessagesMap.en;
}
let currentMessageIndex = 0;

function showThinking() {
    if (document.getElementById("thinking-bubble")) return;
    thinkingStartTime = Date.now();
    const thinking = document.createElement("div");
    thinking.id = "thinking-bubble";
    thinking.className = "thinking-container";
    thinking.innerHTML = `
        <div class="thinking-bubble">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span class="thinking-text">${getThinkingMessages()[0]}</span>
        </div>`;
    body.appendChild(thinking);
    autoScroll();
    currentMessageIndex = 0;
    thinkingInterval = setInterval(() => {
        const elapsed = Date.now() - thinkingStartTime;
        if (elapsed >= THINKING_TIMEOUT) {
            clearInterval(thinkingInterval);
            removeThinking();
            showTimeoutWarning();
            setRequestInProgress(false);
            return;
        }
        const msgs = getThinkingMessages();
        if (currentMessageIndex < msgs.length - 1) currentMessageIndex++;
        const textEl = thinking.querySelector(".thinking-text");
        if (textEl) textEl.textContent = msgs[currentMessageIndex];
    }, 5000);
    requestTimeoutId = setTimeout(() => {
        if (isRequestInProgress) {
            removeThinking();
            showTimeoutWarning();
            setRequestInProgress(false);
        }
    }, THINKING_TIMEOUT);
}

function removeThinking() {
    const el = document.getElementById("thinking-bubble");
    if (el) el.remove();
    if (thinkingInterval) { clearInterval(thinkingInterval); thinkingInterval = null; }
    if (requestTimeoutId) { clearTimeout(requestTimeoutId); requestTimeoutId = null; }
    currentMessageIndex = 0;
    thinkingStartTime = null;
}

function showTimeoutWarning() {
    const el = document.getElementById("timeout-warning");
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 4000);
}

// ── Server communication ──────────────────────────────────────────────────────
function sendToServer(message) {
    let chatInput = message;
    const langEntry = LANGUAGES.find(l => l.code === selectedLanguage);
    const langSystemName = langEntry ? langEntry.systemName : null;
    if (langSystemName && (isFirstMessage || langChanged)) {
        const verb = langChanged ? 'switched' : 'selected';
        chatInput = `[System note: the user has ${verb} their language to ${langSystemName}. For the remainder of this conversation, always respond in ${langSystemName}.]\n\n${message}`;
        isFirstMessage = false;
        langChanged = false;
    }
    fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chatInput,
            sessionId: getSessionId()
        })
    })
    .then(r => r.json())
    .then(data => {
        removeThinking();
        setRequestInProgress(false);
        const reply = data.output || "I didn't catch that — could you rephrase?";
        const id = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        addBotMessage(reply, id);
    })
    .catch(() => {
        removeThinking();
        setRequestInProgress(false);
        addBotMessage("Sorry, something went wrong while contacting the server.", "msg_" + Date.now());
    });
}

// ── Send button & input ───────────────────────────────────────────────────────

// Keep send button disabled when input is empty
function updateSendBtnState() {
    sendBtn.disabled = isRequestInProgress || input.value.trim().length === 0;
}

input.addEventListener("input", updateSendBtnState);

// Initialise in disabled state (empty input on page load)
updateSendBtnState();

sendBtn.onclick = () => {
    if (isRequestInProgress) return;
    const msg = input.value.trim();
    if (!msg) return; // guard: never send empty
    addUserMessage(msg);
    input.value = "";
    input.placeholder = "Type your message...";
    updateSendBtnState();
    setRequestInProgress(true);
    showThinking();
    sendToServer(msg);
};

input.onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendBtn.click();
    }
};

function showEmptyWarning() {
    const el = document.getElementById("empty-warning");
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1600);
}

// ── Language dropdown ─────────────────────────────────────────────────────────
const langDropdownBtn  = document.getElementById("lang-dropdown-btn");
const langDropdownMenu = document.getElementById("lang-dropdown-menu");
const langFlagDisplay  = document.getElementById("lang-flag-display");

function buildLangDropdown() {
    langDropdownMenu.innerHTML = "";
    LANGUAGES.forEach(({ code, flag, label }) => {
        const item = document.createElement("div");
        item.className = "lang-option" + (selectedLanguage === code ? " active" : "");
        item.innerHTML = `<span class="lang-option-flag">${flag}</span><span>${label}</span>${selectedLanguage === code ? '<span class="lang-option-check">✓</span>' : ''}`;
        item.onclick = () => {
            const prev = selectedLanguage;
            selectedLanguage = code;
            sessionStorage.setItem("mewsy_lang", code);
            langFlagDisplay.textContent = flag;
            if (prev && prev !== code) langChanged = true;
            if (!prev) {
                isFirstMessage = true;
                if (hasShownWelcome) showWelcomeInLanguage(code);
            }
            buildLangDropdown();
            langDropdownMenu.classList.remove("open");
        };
        langDropdownMenu.appendChild(item);
    });
}

function updateFlagDisplay() {
    const entry = LANGUAGES.find(l => l.code === selectedLanguage);
    langFlagDisplay.textContent = entry ? entry.flag : "🌐";
    // Keep the scroll-to-bottom pill label in sync with the selected language
    const labelEl = scrollToBottomBtn.querySelector("span");
    if (labelEl) labelEl.textContent = uiStr("scrollLatest");
}

langDropdownBtn.onclick = (e) => {
    e.stopPropagation();
    langDropdownMenu.classList.toggle("open");
};
document.addEventListener("click", () => langDropdownMenu.classList.remove("open"));

buildLangDropdown();
updateFlagDisplay();

// ── Widget open/close ─────────────────────────────────────────────────────────
widgetBtn.onclick = () => {
    widget.style.display = "flex";
    widget.classList.add("opening");
    widgetBtn.style.display = "none";
    unreadCount = 0;
    updateUnreadUI();
    showWelcomeMessages();
};

closeBtn.onclick = () => {
    widget.style.display = "none";
    widgetBtn.style.display = "flex";
};

// ── Fullscreen ────────────────────────────────────────────────────────────────
let fullscreen = false;
fullscreenBtn.onclick = () => {
    fullscreen = !fullscreen;
    if (fullscreen) {
        widget.classList.add("fullscreen");
        fullscreenBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 9h4V5M19 9h-4V5M5 15h4v4M19 15h-4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else {
        widget.classList.remove("fullscreen");
        fullscreenBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
};

// ── Help panel ────────────────────────────────────────────────────────────────
helpBtn.onclick = () => helpPanel.classList.add("show");
helpBackBtn.onclick = () => {
    helpPanel.classList.remove("show");
    helpSearchInput.value = "";
    document.querySelectorAll(".help-item").forEach(item => item.style.display = "flex");
};
helpDetailBackBtn.onclick = () => helpDetailPanel.classList.remove("show");

helpSearchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    document.querySelectorAll(".help-item").forEach(item => {
        const title = item.querySelector(".help-item-title").textContent.toLowerCase();
        const subtitle = item.querySelector(".help-item-subtitle").textContent.toLowerCase();
        item.style.display = (!term || title.includes(term) || subtitle.includes(term)) ? "flex" : "none";
    });
});

const helpTopicContent = {
    integration: {
        title: "Mews x OmniBoost Integration",
        sections: [
            { heading: "Overview", content: "The Mews x OmniBoost integration connects your Mews PMS to OmniBoost's accounting middleware, enabling automated revenue posting, folio exports, and financial reporting." },
            { heading: "How it works", content: "OmniBoost fetches data from Mews via the Mews API, transforms it according to your mapping configuration, and pushes it to your connected accounting system. You control what gets pushed and when." },
            { heading: "Integration tiers", content: "OmniBoost offers different integration tiers depending on the depth of automation required — from basic revenue push to full accounting sync including payments, taxes, and corrections." }
        ]
    },
    onboarding: {
        title: "Onboarding & Initial Setup",
        sections: [
            { heading: "Step 1: Connect Mews", content: "Go to the OmniBoost portal and add your Mews property. You will need your Mews Client Token and Access Token from the Mews Commander settings." },
            { heading: "Step 2: Configure your accounting system", content: "Select your accounting software (e.g. Exact, Xero, QuickBooks) and follow the connection wizard. OmniBoost will guide you through authorizing the connection." },
            { heading: "Step 3: Set up your mapping", content: "Map your Mews service categories, payment types, and outlet codes to the corresponding accounts in your accounting system." },
            { heading: "Step 4: Run a test push", content: "Use the manual trigger in the OmniBoost portal to run a test push for a specific date. Verify the output in your accounting system before enabling automation." }
        ]
    },
    mapping: {
        title: "Mapping Configuration",
        sections: [
            { heading: "What is mapping?", content: "Mapping defines how each revenue category, payment type, and tax code from Mews gets translated into the correct account or dimension in your accounting system." },
            { heading: "Revenue mapping", content: "Each Mews service (accommodation, F&B, extras) must be mapped to a revenue account. Unmapped items will appear as warnings in the OmniBoost portal." },
            { heading: "Payment mapping", content: "Map each Mews payment type (cash, card, city ledger) to the corresponding clearing or liability account in your accounting system." },
            { heading: "Tax mapping", content: "Tax codes from Mews must be matched to the correct VAT or tax rates in your accounting system to ensure compliant reporting." }
        ]
    },
    "revenue-push": {
        title: "Full Revenue Push",
        sections: [
            { heading: "What is Full Revenue Push?", content: "Full Revenue Push is OmniBoost's automated daily process that exports the previous day's revenue from Mews and posts it to your accounting system as journal entries." },
            { heading: "Schedule", content: "By default the push runs automatically every morning. You can configure the timing and also trigger it manually from the OmniBoost portal for any date range." },
            { heading: "What gets pushed", content: "Revenue by service category, VAT breakdown, payment totals, and corrections/rebates — all mapped to your chart of accounts." },
            { heading: "Troubleshooting push failures", content: "If a push fails, check the OmniBoost job log for the error detail. Common causes are unmapped categories, expired API tokens, or locked accounting periods." }
        ]
    },
    troubleshooting: {
        title: "Troubleshooting",
        sections: [
            { heading: "Unmapped items", content: "If the portal shows unmapped warnings, go to your mapping configuration and assign the flagged categories or payment types to the correct accounts before re-running the push." },
            { heading: "API token expired", content: "If Mews returns an authentication error, regenerate your Access Token in Mews Commander and update it in the OmniBoost portal under your property settings." },
            { heading: "Data mismatch", content: "If figures in your accounting system don't match Mews, check the date range, timezone settings, and whether any corrections or rebates were applied after the initial push." },
            { heading: "Push not running", content: "Verify that automation is enabled for your property in the OmniBoost portal and that your subscription is active." }
        ]
    },
    contact: {
        title: "Contact Support",
        sections: [
            { heading: "Mews integration support", content: "For questions about the Mews x OmniBoost integration, reach out to the OmniBoost support team via the portal or by email." },
            { heading: "Email", content: "pms@omniboost.be — for integration and technical questions." },
            { heading: "Business hours", content: "Monday – Friday: 9:00 AM – 6:00 PM CET. Urgent issues are handled with priority." }
        ],
        cta: { title: "Chat with Mewsy", text: "For quick answers, just ask Mewsy directly — it has access to the full OmniBoost documentation.", button: "Ask Mewsy" }
    }
};

document.querySelectorAll(".help-item").forEach(item => {
    item.onclick = () => {
        const content = helpTopicContent[item.dataset.topic];
        if (!content) return;
        helpDetailTitle.textContent = content.title;
        let html = "";
        content.sections.forEach(s => {
            html += `<div class="help-detail-section"><h2>${s.heading}</h2>`;
            if (s.content) html += `<p>${s.content}</p>`;
            if (s.list) html += `<ul>${s.list.map(li => `<li>${li}</li>`).join("")}</ul>`;
            html += `</div>`;
        });
        if (content.cta) {
            html += `
                <div class="help-detail-cta">
                    <h3>${content.cta.title}</h3>
                    <p>${content.cta.text}</p>
                    <button onclick="document.getElementById('help-detail-panel').classList.remove('show'); document.getElementById('help-panel').classList.remove('show');">${content.cta.button}</button>
                </div>`;
        }
        helpDetailContent.innerHTML = html;
        helpDetailPanel.classList.add("show");
    };
});
