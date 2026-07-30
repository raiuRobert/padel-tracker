export const LOCALES = ["en", "ro"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ro: "Română" };

/**
 * Plain string messages. `{name}` placeholders are substituted at call time.
 *
 * A flat typed dictionary rather than an i18n library: the app is one bundle with no routing or
 * server rendering to negotiate, and this way a missing Romanian key is a compile error instead of
 * a string that silently falls back to English in front of the group.
 */
const en = {
  "nav.play": "Play",
  "nav.roster": "Roster",
  "nav.allTime": "All-time",
  "nav.history": "History",

  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.remove": "Remove",
  "common.add": "Add",
  "common.loading": "Loading…",
  "common.saving": "Saving…",
  "common.nobody": "Nobody yet",
  "common.language": "Language",
  "common.confirm": "Confirm",
  "common.done": "Done",

  "confirm.removePlayerTitle": "Remove player?",
  "confirm.deleteGroupTitle": "Delete group?",
  "confirm.deleteSessionTitle": "Delete session?",

  "home.subtitle": "Fair rotations, live scores, an honest split.",
  "home.inProgress": "In progress",
  "home.continue": "Continue session",
  "home.readyTitle": "Ready to play",
  "home.readyBody": "Pick who turned up, how many courts you have, and how you want to rotate.",
  "home.start": "Start a session",
  "home.needPlayersTitle": "Add your players first",
  "home.needPlayersBody": "You need at least four people on the roster before you can start a session.",
  "home.goToRoster": "Go to roster",
  "home.recent": "Recent sessions",
  "home.seeAll": "See all",
  "home.noFinishedTitle": "No finished sessions yet",
  "home.noFinishedBody": "Once you wrap up a session it shows here, with the final standings and who owes what.",

  // The introductory guide. Six short sections rather than one screen of bullets: the rotation
  // modes and the cost split are the parts newcomers don't guess, and they need a little room.
  "error.title": "Something broke",
  "error.body":
    "That screen couldn't be drawn. Your sessions are stored on this device and haven't been touched, so trying again is safe.",
  "error.retry": "Try again",
  "error.home": "Back to start",

  "guide.open": "Guide",
  "guide.close": "Close",
  "guide.skip": "Skip",
  "guide.back": "Back",
  "guide.next": "Next",
  "guide.finish": "Add players",
  "guide.step": "{current} of {total}",

  "guide.welcomeTitle": "Welcome to Padel Tracker",
  "guide.welcomeBody": "A courtside app for social padel. Here's the whole thing in about a minute.",
  "guide.welcomeRotations": "Works out who partners whom, as evenly as possible.",
  "guide.welcomeScores": "Keeps the score with one tap a round.",
  "guide.welcomeCosts": "Splits the bill by time played, or evenly — your call.",

  "guide.playersTitle": "Start with your players",
  "guide.playersBody":
    "Add everyone who plays — you only do this once, and it stays on your phone. Save the regulars as a group and starting a session takes two taps.",
  "guide.playersNote": "You need at least four players to start.",

  "guide.rotationTitle": "Two ways to rotate",
  "guide.rotationBody": "Pick one when you start a session. Both share the sit-outs fairly.",
  "guide.rotationAmericano": "Americano",
  "guide.rotationAmericanoBody": "The schedule is fixed up front. Everyone partners with everyone.",
  "guide.rotationMexicano": "Mexicano",
  "guide.rotationMexicanoBody": "Pairs are rebuilt each round from the standings, so games stay close.",

  "guide.scoringTitle": "Tap the team that won",
  "guide.scoringBody":
    "There's no game score to keep. Tap the winning team, save the round, and every player on that side gets a point.",
  "guide.scoringNote": "Tapped the wrong one? Tap the other and save again.",

  "guide.costsTitle": "Split the bill honestly",
  "guide.costsBody":
    "Enter what the court costs per hour, then pick how to divide it: by the rotations each person played, so arriving late costs less, or equally between everyone.",
  "guide.costsNote": "Balls, a grip or a round of drinks go on the tab of whoever had them.",

  "guide.shareTitle": "Everyone can keep score",
  "guide.shareBody":
    "Share the session with a link or QR code. Whoever opens it joins the same session and can enter results — every phone updates at once.",
  "guide.shareNote": "No accounts. The link is the invitation.",

  "roster.title": "Roster",
  "roster.subtitle": "Everyone who plays, plus the groups you start sessions from.",
  "roster.players": "Players",
  "roster.addPlaceholder": "Add a player",
  "roster.newPlayerLabel": "New player name",
  "roster.noPlayersTitle": "No players yet",
  "roster.noPlayersBody": "Add everyone who plays regularly. You only have to do this once.",
  "roster.rename": "Rename",
  "roster.renameLabel": "Rename {name}",
  "roster.removeLabel": "Remove {name}",
  "roster.needMore": "Add {players} more to start a session.",
  "roster.readyToPlay": "{players} — enough to start a session.",
  "roster.clearAll": "Remove all",
  "roster.confirmClearAllTitle": "Remove all players?",
  "roster.confirmClearAll":
    "Remove {players} from the roster and from every saved group?\n\nAnyone who has played a session is kept as archived, so past results still show their name.",
  "roster.archivedSection": "Archived",
  "roster.archivedHint":
    "Removed from the roster but kept so past sessions still show their names. They aren't offered when starting a session.",
  "roster.groups": "Groups",
  "roster.newGroup": "+ New group",
  "roster.editGroup": "Edit group",
  "roster.noGroupsTitle": "No groups saved",
  "roster.noGroupsBody":
    "Save the people you usually play with so starting a session is two taps instead of eight.",
  "roster.groupNamePlaceholder": "Group name, e.g. Tuesday regulars",
  "roster.groupNameLabel": "Group name",
  "roster.groupEmpty": "No players yet",
  "roster.confirmRemovePlayer":
    "Remove {name} from the roster and any saved groups?\n\nIf they've played a session they're kept as archived, so past results still show their name.",
  "roster.confirmDeleteGroup": "Delete the group \"{name}\"? Players are kept.",
  "roster.confirmDeleteGroupActive":
    "Delete the group \"{name}\"?\n\nThere's a session in progress from this group. It will keep running and nothing is lost — but its results will no longer count towards this group's all-time table, only the overall one. Players are kept.",

  "setup.title": "New session",
  "setup.subtitle": "Set it up once; everything after this is tapping the winner.",
  "setup.whosPlaying": "Who's playing",
  "setup.pickPlayers": "Pick who turned up.",
  "setup.goodToGo": "{players} on {courts} — good to go.",
  "setup.configOption": "{players} on {courts}",
  "setup.sevenPlayers": "Seven is the awkward one — play 6 or 8, or add a stand-in.",
  // Phrased so the count is the object, not the subject: no verb has to agree with it, which is what
  // made "1 players doesn't fit" possible in the first place.
  "setup.unsupported": "There's no fair rotation for {players}. Supported: {options}.",
  "setup.pairs": "Opening pairs",
  "setup.pairsHint":
    "Tap two players to pair them. These are the partnerships the first round starts from; after that everyone rotates.",
  "setup.format": "Format",
  "setup.mode": "Rotation mode",
  "setup.americano": "Americano",
  "setup.americanoSub": "Fixed schedule",
  "setup.mexicano": "Mexicano",
  "setup.mexicanoSub": "Ranked pairings",
  "setup.americanoHint": "Whole schedule fixed up front. Everyone partners with everyone.",
  "setup.mexicanoHint": "Pairings rebuilt each round from the standings, so games stay close.",
  "setup.courts": "Courts",
  "setup.oneCourt": "1 court",
  "setup.twoCourts": "2 courts",
  "setup.date": "Date",
  "setup.cost": "Cost",
  "setup.pricePerHour": "Price per hour",
  "setup.courtNPricePerHour": "Court {number} price/hour",
  "setup.hours": "Hours",
  "setup.currency": "Currency",
  "setup.courtSplit": "Split the court fee",
  "setup.splitByTime": "By time played",
  "setup.splitEven": "Evenly",
  "setup.splitByTimeHint": "Everyone pays for the rotations they played, so arriving late or leaving early costs less.",
  "setup.splitEvenHint": "The court fee is divided equally, however much anyone played.",
  "setup.whoPaid": "Who paid for the court?",
  "setup.paidHint": "Optional — used to work out who owes whom.",
  "setup.start": "Start session",
  "setup.starting": "Starting…",
  "setup.notEnoughTitle": "Not enough players",
  "setup.notEnoughBody": "You need at least four people on the roster to start a session.",

  "session.play": "Play",
  "session.standings": "Standings",
  "session.costs": "Costs",
  "session.share": "Share",

  "share.title": "Play together, live",
  "share.body": "Everyone who opens this link joins the same session and can enter scores — updates show on every device instantly.",
  "share.scan": "Scan to join",
  "share.copy": "Copy link",
  "share.copied": "Copied!",
  "share.shareVia": "Share…",
  "share.close": "Close",
  "session.finished": "Finished",
  "session.notFoundTitle": "Session not found",
  "session.notFoundBody": "It may have been deleted, or stored in a different browser.",
  "session.backToStart": "Back to start",

  "play.round": "Round {number}",
  "play.extra": "+ Extra",
  "play.courtSwap": "Two players change court",
  "play.courtSwapHint": "New block — the courts have been remixed.",
  // A label, not a sentence: it takes any number of names, in this round or a past one, without a
  // verb that would have to agree with how many.
  "play.sittingOut": "Sitting out",
  "play.benchList": "Sitting out: {names}",
  "play.tapWinner": "Tap the winning team",
  "play.saveRound": "Save round",
  "play.updateRound": "Update result",
  "play.played": "Played",
  "play.comingUp": "Coming up",
  "play.editingRound": "Editing round {number}",
  "play.court": "Court {number}",
  "play.won": "won",
  "play.sessionControl": "Session",
  "play.finishSession": "Finish session",
  "play.finishHint": "Settles the standings and the cost split. You can reopen it if you play on.",
  "play.reopenSession": "Reopen session",
  "play.reopenHint": "Puts another round on the board so you can carry on playing.",
  "play.finishedTitle": "Session finished",
  "play.finishedBody": "{rounds}. Standings and costs are settled — correct a result below if one went in wrong.",
  "play.winnerLabel": "{team} won",

  "standings.after": "After {rounds}",
  "standings.points": "points",
  "standings.noScoresTitle": "No results yet",
  "standings.noScoresBody": "Play a round and tap the winner — the leaderboard fills in from there.",
  "standings.fixPrompt": "Result wrong? Correct it",
  "standings.fixTitle": "Correct a result",
  "standings.fixHint":
    "Pick the team that actually won and save. The table above follows, and so does the cost split.",
  // Wins and losses are shown as a ✓/✕ chip rather than a letter, so they read the same in every
  // language. These labels exist for screen readers and tooltips.
  "standings.allTimeTitle": "All-time",
  "standings.allTimeSubtitle": "Every game won, added up.",
  "standings.everyone": "Everyone",
  "standings.noSessionsTitle": "No sessions yet",
  "standings.noSessionsBody": "Once you've played and scored a session, the all-time table builds itself.",
  "standings.nothingForGroupTitle": "Nothing for this group yet",
  "standings.nothingForGroupBody": "Start a session from this group and its results will collect here.",
  "standings.rankedBy": "Ranked on games won, then fewest losses.",

  "costs.theBill": "The bill",
  "costs.court": "Court",
  "costs.courtN": "Court {number}",
  "costs.rateTimesHours": "{rate}/hr × {hours}",
  "costs.extras": "Extras",
  "costs.total": "Total",
  "costs.frontedBy": "Fronted by",
  "costs.perPlayer": "Per player",
  "costs.courtPlusExtras": "court + extras",
  "costs.courtLine": "Court · {rotations}",
  "costs.courtEvenLine": "Court · split evenly",
  "costs.noCostTitle": "No cost entered yet",
  "costs.noCostBody": "Add what the court cost and everyone's share is worked out from there.",
  "costs.addCourtCost": "Add the court cost",
  "costs.noExtrasTitle": "Nothing extra yet",
  "costs.noExtrasBody":
    "Balls, a grip, a borrowed racket, drinks from the fridge — add them as they happen and they land on the right person's tab.",
  "costs.settleUp": "Settle up",
  "costs.nothingToSettleTitle": "Nothing to settle",
  "costs.settledBody": "Everyone's square.",
  "costs.saySomeoneFronted": "Say who fronted the court payment and this works out who owes them what.",
  "costs.owes": "owes",
  "costs.whoFronted": "Who fronted the court payment?",

  "extra.title": "Add an extra",
  "extra.what": "What was it?",
  "extra.whatPlaceholder": "Balls, grip, drinks…",
  "extra.cost": "Cost",
  "extra.billedTo": "Billed to",
  "extra.billedHint": "Split evenly between whoever you pick — not the whole session.",
  "extra.adding": "Adding…",
  "extra.removeLabel": "Remove {name}",

  "history.title": "History",
  "history.noSessionsTitle": "No sessions yet",
  "history.noSessionsBody": "Every session you play is kept here, with its standings and cost split.",
  "history.startSession": "Start a session",
  "history.live": "live",
  "history.confirmDelete": "Delete the session on {date}? This can't be undone.",
  "history.deleteLabel": "Delete session on {date}",
} as const;

export type MessageKey = keyof typeof en;

const ro: Record<MessageKey, string> = {
  "nav.play": "Joacă",
  "nav.roster": "Jucători",
  "nav.allTime": "General",
  "nav.history": "Istoric",

  "common.cancel": "Anulează",
  "common.save": "Salvează",
  "common.edit": "Editează",
  "common.delete": "Șterge",
  "common.remove": "Elimină",
  "common.add": "Adaugă",
  "common.loading": "Se încarcă…",
  "common.saving": "Se salvează…",
  "common.nobody": "Nimeni deocamdată",
  "common.language": "Limbă",
  "common.confirm": "Confirmă",
  "common.done": "Gata",

  "confirm.removePlayerTitle": "Elimini jucătorul?",
  "confirm.deleteGroupTitle": "Ștergi grupul?",
  "confirm.deleteSessionTitle": "Ștergi sesiunea?",

  "home.subtitle": "Rotații corecte, scor pe loc, împărțire cinstită.",
  "home.inProgress": "În desfășurare",
  "home.continue": "Continuă sesiunea",
  "home.readyTitle": "Gata de joc",
  "home.readyBody": "Alege cine a venit, câte terenuri aveți și cum vreți să rotiți.",
  "home.start": "Începe o sesiune",
  "home.needPlayersTitle": "Adaugă întâi jucătorii",
  "home.needPlayersBody": "Ai nevoie de cel puțin patru jucători în listă ca să începi o sesiune.",
  "home.goToRoster": "Mergi la jucători",
  "home.recent": "Sesiuni recente",
  "home.seeAll": "Vezi toate",
  "home.noFinishedTitle": "Nicio sesiune încheiată",
  "home.noFinishedBody":
    "După ce închei o sesiune apare aici, cu clasamentul final și cine cât are de plătit.",

  "error.title": "Ceva s-a stricat",
  "error.body":
    "Ecranul nu a putut fi afișat. Sesiunile tale sunt salvate pe acest dispozitiv și nu au fost atinse, deci poți încerca din nou fără grijă.",
  "error.retry": "Încearcă din nou",
  "error.home": "Înapoi la început",

  "guide.open": "Ghid",
  "guide.close": "Închide",
  "guide.skip": "Sari peste",
  "guide.back": "Înapoi",
  "guide.next": "Continuă",
  "guide.finish": "Adaugă jucători",
  "guide.step": "{current} din {total}",

  "guide.welcomeTitle": "Bine ai venit la Padel Tracker",
  "guide.welcomeBody": "O aplicație de teren pentru padel între prieteni. Pe scurt, într-un minut.",
  "guide.welcomeRotations": "Stabilește cine cu cine face pereche, cât mai echilibrat.",
  "guide.welcomeScores": "Ține scorul cu o singură atingere pe rundă.",
  "guide.welcomeCosts": "Împarte nota după timpul jucat, sau egal — cum vrei.",

  "guide.playersTitle": "Începe cu jucătorii",
  "guide.playersBody":
    "Adaugă pe toți cei care joacă — o faci o singură dată și rămân pe telefonul tău. Salvează gașca obișnuită ca grup și pornești o sesiune din două atingeri.",
  "guide.playersNote": "Ai nevoie de cel puțin patru jucători ca să începi.",

  "guide.rotationTitle": "Două moduri de rotație",
  "guide.rotationBody": "Alegi unul când începi sesiunea. Ambele împart pauzele corect.",
  "guide.rotationAmericano": "Americano",
  "guide.rotationAmericanoBody": "Programul e stabilit de la început. Fiecare joacă cu fiecare.",
  "guide.rotationMexicano": "Mexicano",
  "guide.rotationMexicanoBody":
    "Perechile se refac în fiecare rundă după clasament, ca meciurile să fie strânse.",

  "guide.scoringTitle": "Apasă echipa care a câștigat",
  "guide.scoringBody":
    "Nu ții scor pe game-uri. Apeși echipa câștigătoare, salvezi runda, și fiecare jucător din acea echipă primește un punct.",
  "guide.scoringNote": "Ai apăsat greșit? Apeși cealaltă echipă și salvezi din nou.",

  "guide.costsTitle": "Împarte nota cinstit",
  "guide.costsBody":
    "Introdu cât costă terenul pe oră, apoi alege cum se împarte: după rotațiile jucate de fiecare, ca să plătească mai puțin cine vine mai târziu, sau egal între toți.",
  "guide.costsNote": "Mingile, un grip sau un rând de băuturi ajung pe nota cui le-a luat.",

  "guide.shareTitle": "Toți pot ține scorul",
  "guide.shareBody":
    "Partajează sesiunea cu un link sau cod QR. Cine îl deschide intră pe aceeași sesiune și poate introduce rezultate — pe toate telefoanele se actualizează deodată.",
  "guide.shareNote": "Fără conturi. Linkul e invitația.",

  "roster.title": "Jucători",
  "roster.subtitle": "Toți cei care joacă, plus grupurile din care pornești sesiunile.",
  "roster.players": "Jucători",
  "roster.addPlaceholder": "Adaugă un jucător",
  "roster.newPlayerLabel": "Numele jucătorului nou",
  "roster.noPlayersTitle": "Niciun jucător încă",
  "roster.noPlayersBody": "Adaugă pe toți cei care joacă regulat. O faci o singură dată.",
  "roster.rename": "Redenumește",
  "roster.renameLabel": "Redenumește {name}",
  "roster.removeLabel": "Elimină {name}",
  "roster.needMore": "Adaugă încă {players} ca să poți începe o sesiune.",
  "roster.readyToPlay": "{players} — destui pentru o sesiune.",
  "roster.clearAll": "Elimină toți",
  "roster.confirmClearAllTitle": "Elimini toți jucătorii?",
  "roster.confirmClearAll":
    "Elimini {players} din listă și din grupurile salvate?\n\nCine a jucat deja o sesiune rămâne arhivat, ca rezultatele vechi să-i păstreze numele.",
  "roster.archivedSection": "Arhivați",
  "roster.archivedHint":
    "Eliminați din listă, dar păstrați ca sesiunile vechi să le arate numele. Nu apar când începi o sesiune nouă.",
  "roster.groups": "Grupuri",
  "roster.newGroup": "+ Grup nou",
  "roster.editGroup": "Editează grupul",
  "roster.noGroupsTitle": "Niciun grup salvat",
  "roster.noGroupsBody":
    "Salvează gașca cu care joci de obicei, ca să începi o sesiune din două atingeri, nu din opt.",
  "roster.groupNamePlaceholder": "Numele grupului, ex. Gașca de marți",
  "roster.groupNameLabel": "Numele grupului",
  "roster.groupEmpty": "Niciun jucător încă",
  "roster.confirmRemovePlayer":
    "Elimini pe {name} din listă și din grupurile salvate?\n\nDacă a jucat deja o sesiune, rămâne arhivat, ca rezultatele vechi să-i păstreze numele.",
  "roster.confirmDeleteGroup": "Ștergi grupul „{name}”? Jucătorii rămân.",
  "roster.confirmDeleteGroupActive":
    "Ștergi grupul „{name}”?\n\nExistă o sesiune în desfășurare din acest grup. Ea continuă și nu se pierde nimic — dar rezultatele nu vor mai intra în clasamentul general al acestui grup, doar în cel pe toți. Jucătorii rămân.",

  "setup.title": "Sesiune nouă",
  "setup.subtitle": "O configurezi o dată; după asta doar apeși echipa câștigătoare.",
  "setup.whosPlaying": "Cine joacă",
  "setup.pickPlayers": "Alege cine a venit.",
  "setup.goodToGo": "{players} pe {courts} — se poate începe.",
  "setup.configOption": "{players} pe {courts}",
  "setup.sevenPlayers": "Șapte e numărul incomod — jucați 6 sau 8, ori mai găsiți pe cineva.",
  "setup.unsupported":
    "Nu există o rotație corectă pentru {players}. Se poate juca: {options}.",
  "setup.pairs": "Perechile de start",
  "setup.pairsHint":
    "Atinge doi jucători ca să-i faci pereche. De la aceste perechi pornește prima rundă; după aceea toată lumea se rotește.",
  "setup.format": "Format",
  "setup.mode": "Mod de rotație",
  "setup.americano": "Americano",
  "setup.americanoSub": "Program fix",
  "setup.mexicano": "Mexicano",
  "setup.mexicanoSub": "Perechi după clasament",
  "setup.americanoHint": "Tot programul e stabilit de la început. Fiecare joacă cu fiecare.",
  "setup.mexicanoHint": "Perechile se refac în fiecare rundă după clasament, ca meciurile să fie strânse.",
  "setup.courts": "Terenuri",
  "setup.oneCourt": "1 teren",
  "setup.twoCourts": "2 terenuri",
  "setup.date": "Data",
  "setup.cost": "Cost",
  "setup.pricePerHour": "Preț pe oră",
  "setup.courtNPricePerHour": "Preț/oră teren {number}",
  "setup.hours": "Ore",
  "setup.currency": "Monedă",
  "setup.courtSplit": "Împărțirea costului terenului",
  "setup.splitByTime": "După timpul jucat",
  "setup.splitEven": "În mod egal",
  "setup.splitByTimeHint":
    "Fiecare plătește rotațiile pe care le-a jucat, deci dacă vii mai târziu sau pleci mai devreme plătești mai puțin.",
  "setup.splitEvenHint": "Costul terenului se împarte egal, indiferent cât a jucat fiecare.",
  "setup.whoPaid": "Cine a plătit terenul?",
  "setup.paidHint": "Opțional — se folosește ca să știm cine cui îi datorează.",
  "setup.start": "Începe sesiunea",
  "setup.starting": "Se pornește…",
  "setup.notEnoughTitle": "Prea puțini jucători",
  "setup.notEnoughBody": "Ai nevoie de cel puțin patru jucători în listă ca să începi o sesiune.",

  "session.play": "Joacă",
  "session.standings": "Clasament",
  "session.costs": "Costuri",
  "session.share": "Partajează",

  "share.title": "Jucați împreună, live",
  "share.body": "Oricine deschide linkul intră pe aceeași sesiune și poate introduce scoruri — actualizările apar instant pe toate device-urile.",
  "share.scan": "Scanează ca să intri",
  "share.copy": "Copiază linkul",
  "share.copied": "Copiat!",
  "share.shareVia": "Trimite…",
  "share.close": "Închide",
  "session.finished": "Încheiată",
  "session.notFoundTitle": "Sesiunea nu a fost găsită",
  "session.notFoundBody": "Poate a fost ștearsă sau e salvată în alt browser.",
  "session.backToStart": "Înapoi la început",

  "play.round": "Runda {number}",
  "play.extra": "+ Extra",
  "play.courtSwap": "Doi jucători schimbă terenul",
  "play.courtSwapHint": "Bloc nou — terenurile au fost amestecate.",
  "play.sittingOut": "Pe bară",
  "play.benchList": "Pe bară: {names}",
  "play.tapWinner": "Apasă echipa câștigătoare",
  "play.saveRound": "Salvează runda",
  "play.updateRound": "Modifică rezultatul",
  "play.played": "Jucate",
  "play.comingUp": "Urmează",
  "play.editingRound": "Modifici runda {number}",
  "play.court": "Terenul {number}",
  "play.won": "a câștigat",
  "play.sessionControl": "Sesiune",
  "play.finishSession": "Încheie sesiunea",
  "play.finishHint": "Fixează clasamentul și împărțirea costurilor. O poți redeschide dacă mai jucați.",
  "play.reopenSession": "Redeschide sesiunea",
  "play.reopenHint": "Adaugă o rundă nouă ca să continuați jocul.",
  "play.finishedTitle": "Sesiune încheiată",
  "play.finishedBody":
    "{rounds}. Clasamentul și costurile sunt stabilite — corectează mai jos un rezultat, dacă a intrat greșit.",
  "play.winnerLabel": "{team} a câștigat",

  "standings.after": "După {rounds}",
  "standings.points": "puncte",
  "standings.noScoresTitle": "Niciun rezultat încă",
  "standings.noScoresBody": "Jucați o rundă și apăsați câștigătorul — clasamentul se completează singur.",
  "standings.fixPrompt": "Rezultat greșit? Corectează-l",
  "standings.fixTitle": "Corectează un rezultat",
  "standings.fixHint":
    "Alege echipa care a câștigat de fapt și salvează. Clasamentul de deasupra se ia după el, la fel și împărțirea costurilor.",
  "standings.allTimeTitle": "Clasament general",
  "standings.allTimeSubtitle": "Toate jocurile câștigate, adunate.",
  "standings.everyone": "Toți",
  "standings.noSessionsTitle": "Nicio sesiune încă",
  "standings.noSessionsBody":
    "După ce jucați și notați o sesiune, clasamentul general se construiește singur.",
  "standings.nothingForGroupTitle": "Nimic pentru acest grup încă",
  "standings.nothingForGroupBody": "Începe o sesiune din acest grup și rezultatele se adună aici.",
  "standings.rankedBy": "Ordonat după jocuri câștigate, apoi după cele mai puține înfrângeri.",

  "costs.theBill": "Nota de plată",
  "costs.court": "Teren",
  "costs.courtN": "Terenul {number}",
  "costs.rateTimesHours": "{rate}/oră × {hours}",
  "costs.extras": "Extra",
  "costs.total": "Total",
  "costs.frontedBy": "A plătit",
  "costs.perPlayer": "Pe jucător",
  "costs.courtPlusExtras": "teren + extra",
  "costs.courtLine": "Teren · {rotations}",
  "costs.courtEvenLine": "Teren · împărțit egal",
  "costs.noCostTitle": "Niciun cost introdus",
  "costs.noCostBody": "Adaugă cât a costat terenul, iar partea fiecăruia se calculează de acolo.",
  "costs.addCourtCost": "Adaugă costul terenului",
  "costs.noExtrasTitle": "Niciun extra încă",
  "costs.noExtrasBody":
    "Mingi, un grip, o paletă împrumutată, băuturi de la frigider — adaugă-le pe măsură ce apar și ajung pe nota cui trebuie.",
  "costs.settleUp": "Deconturi",
  "costs.nothingToSettleTitle": "Nimic de decontat",
  "costs.settledBody": "Toată lumea e chit.",
  "costs.saySomeoneFronted": "Spune cine a plătit terenul și calculăm cine cât îi datorează.",
  "costs.owes": "îi datorează lui",
  "costs.whoFronted": "Cine a plătit terenul?",

  "extra.title": "Adaugă un extra",
  "extra.what": "Ce a fost?",
  "extra.whatPlaceholder": "Mingi, grip, băuturi…",
  "extra.cost": "Cost",
  "extra.billedTo": "Pe nota cui",
  "extra.billedHint": "Se împarte egal între cei aleși — nu între toată sesiunea.",
  "extra.adding": "Se adaugă…",
  "extra.removeLabel": "Elimină {name}",

  "history.title": "Istoric",
  "history.noSessionsTitle": "Nicio sesiune încă",
  "history.noSessionsBody": "Fiecare sesiune jucată rămâne aici, cu clasament și împărțirea costurilor.",
  "history.startSession": "Începe o sesiune",
  "history.live": "live",
  "history.confirmDelete": "Ștergi sesiunea din {date}? Nu se poate reveni.",
  "history.deleteLabel": "Șterge sesiunea din {date}",
};

export const messages: Record<Locale, Record<MessageKey, string>> = { en, ro };

/**
 * Counted nouns. Romanian needs three forms — "1 jucător", "5 jucători", "20 de jucători" — and the
 * boundary isn't a simple singular/plural split, so the forms are keyed by CLDR plural category and
 * `Intl.PluralRules` decides which one applies.
 */
export interface PluralForms {
  one: string;
  few?: string;
  other: string;
}

const enPlurals = {
  player: { one: "1 player", other: "{count} players" },
  court: { one: "1 court", other: "{count} courts" },
  round: { one: "1 round", other: "{count} rounds" },
  hour: { one: "1 hour", other: "{count} hours" },
  rotation: { one: "1 rotation", other: "{count} rotations" },
  session: { one: "1 session", other: "{count} sessions" },
  /**
   * Phrases where a word *outside* the noun also has to agree with the count carry the whole phrase
   * here rather than being assembled from a pluralised noun plus a fixed word. Romanian inflects the
   * participle — "1 rundă jucată" but "3 runde jucate" — so gluing a constant "jucate" onto a
   * correctly pluralised "1 rundă" still produces broken grammar.
   */
  roundsPlayed: { one: "1 round played", other: "{count} rounds played" },
  sitOut: { one: "1 sat out", other: "{count} sat out" },
  // The standings chips show a bare number next to a tick or cross; these are what a screen reader
  // and the tooltip get instead. Counted, so they belong here rather than being a bare noun a
  // component sticks a number in front of — that's how "1 losses" happened.
  win: { one: "1 win", other: "{count} wins" },
  loss: { one: "1 loss", other: "{count} losses" },
} as const;

export type PluralKey = keyof typeof enPlurals;

const roPlurals: Record<PluralKey, PluralForms> = {
  player: { one: "1 jucător", few: "{count} jucători", other: "{count} de jucători" },
  court: { one: "1 teren", few: "{count} terenuri", other: "{count} de terenuri" },
  round: { one: "1 rundă", few: "{count} runde", other: "{count} de runde" },
  hour: { one: "1 oră", few: "{count} ore", other: "{count} de ore" },
  rotation: { one: "1 rotație", few: "{count} rotații", other: "{count} de rotații" },
  session: { one: "1 sesiune", few: "{count} sesiuni", other: "{count} de sesiuni" },
  // "rundă" is feminine, so the participle follows it: jucată / jucate.
  roundsPlayed: { one: "1 rundă jucată", few: "{count} runde jucate", other: "{count} de runde jucate" },
  sitOut: { one: "1 pauză", few: "{count} pauze", other: "{count} de pauze" },
  win: { one: "1 victorie", few: "{count} victorii", other: "{count} de victorii" },
  loss: { one: "1 înfrângere", few: "{count} înfrângeri", other: "{count} de înfrângeri" },
};

export const plurals: Record<Locale, Record<PluralKey, PluralForms>> = { en: enPlurals, ro: roPlurals };
