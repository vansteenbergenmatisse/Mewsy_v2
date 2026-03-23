// ── DISABLED: Interactive Checklist Block ──────────────────────────────────────
// Feature disabled — come back later to re-enable.
// To restore: copy each section back into its original location in script.js.
//
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: UI_STRINGS entries (inside the UI_STRINGS object in script.js)
// ─────────────────────────────────────────────────────────────────────────────
//
//     checklistLabel:    { en: 'REQUIREMENTS', de: 'ANFORDERUNGEN', 'de-ch': 'ANFORDERUNGEN', 'de-at': 'ANFORDERUNGEN', fr: 'PRÉREQUIS', nl: 'VEREISTEN' },
//     checklistComplete: { en: 'All requirements gathered!', de: 'Alle Anforderungen erfüllt!', 'de-ch': 'Alle Anforderungen erfüllt!', 'de-at': 'Alle Anforderungen erfüllt!', fr: 'Toutes les conditions remplies\u00a0!', nl: 'Alle vereisten voltooid!' },
//
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: [checklist] extraction inside addBotMessage (top of that function)
// ─────────────────────────────────────────────────────────────────────────────
//
//     // ── Extract [checklist] block before any other processing ─────────────────
//     // Stripped from text so it never appears in the prose bubble, then rendered
//     // as its own separate bubble after all text bubbles have been shown.
//     let checklistItems = null;
//     text = text.replace(/\[checklist\]([\s\S]*?)\[\/checklist\]/i, (_, content) => {
//         checklistItems = content
//             .split('\n')
//             .map(s => s.trim().replace(/^[-*•]\s*/, ''))
//             .filter(Boolean);
//         return '';
//     }).trim();
//
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: checklist render call inside addBotMessage (after the messages loop)
// ─────────────────────────────────────────────────────────────────────────────
//
//     // Render checklist bubble after all text bubbles
//     if (checklistItems && checklistItems.length >= 2) {
//         setTimeout(() => {
//             renderChecklistBubble(checklistItems, messageId);
//         }, totalDelay);
//         totalDelay += delay;
//     }
//
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: standalone functions (place after initAccordions, before applyProgressiveReveal)
// ─────────────────────────────────────────────────────────────────────────────

// // ── Checklist block ────────────────────────────────────────────────────────────
// /*
//  * Renders a separate bot bubble containing an interactive checklist.
//  * Called by addBotMessage when the AI output contained [checklist]...[/checklist].
//  * Items are independent — the user ticks them off as they gather requirements.
//  * State is local (not persisted). Progress bar and counter update on each tick.
//  */
// function renderChecklistBubble(items, messageId) {
//     const container = document.createElement("div");
//     container.className = "bot-msg-container";
//
//     // Spacer aligns with text bubbles (no second avatar)
//     const spacer = document.createElement("div");
//     spacer.style.cssText = "width:44px; flex-shrink:0;";
//     container.appendChild(spacer);
//
//     const group = document.createElement("div");
//     group.className = "bot-messages-group";
//
//     const bubble = document.createElement("div");
//     bubble.className = "bot-msg checklist-msg";
//     bubble.dataset.msgId = messageId;
//     bubble.appendChild(createChecklistBlock(items));
//
//     group.appendChild(bubble);
//     container.appendChild(group);
//     body.appendChild(container);
//     autoScroll();
//
//     if (widget.style.display === "none") {
//         unreadCount++;
//         updateUnreadUI();
//     }
// }
//
// function createChecklistBlock(items) {
//     const checked = new Set();
//
//     const block = document.createElement("div");
//     block.className = "checklist-block";
//
//     // ── Header ────────────────────────────────────────────────────────────────
//     const header = document.createElement("div");
//     header.className = "checklist-header";
//
//     const labelEl = document.createElement("span");
//     labelEl.className = "checklist-label";
//     labelEl.textContent = uiStr("checklistLabel");
//
//     const counter = document.createElement("span");
//     counter.className = "checklist-counter";
//     counter.textContent = `0/${items.length}`;
//
//     header.appendChild(labelEl);
//     header.appendChild(counter);
//     block.appendChild(header);
//
//     // ── Progress bar ──────────────────────────────────────────────────────────
//     const track = document.createElement("div");
//     track.className = "checklist-progress-track";
//     const fill = document.createElement("div");
//     fill.className = "checklist-progress-fill";
//     fill.style.width = "0%";
//     track.appendChild(fill);
//     block.appendChild(track);
//
//     // ── Divider ───────────────────────────────────────────────────────────────
//     const divider = document.createElement("div");
//     divider.className = "checklist-divider";
//     block.appendChild(divider);
//
//     // ── Items ─────────────────────────────────────────────────────────────────
//     const itemsEl = document.createElement("div");
//     itemsEl.className = "checklist-items";
//
//     items.forEach((itemText, idx) => {
//         const btn = document.createElement("button");
//         btn.type = "button";
//         btn.className = "checklist-item";
//
//         const icon = document.createElement("span");
//         icon.className = "checklist-check";
//
//         const labelSpan = document.createElement("span");
//         labelSpan.className = "checklist-item-label";
//         labelSpan.textContent = itemText;
//
//         btn.appendChild(icon);
//         btn.appendChild(labelSpan);
//
//         btn.addEventListener("click", () => {
//             if (checked.has(idx)) {
//                 checked.delete(idx);
//                 btn.classList.remove("checked");
//             } else {
//                 checked.add(idx);
//                 btn.classList.add("checked");
//             }
//             // Update progress bar and counter
//             const pct = (checked.size / items.length) * 100;
//             fill.style.width = pct + "%";
//             counter.textContent = `${checked.size}/${items.length}`;
//             // Show or hide completion message
//             completeMsg.classList.toggle("show", checked.size === items.length);
//         });
//
//         itemsEl.appendChild(btn);
//     });
//
//     block.appendChild(itemsEl);
//
//     // ── Completion message ────────────────────────────────────────────────────
//     const completeMsg = document.createElement("div");
//     completeMsg.className = "checklist-complete";
//     completeMsg.innerHTML =
//         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
//         `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 15.01 9 12.01"/>` +
//         `</svg>` +
//         `<span>${uiStr("checklistComplete")}</span>`;
//     block.appendChild(completeMsg);
//
//     return block;
// }
