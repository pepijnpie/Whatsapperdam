const RAW_URL = 'https://itsjepoan.github.io/Online-Weerwolven-van-Whatsapperdam/spelverloop.html';

// Meerdere proxies als fallback voor het geval er één blokkeert
const PROXIES = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RAW_URL)}`,
    `https://thingproxy.freeboard.io/fetch/${RAW_URL}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(RAW_URL)}`
];

async function fetchHtmlWithFallback() {
    for (const url of PROXIES) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                if (text && text.includes('current-player-row')) {
                    return text;
                }
            }
        } catch (e) {
            console.warn(`Proxy mislukt: ${url}`, e);
        }
    }
    throw new Error("Mislukt om data op te halen via beschikbare verbindingen.");
}

async function laadLiveSpelerLijst() {
    const tbody = document.getElementById('spelerLijstTabel');
    try {
        const htmlText = await fetchHtmlWithFallback();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const rows = doc.querySelectorAll('.current-player-row');
        
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">Geen spelers gevonden op de pagina.</td></tr>';
            return;
        }

        let html = '';
        rows.forEach(row => {
            const naam = row.querySelector('.current-player-name')?.textContent.trim() || 'Onbekend';
            const statusTekst = row.querySelector('.current-player-status')?.textContent.trim() || 'Levend';
            
            const isDood = statusTekst.toLowerCase().includes('dood') || row.classList.contains('dead');

            html += `
                <tr>
                    <td><b>${naam}</b></td>
                    <td class="${isDood ? 'status-dood' : 'status-levend'}">${statusTekst.toUpperCase()}</td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" style="color: red;">Fout bij inladen: ${err.message}</td></tr>`;
    }
}

document.addEventListener('DOMContentLoaded', laadLiveSpelerLijst);
