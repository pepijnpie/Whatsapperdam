const TARGET_URL = 'https://itsjepoan.github.io/Online-Weerwolven-van-Whatsapperdam/spelverloop.html';

// Gebruik corsproxy.io (sneller en stuurt altijd de juiste Access-Control-Allow-Origin header mee)
const PROXY_URL = `https://corsproxy.io/?${encodeURIComponent(TARGET_URL)}`;

async function laadLiveSpelerLijst() {
    const tbody = document.getElementById('spelerLijstTabel');
    try {
        const response = await fetch(PROXY_URL);
        if (!response.ok) throw new Error("Netwerkfout bij ophalen spelerlijst");
        
        // Corsproxy.io geeft direct de rauwe HTML terug in plaats van JSON!
        const htmlText = await response.text(); 
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
