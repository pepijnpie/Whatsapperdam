const TARGET_URL = 'https://itsjepoan.github.io/Online-Weerwolven-van-Whatsapperdam/spelverloop.html';
const PROXY_URL = `https://api.allorigins.win/get?url=${encodeURIComponent(TARGET_URL)}`;

async function laadLiveSpelerLijst() {
    const tbody = document.getElementById('spelerLijstTabel');
    try {
        const response = await fetch(PROXY_URL);
        if (!response.ok) throw new Error("Netwerkfout bij ophalen spelerlijst");
        
        const data = await response.json();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        
        // Haal alle speler-rijen op (.current-player-row)
        const rows = doc.querySelectorAll('.current-player-row');
        
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">Geen spelers gevonden op de pagina.</td></tr>';
            return;
        }

        let html = '';
        rows.forEach(row => {
            // Haal de tekst uit class="current-player-name" en class="current-player-status"
            const naam = row.querySelector('.current-player-name')?.textContent.trim() || 'Onbekend';
            const statusTekst = row.querySelector('.current-player-status')?.textContent.trim() || 'Levend';
            
            // Check of iemand dood is
            const isDood = statusTekst.toLowerCase() === 'dood' || row.classList.contains('dead');

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
