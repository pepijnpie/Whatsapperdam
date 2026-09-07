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

document.addEventListener('DOMContentLoaded', initCourantDirectory);
