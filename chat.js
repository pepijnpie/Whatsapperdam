let naamMappings = {};
let globalChatData = { berichten: [], personen: [], datums: [] };

async function initChat() {
    try {
        const mappingRes = await fetch('naam_mappings.json').catch(() => null);
        if (mappingRes && mappingRes.ok) naamMappings = await mappingRes.json();

        // Check of de gebruiker eerder al een eigen bestand lokaal heeft geüpload
        const lokaalOpgeslagenChat = localStorage.getItem('custom_chat_data');

        if (lokaalOpgeslagenChat) {
            verwerkChatInBrowser(lokaalOpgeslagenChat);
            document.getElementById('chatStatus').innerText = "Actief: Lokaal geladen bestand";
            document.getElementById('chatStatus').style.color = "var(--status-levend)";
            return;
        }

        // Anders standaard _chat.txt van de server ophalen
        const chatRes = await fetch('_chat.txt');
        if (!chatRes.ok) throw new Error("_chat.txt niet gevonden op server");
        
        const chatText = await chatRes.text();
        verwerkChatInBrowser(chatText);
        document.getElementById('chatStatus').innerText = "Actief: Standaard _chat.txt";
    } catch (err) {
        document.getElementById('chatStatus').innerText = err.message;
        document.getElementById('chatStatus').style.color = "red";
    }
}

// Handler voor het lokaal uploaden via de browser
function handleLocalFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const chatContent = e.target.result;
        
        // Sla lokaal op in de browser van deze client (blijft bewaard na vernieuwen)
        localStorage.setItem('custom_chat_data', chatContent);
        
        // Verwerk direct op het scherm
        verwerkChatInBrowser(chatContent);
        
        document.getElementById('chatStatus').innerText = `Actief: ${file.name} (Lokaal)`;
        document.getElementById('chatStatus').style.color = "var(--status-levend)";
    };

    reader.readAsText(file);
}

// Optioneel: Functie om terug te keren naar de standaard server-chat
function resetNaarStandaardChat() {
    localStorage.removeItem('custom_chat_data');
    location.reload();
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
    const tijdVan = document.getElementById('tijdVan')?.value || "00:00";
    const tijdTot = document.getElementById('tijdTot')?.value || "23:59";

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

document.addEventListener('DOMContentLoaded', initChat);
