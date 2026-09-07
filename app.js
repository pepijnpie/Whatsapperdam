let naamMappings = {};
let globalChatData = { berichten: [], personen: [], datums: [] };
const SPELVERLOOP_URL = 'https://itsjepoan.github.io/Online-Weerwolven-van-Whatsapperdam/spelverloop.html';

// --- TAB ROUTING ---
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'courant') {
        const viewer = document.getElementById('courantViewer');
        adjustIframeHeight(viewer);
    }
}

// --- COURANT LADER & EXACTE HOOGTE METING ---
async function initCourantDirectory() {
    const select = document.getElementById('courantSelect');
    select.innerHTML = '<option>Scannen naar couranten...</option>';

    const gevondenCouranten = [];
    const maxSpellen = 25;
    const maxEdities = 10;
    const scanBeloftes = [];

    for (let spel = 1; spel <= maxSpellen; spel++) {
        for (let editie = 1; editie <= maxEdities; editie++) {
            const fileName = `Courant_${spel}.${editie}.html`;
            const filePath = `couranten/${fileName}`;

            const check = fetch(filePath)
                .then(response => {
                    if (response.ok) {
                        gevondenCouranten.push({ spel, editie, file: fileName });
                    }
                })
                .catch(() => {});

            scanBeloftes.push(check);
        }
    }

    await Promise.all(scanBeloftes);
    select.innerHTML = '';

    if (gevondenCouranten.length === 0) {
        select.innerHTML = '<option>Geen couranten gevonden in /couranten/</option>';
        return;
    }

    gevondenCouranten.sort((a, b) => (b.spel - a.spel) || (b.editie - a.editie));

    gevondenCouranten.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.file;
        opt.innerText = `Spel ${item.spel} - Editie ${item.editie} (${item.file})`;
        select.appendChild(opt);
    });

    laadCourant(gevondenCouranten[0].file);
}

function laadCourant(fileName) {
    if (fileName) {
        const viewer = document.getElementById('courantViewer');
        viewer.src = `couranten/${fileName}`;
    }
}

function adjustIframeHeight(iframe) {
    try {
        if (iframe.contentWindow && iframe.contentWindow.document.body) {
            const doc = iframe.contentWindow.document;
            const height = Math.max(
                doc.body.scrollHeight,
                doc.documentElement.scrollHeight,
                doc.body.offsetHeight,
                doc.documentElement.offsetHeight
            );
            iframe.style.height = (height + 20) + 'px';
        }
    } catch (e) {
        iframe.style.height = '1500px';
    }
}

// --- LIVE SPELERLIJST INLADEN VANAF GITHUB PAGES ---
async function laadLiveSpelerLijst() {
    const tbody = document.getElementById('spelerLijstTabel');
    try {
        const response = await fetch(SPELVERLOOP_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error("Netwerkfout bij ophalen spelerlijst");
        
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const rows = doc.querySelectorAll('.current-player-row');
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">Geen spelers gevonden op de externe pagina.</td></tr>';
            return;
        }

        let html = '';
        rows.forEach(row => {
            const naam = row.querySelector('.current-player-name')?.innerText.trim() || 'Onbekend';
            const status = row.querySelector('.current-player-status')?.innerText.trim() || 'Levend';
            const isDood = status.toLowerCase() === 'dood';

            html += `
                <tr>
                    <td><b>${naam}</b></td>
                    <td class="${isDood ? 'status-dood' : 'status-levend'}">${status.toUpperCase()}</td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" style="color: red;">Fout bij inladen: ${err.message}</td></tr>`;
    }
}

// --- CHAT & DATA ANALYSER ---
async function initChat() {
    try {
        const [chatRes, mappingRes] = await Promise.all([
            fetch('_chat.txt'),
            fetch('naam_mappings.json').catch(() => null)
        ]);

        if (mappingRes && mappingRes.ok) naamMappings = await mappingRes.json();

        laadLiveSpelerLijst();

        if (!chatRes.ok) throw new Error("_chat.txt niet gevonden");
        const chatText = await chatRes.text();
        verwerkChatInBrowser(chatText);
        document.getElementById('chatStatus').innerText = "Actief: _chat.txt";
    } catch (err) {
        document.getElementById('chatStatus').innerText = err.message;
        document.getElementById('chatStatus').style.color = "red";
        laadLiveSpelerLijst();
    }
}

function verwerkChatInBrowser(rawText) {
    const regels = rawText.split('\n');
    const berichtPatroon = /^\[(\d{2}-\d{2}-\d{4}),\s(\d{2}:\d{2}:\d{2})\]\s([^:]+):\s/;

    let berichten = [], personenSet = new Set(), datumsSet = new Set(), huidigBericht = null;
    const negeer = ["toegevoegd", "gewijzigd", "gemaakt", "versleuteld", "beheerder"];

    regels.forEach(regel => {
        const schoon = regel.replace(/[\u200e\ufeff]/g, '');
        const match = schoon.match(berichtPatroon);

        if (match) {
            if (huidigBericht) {
                huidigBericht.tekst = opruimenTekst(huidigBericht.tekst);
                berichten.push(huidigBericht);
            }
            const datum = match[1], tijd = match[2];
            const ruweNaam = match[3].replace('~', '').trim();
            const persoon = naamMappings[ruweNaam] || ruweNaam;

            if (negeer.some(s => schoon.includes(s))) { huidigBericht = null; return; }
            const tekst = schoon.substring(match[0].length).trim();

            personenSet.add(persoon); datumsSet.add(datum);
            huidigBericht = { datum, tijd, persoon, tekst };
        } else if (huidigBericht) {
            huidigBericht.tekst += "\n" + schoon.trim();
        }
    });
    
    if (huidigBericht) {
        huidigBericht.tekst = opruimenTekst(huidigBericht.tekst);
        berichten.push(huidigBericht);
    }

    const personen = Array.from(personenSet).sort();
    berichten.forEach(b => {
        const t = b.tekst.toLowerCase();
        b.is_stem = t.includes("ik stem") || t.includes("stem op") || personen.some(p => new RegExp('\\bstem ' + p.toLowerCase() + '\\b').test(t));
    });

    globalChatData = { berichten, personen, datums: Array.from(datumsSet) };
    
    const datumSelect = document.getElementById('datumSelect');
    datumSelect.innerHTML = '<option value="alle">Alle Dagen</option>';
    globalChatData.datums.forEach(d => datumSelect.innerHTML += `<option value="${d}">${d}</option>`);

    const personenContainer = document.getElementById('personenLijst');
    document.getElementById('ledenAantal').innerText = globalChatData.personen.length;
    personenContainer.innerHTML = globalChatData.personen.map(p => `
        <label style="display:block; margin-bottom: 5px; font-family: sans-serif; font-size: 0.85rem;">
            <input type="checkbox" value="${p}" checked onchange="renderChatData()" class="persoon-check"> ${p}
        </label>
    `).join('');

    renderChatData();
}

function opruimenTekst(tekst) {
    return tekst.replace(/\n\s*\n+/g, '\n').trim();
}

function renderChatData() {
    const modus = document.getElementById('modusSelect').value;
    const zoekterm = document.getElementById('zoekBalk').value.toLowerCase();
    const gekozenDatum = document.getElementById('datumSelect').value;
    const tijdVan = document.getElementById('tijdVan').value || "00:00";
    const tijdTot = document.getElementById('tijdTot').value || "23:59";

    const gecheckt = Array.from(document.querySelectorAll('.persoon-check:checked')).map(c => c.value);

    const gefilterd = globalChatData.berichten.filter(b => {
        const persoonMatch = gecheckt.includes(b.persoon);
        const datumMatch = (gekozenDatum === 'alle' || b.datum === gekozenDatum);
        const zoekMatch = (!zoekterm || b.tekst.toLowerCase().includes(zoekterm));
        
        const berichtTijd = b.tijd.substring(0, 5);
        const tijdMatch = (berichtTijd >= tijdVan && berichtTijd <= tijdTot);

        return persoonMatch && datumMatch && zoekMatch && tijdMatch;
    });

    const aantallen = {};
    gefilterd.forEach(b => aantallen[b.persoon] = (aantallen[b.persoon] || 0) + 1);
    document.getElementById('aantalBerichtenLijst').innerHTML = Object.entries(aantallen)
        .sort((a,b) => b[1] - a[1])
        .map(([p, count]) => `<div style="font-family: sans-serif; font-size: 0.85rem; margin-bottom: 4px;">• ${p}: <b>${count}</b></div>`).join('') || '(Geen data)';

    const resContainer = document.getElementById('resultatenLijst');
    const teTonen = modus === 'stemmen' ? gefilterd.filter(b => b.is_stem) : gefilterd;
    
    resContainer.innerHTML = teTonen.map(b => `
        <div class="msg-item">
            <small>[${b.datum} ${b.tijd.substring(0,5)}]</small> <b>${b.persoon}</b> ${b.is_stem ? '<span class="stem-tag">[STEM]</span>' : ''}:<br>${escapeHtml(b.tekst)}
        </div>
    `).join('') || '(Geen resultaten)';
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

initCourantDirectory();
initChat();
