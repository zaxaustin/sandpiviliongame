/* ================================================================
   [MESSAGES, THE SURFACE] — what the phone opens into.

   Deliberately shaped like a message thread rather than a mailbox: the
   steward's own picture was "a text in the phone from these people", and a
   thread is what makes three notes from three residents read as a place with
   people in it rather than an inbox with three rows.

   ONE-WAY, AND SAID SO. You cannot reply here. Every message carries
   `↩ Talk to <resident>`, which opens the real conversation that has existed
   all along (`talkTo(key)` in overlays.js). A pager in, a real conversation
   out — the steward: "if it's one way like a pager that's ok too."

   Outside overlays.js, on the ui/study-table.js and ui/learning-desk.js
   precedent: deps injected once by initMessages(), imports nothing backwards,
   and overlays.js keeps the window-export block that `npm test` joins in both
   directions.
   ================================================================ */

import { state, data, persist } from '../entities.js';
import { blip } from '../main.js';
import { esc } from './dom.js';
import { unreadCount } from '../data/messages.js';

let X = {};
export function initMessages(deps) { X = deps || {}; }

const list = () => { if (!Array.isArray(data.messages)) data.messages = []; return data.messages; };

export function openMessages() {
  state.ui = 'messages';
  X.hideAllOv();
  renderMessages();
  X.showOv('msgOv');
}

/* READ IS A REAL ACT, and it happens on OPENING the thread rather than on
   the message merely existing in a list. noteMeta's `seen` already argued
   this exactly: "A note counts as revisited only when it is opened — being
   in a list is not reading."

   All of them, because the thread shows all of them at once and pretending
   otherwise would leave a dot lit over something the person has plainly
   just read. */
export function markMessagesRead() {
  let changed = false;
  for (const m of list()) if (!m.read) { m.read = true; changed = true; }
  if (changed) {
    persist();
    if (X.setHud) X.setHud();
    /* ⚠ AND REDRAW THE PHONE. Found by looking, 2026-08-16: reading the whole
       thread marked every message read in the save and the card kept its gold
       dot and "left you a message · tap to read" — because nothing told it to
       repaint. Tapping it again reopened an empty thread.
       A notification you cannot dismiss by doing the thing it asks is worse
       than no notification. */
    if (X.refreshPhone) X.refreshPhone();
  }
  return changed;
}

/* The door out of a message and into the person who sent it. */
export function replyToMessage(key) {
  X.closeUI();
  if (X.talkTo) X.talkTo(key);
}

function bubble(m) {
  const who = X.nameOf ? X.nameOf(m.from) : m.from;
  const av = X.avatarOf ? X.avatarOf(m.from) : '💬';
  const glow = X.glowOf ? X.glowOf(m.from) : '#e0a43c';
  /* Paragraphs, because these are written with blank lines in them and a
     wall of run-together text is not a text message. Escaped first — every
     body is authored in this repo today, and that is exactly the assumption
     that stops being true the day a model writes one. */
  const para = String(m.body || '').split(/\n\s*\n/).filter(t => t.trim())
    .map(t => `<div style="margin:.45em 0">${esc(t).replace(/\n/g, '<br>')}</div>`).join('');
  return `<div style="display:flex;gap:10px;margin:14px 0;align-items:flex-start">
    <div class="phoneAvatar" style="background:${glow};color:#2a2118;box-shadow:0 0 0 2px #55432e">${av}</div>
    <div style="flex:1;min-width:0">
      <div class="meta" style="margin:0 0 4px">
        <b style="color:#e0a43c">${esc(who)}</b>${m.at ? ' · ' + esc(m.at) : ''}
        ${m.read ? '' : '<span class="badge" style="border-color:#e0a43c;color:#e0c88a">new</span>'}
      </div>
      <div class="bubble npc" style="max-width:100%;display:block">${para}</div>
      <div class="row" style="margin-top:6px">
        <button class="btn ghost" style="font-size:11px;padding:3px 10px"
          onclick="replyToMessage('${esc(m.from)}')">↩ Talk to ${esc(who)}</button>
      </div>
    </div>
  </div>`;
}

export function renderMessages() {
  const el = document.getElementById('msgPanel');
  if (!el) return;
  const all = list();
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>✉ Messages</h2>
    <div class="meta">The residents leave these when they notice something while you are
      working. <b>Nothing is sent anywhere</b>, and nothing here is asking you for anything —
      you can ignore any of it with no consequence at all.</div>
    ${all.length ? all.slice().reverse().map(bubble).join('')
      : `<div class="card" style="cursor:default;margin-top:14px">
           <div class="t">Nothing yet</div>
           <div class="s" style="margin-top:4px">Pin a course, work a practice, or sit here long
             enough to annoy the Mountain Monk, and someone will say something.</div>
         </div>`}`;
  /* ⚠ MARKED READ AFTER DRAWING, NOT BEFORE. Drawing first means the `new`
     badges are still on screen for the render you are looking at — mark
     first and the thread you just opened claims you had already read it. */
  markMessagesRead();
}

export function messagesUnread() { return unreadCount(list()); }
