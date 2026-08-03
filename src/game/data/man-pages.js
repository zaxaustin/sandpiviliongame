/* ================================================================
   [MAN PAGES] — the Computer explains itself, and points at the real
   thing. Built 2026-08-02, at direct request: "the computer should be
   a way for people to learn terminal commands", alongside a stated
   direction — "in the future I want to use Linux and use their tools
   on that platform to really build a proper security setup."

   That second sentence is what shapes this file. The Pavilion's
   terminal is not a Unix shell and pretending otherwise would teach
   something false. But its commands were deliberately named after real
   ones, so every page here has a `real` field: what the equivalent
   actually is on a Linux or macOS box, and what it does there. Learn
   `ls` here, and `ls` on a real machine is the same word doing a bigger
   version of the same job.

   The honest frame, stated in `man man` itself: this is a doorway, not
   a substitute. Nobody learns a shell from a game. What a person CAN
   get here is the grammar — verb, argument, output you read — and the
   habit of typing `man` when a word is unfamiliar, which is the single
   most transferable habit there is.

   Pure data + one lookup, so `npm test` can hold it honest: every
   command the terminal answers must have a page, and every page must
   name its real-world counterpart.
   ================================================================ */

export const MAN_PAGES = {
  ls: {
    use: 'ls',
    what: 'List everything on your own shelves — number, kind, title, shelf.',
    more: 'The number in the left column is what `open` takes. Short for "list".',
    real: '`ls` lists the files in a directory. `ls -la` is the one everybody '
        + 'ends up typing: -l for one-per-line with detail, -a to include the '
        + 'hidden dotfiles. The single most-used command on any Unix machine.',
  },
  find: {
    use: 'find <word>',
    what: 'Search titles, shelves and summaries for a word.',
    more: 'Matches anywhere in the text, not just the start.',
    real: '`find` on Unix searches for FILES rather than inside them — '
        + '`find . -name "*.txt"` walks a whole tree. To search inside files '
        + 'you want `grep -r "word" .`, which is the other command you will '
        + 'use every day.',
  },
  papers: {
    use: 'papers',
    what: 'Only the entries marked as papers.',
    more: 'Mark one in Your Library — it also lets ☀ Today notice an undissected paper.',
    real: 'No direct equivalent; this is a filter over your own catalogue. The '
        + 'Unix habit it echoes is keeping things tagged so a list can be narrowed.',
  },
  ds: {
    use: 'ds [part]',
    what: 'Datasheets, by part number. With an argument it opens the match directly.',
    more: '`ds tsop` is enough — a partial part number is matched.',
    real: 'Closest cousin is `apropos <word>` / `man -k <word>`, which searches '
        + 'the manuals by keyword when you know what you want but not its name.',
  },
  owned: {
    use: 'owned',
    what: 'Books you own on PAPER. No text here, and none is expected.',
    more: 'The residents are told you own these, so they can point you at a real shelf.',
    real: 'None. This one is about a limit of the machine, which is a thing worth '
        + 'a command of its own.',
  },
  analyses: { use:'analyses', what:'Paper dissections you kept in the Science Hall.',
    more:'Open them at the Hall.', real:'None — your own working notes.' },
  shelf: {
    use: 'shelf [name]',
    what: 'List your shelves and their counts, or open one.',
    more: 'With no argument it is a summary; with a name it lists that shelf.',
    real: '`df -h` shows what is on your disks; `du -sh *` shows what is taking '
        + 'the room. Same instinct: what do I have, and how much of it.',
  },
  unread: { use:'unread', what:'What you brought in and never opened.',
    more:'The honest measure of a library you are actually using.', real:'None.' },
  open: {
    use: 'open <number>',
    what: 'Open a numbered result from the last listing in the reader.',
    more: 'Run `ls` or `find` first — the number comes from that list.',
    real: '`open` really is the command on macOS. On Linux it is `xdg-open`. '
        + 'Both hand a file to whatever program is meant to handle it.',
  },
  stats: { use:'stats', what:'Counts: books, papers, datasheets, builds, notes.',
    more:'A quick read on what the Pavilion actually holds.',
    real:'`df`, `free -h`, `uptime` — the family of "how are things" commands.' },
  hash: {
    use: 'hash <number>',
    what: 'The SHA-256 of a book\'s text, from the last listing.',
    more: 'Two copies of a text with the same hash are the same bytes. One '
        + 'character different and the hash is entirely different — that is the '
        + 'whole point of it. This is how a book bundle proves it arrived intact.',
    real: '`sha256sum file` on Linux, `shasum -a 256 file` on macOS, '
        + '`Get-FileHash` in PowerShell. You already used this: it is how you '
        + 'check a download is the file its author published, and it is the '
        + 'foundation under signatures, package managers and version control.',
  },
  net: {
    use: 'net',
    what: 'What this Pavilion talks to over the network.',
    more: 'Answers honestly, including when the answer is "nothing".',
    real: '`ss -tulpn` (or the older `netstat -tulpn`) lists what is LISTENING '
        + 'on your machine and which program owns each port. `lsof -i` does the '
        + 'same from the file-handle side. Knowing what is listening is the '
        + 'first real security skill, and it is just a list you learn to read.',
  },
  ask: { use:'ask <question>', what:'Hand the question to your local AI.',
    more:'The only command here that needs a connection. Everything else is local.',
    real:'None — and worth noticing which commands need the network and which do not.' },
  clear: { use:'clear', what:'Wipe the screen.', more:'The scrollback is gone, nothing else is.',
    real:'`clear`, or Ctrl-L, which is faster and works mid-typing.' },
  man: {
    use: 'man <command>',
    what: 'What a command does — and what its real-world equivalent is.',
    more: 'Type `man` alone to list everything with a page.',
    real: '`man ls` prints the manual for `ls`. Manuals are terse and complete '
        + 'rather than friendly, and learning to read one is the skill. `man man` '
        + 'is a real command and a good joke. Three habits worth stealing: `man` '
        + 'when a word is unfamiliar, `apropos` when you do not know the word, '
        + 'and `--help` when you just want the flags.\n\n'
        + 'This terminal is NOT a Unix shell, and pretending otherwise would '
        + 'teach you something false. What transfers is the grammar — a verb, an '
        + 'argument, output you read — and the habit of asking the machine.',
  },
};

/* Every page, formatted for the terminal. Kept here rather than in the renderer
   so the wording is testable and the panel stays a printer. */
export function manPage(name){
  const k = String(name || '').trim().toLowerCase();
  const p = MAN_PAGES[k];
  if (!p) return null;
  const out = [`${k.toUpperCase()}(1)`, '', `  ${p.use}`, '', `  ${p.what}`];
  if (p.more) out.push('', ...wrap(p.more, 2));
  out.push('', '  ON A REAL MACHINE', ...wrap(p.real, 2));
  return out;
}
export function manIndex(){
  const names = Object.keys(MAN_PAGES).sort();
  return ['MANUAL PAGES — `man <command>` for any of these:', '']
    .concat(names.map(n => '  ' + n.padEnd(10) + MAN_PAGES[n].what))
    .concat(['', 'These commands are named after real ones on purpose. Every page says',
             'what the equivalent is on a Linux or macOS machine, so what you learn',
             'here is a word you already know when you get there.', '']);
}
function wrap(text, indent){
  const pad = ' '.repeat(indent);
  return String(text).split('\n').flatMap(para => {
    if (!para.trim()) return [''];
    const words = para.split(/\s+/), lines = []; let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 68) { lines.push(pad + line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) lines.push(pad + line.trim());
    return lines;
  });
}
