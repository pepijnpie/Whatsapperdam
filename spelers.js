const DATA_URL = 'https://cdn.jsdelivr.net/gh/ItsJepoan/Online-Weerwolven-van-Whatsapperdam@main/js/data/current-game-data.js';

async function laadLiveSpelerLijst() {
    const tbody = document.getElementById('spelerLijstTabel');
    try {
        const response = await fetch(DATA_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Netwerkfout status ${response.status}`);

        const jsText = await response.text();

        // Extraheer het currentGamePlayers JSON-gedeelte uit het JS bestand
        const match = jsText.match(/const\s+currentGamePlayers\s*=\s*(\[\s*[\s\S]*?\n\]);/);
        
        if (!match || !match[1]) {
            throw new Error("Kon 'currentGamePlayers' niet parseren uit het databestand.");
        }

        const players = JSON.parse(match[1]);

        if (!Array.isArray(players) || players.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="color: var(--text-muted);">Geen spelers gevonden in de data.</td></tr>';
            return;
        }

        // Sorteer optioneel op cirkelvolgorde of alfabetisch
        players.sort((a, b) => a.circleOrder - b.circleOrder);

        let html = '';
        players.forEach(player => {
            const isDood = player.alive === false;
            const statusTekst = isDood ? 'DOOD' : 'LEVEND';

            html += `
                <tr>
                    <td><b>${escapeHtml(player.name)}</b>${player.specialStatus ? ` <small>(${escapeHtml(player.specialStatus)})</small>` : ''}</td>
                    <td class="${isDood ? 'status-dood' : 'status-levend'}">${statusTekst}</td>
                </tr>`;
        });

        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" style="color: red;">Fout bij inladen: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener('DOMContentLoaded', laadLiveSpelerLijst);
