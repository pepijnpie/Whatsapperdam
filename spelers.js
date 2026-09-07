const TARGET_URL = 'https://itsjepoan.github.io/Online-Weerwolven-van-Whatsapperdam/spelverloop.html';
// Gebruik een gratis CORS proxy om het verzoek door te sturen
const PROXY_URL = `https://api.allorigins.win/get?url=${encodeURIComponent(TARGET_URL)}`;

async function laadLiveSpelerLijst() {
    const tbody = document.getElementById('spelerLijstTabel');
    try {
        const response = await fetch(PROXY_URL);
        if (!response.ok) throw new Error("Proxy netwerkfout bij ophalen spelerlijst");
        
        const data = await response.json();
        const htmlText = data.contents; // De HTML-inhoud zit in de 'contents' key van AllOrigins
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        // Zoek naar de spelers (controleer of deze selectors exact overeenkomen met de doelsite)
        const rows = doc.querySelectorAll('.current-player-row');
        
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">Geen spelers gevonden op de externe pagina. Controleer HTML-elementen.</td></tr>';
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

document.addEventListener('DOMContentLoaded', laadLiveSpelerLijst);
