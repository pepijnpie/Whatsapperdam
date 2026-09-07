const SPELVERLOOP_URL = 'https://itsjepoan.github.io/Online-Weerwolven-van-Whatsapperdam/spelverloop.html';

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

document.addEventListener('DOMContentLoaded', laadLiveSpelerLijst);
