# Lesson 01 — A Beating Heart

*Get a local AI running and connect it to the Sand Pavilion, so the residents
actually talk back. No coding. About 20 minutes. Everything here is free and
runs entirely on your own computer — nothing is sent anywhere.*

---

## Why this lesson exists

The Pavilion works with no AI at all — you can walk the grounds, read every
book, plan your day, and fish, forever, with nothing installed. But the
residents — Quill the librarian, the Mountain Monk, Sebastian the butler — only
truly **come alive** when there's a local AI running on your machine for them to
think with. That AI is the Pavilion's **beating heart.** This lesson gives it
one.

Three things worth knowing before we start, in one line each:
- **"Local AI"** — a program (Ollama) that runs an AI *model* on your own
  computer. No account, no internet needed once it's installed, no cost.
- **"A model"** — the actual "brain" the AI uses. They come in sizes; bigger is
  smarter but needs a stronger computer. Picking the right size for *your*
  machine is Step 1, and it's the step most guides skip.
- **You will not type any code.** A few copy-paste commands at most.

---

## Step 1 — Check what your machine can handle *first*

This is the step that saves you frustration: **match the model to your
computer**, so it runs smoothly instead of crawling. You're checking two things
— your **memory (RAM)** and whether you have a real **graphics card (GPU)**.

### On Windows
1. Press **Ctrl + Shift + Esc** to open **Task Manager**, then click the
   **Performance** tab.
2. Click **Memory** on the left — the top number is your **RAM** (e.g. "16.0
   GB"). Write it down.
3. Click **GPU** on the left. If you see a GPU with its own "Dedicated GPU
   memory" of 6 GB or more (an NVIDIA/AMD card), you have a **real GPU**. If it
   only lists something like "Intel UHD Graphics" with little dedicated memory,
   treat yourself as **no real GPU** — that's completely fine, plenty of the
   Pavilion runs there.

### On a Mac
1. Click the **Apple menu → About This Mac**.
2. Read the **Memory** line (e.g. "16 GB") — that's your RAM.
3. Apple Silicon (M1/M2/M3/M4) Macs share memory between CPU and GPU and run
   these models *well*; treat an Apple-Silicon Mac as "has a good GPU." An older
   Intel Mac without a discrete card: treat as "no real GPU."

### Now find your row

| What you found | The model to get | What to expect |
| --- | --- | --- |
| 8 GB RAM, no real GPU, older machine | `llama3.2:1b` | Fast, simple replies; the whole Pavilion works |
| 8–16 GB RAM (most laptops/desktops) | `llama3.2` | The dependable default — quick, plain-spoken residents |
| 16 GB+ RAM, or a real GPU (6 GB+), or Apple Silicon | `llama3.1:8b` | Noticeably deeper conversations, still reliable |
| 12 GB+ GPU / a gaming or creator machine | `llama3.1:8b` now, and later maybe a bigger one for the Monk | The Monk automatically uses your largest model and thinks deeply |

**Rule of thumb:** when unsure, pick the *smaller* one. A resident that answers
in two seconds beats a smarter one you stop wanting to talk to — and you can
always pull a bigger model later. (The fuller version of this table, and why
"thinking" models like `deepseek-r1` are worth avoiding at first, is in
[`../PROTOCOLS.md`](../PROTOCOLS.md#which-model-should-i-pull-the-tiered-guide).)

---

## Step 2 — Install Ollama

Ollama is the free program that runs the model. Get it one of two ways:

- **Easiest:** go to **[ollama.com](https://ollama.com)**, download, and run the
  installer like any normal app.
- **Windows, from a terminal:** open PowerShell and run
  `winget install Ollama.Ollama`.

After it installs, Ollama runs quietly in the background (look for its icon in
your system tray / menu bar).

---

## Step 3 — Pull your model

"Pulling" just means downloading the model you chose in Step 1. Open a terminal
(PowerShell on Windows, Terminal on Mac) and type, for example:

```
ollama pull llama3.2
```

(Swap in whatever your row said — `llama3.2:1b`, `llama3.1:8b`, etc.) It'll
download once — a few minutes depending on your internet — and it's yours
forever after, offline included.

**Quick check it worked:** run `ollama list` — you should see your model in the
list.

---

## Step 4 — Give the Pavilion its heart

Now connect what you just installed to the game. **This depends on how you run
the Pavilion:**

### If you use the desktop app (recommended)
**Nothing to do — it just works.** The desktop app talks to Ollama directly. Open
the Pavilion; on the "Enter the Grounds" screen you should see a line like:

> ● Connected to Ollama · llama3.2

That green dot is the beating heart. You're done — skip to Step 5.

### If you use the Pavilion in a web browser
A browser needs one extra permission so it's allowed to talk to Ollama. In a
terminal, run:

```
setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"
```

Then **fully close and reopen your terminal (and Ollama)**, and reload the game.
You should now see the green "● Connected" line. (This step exists only because
browsers are cautious about pages talking to programs on your computer — the
desktop app doesn't have that limitation.)

**Not sure it's talking?** Run `curl http://localhost:11434/api/tags` — if it
prints a wall of text mentioning your model, Ollama is reachable.

---

## Step 5 — Say hello (the real test)

Walk to the **Library** and talk to **Quill** (press **E**). Ask anything —
"what's on the shelves?" If Quill answers in his own words, grounded in the
actual books: **the heart is beating.** You now have a local AI companion that
never phones home, never trains on you, and belongs entirely to your machine.

If the reply takes a little while the first time, that's normal — the model is
waking up. You can even pocket the conversation (the phone icon) and walk around
while it thinks.

---

## If something's not right

- **"No local AI detected" but Ollama is installed** → almost always the browser
  `OLLAMA_ORIGINS` step (Step 4) missing or the terminal/Ollama not restarted
  after it. The desktop app avoids this entirely.
- **A reply took forever or came back blank** → you're likely on a "thinking"
  model, or one too big for your machine. Pull `llama3.2` and pick it in **⚙
  Manage AI connections**.
- **"Connection refused"** → Ollama isn't running. Start it (open the app, or run
  `ollama serve`).
- **Generally slow** → drop down a size (`ollama pull llama3.2:1b`) and select it
  in ⚙ Manage AI connections. Smaller and instant beats bigger and painful.

The full troubleshooting list lives in
[`../README.md`](../README.md#troubleshooting).

---

## You did it — what's next

Your Pavilion has a beating heart. From here:
- **Talk to the other residents** — the Monk in the Keep (meaning and practice),
  Sebastian in the Workshop (your day). Each uses your local AI.
- **Manage or add connections** anytime from **⚙ Manage AI connections** — you
  can pull a bigger model later and switch to it here, or add a cloud one (always
  clearly labeled ☁) if you ever want to.
- **Keep learning:** the next foundations are making the Library your own
  (bringing in books you love — [`../PROTOCOLS.md`](../PROTOCOLS.md) Protocol 1)
  and, when you want to understand what's happening under the hood,
  [`../AI-BACKEND-WALKTHROUGH.md`](../AI-BACKEND-WALKTHROUGH.md) and
  [`../LEARNING-PATH.md`](../LEARNING-PATH.md).

Welcome to a Pavilion that's actually alive.
