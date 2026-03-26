const pb = new PocketBase('http://104.248.195.240:8090');
const COLLECTION = 'benchmarks';

async function updateDashboard() {
    const statusEl = document.getElementById('status');
    const tableBody = document.getElementById('results-body');

    try {
        // Fetch 50 most recent records
        const records = await pb.collection(COLLECTION).getList(1, 50, {
            sort: '-mean_score',
        });

        let rowsHtml = '';
        records.items.forEach(run => {
            const fmt = (val) => {
                const num = Number(val);
                return !isNaN(num) && val !== null && val !== "" ? num.toFixed(4) : "0.0000";
            };

            const timestamp = new Date(run.created).toLocaleString(undefined, {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });

            rowsHtml += `
                <tr>
                    <td>${timestamp}</td>
                    <td>${run.user || "Unknown"}</td>
                    <td>${run.model || "Unknown"}</td>
                    <td><strong>${fmt(run.mean_score)}</strong></td>
                    <td>${fmt(run.ceviche)}</td>
                    <td>${fmt(run.mixseq)}</td>
                    <td>${fmt(run.sciplex)}</td>
                    <td>${fmt(run.tpw_hi)}</td>
                    <td>${fmt(run.freiburg)}</td>
                </tr>`;
        });

        tableBody.innerHTML = rowsHtml;
        statusEl.innerText = "Live";
        statusEl.classList.remove('error');
    } catch (err) {
        statusEl.innerText = "Offline";
        statusEl.classList.add('error');
    }
}

// 1. Initial Load
updateDashboard();

// 2. Realtime Subscription (Zero Polling)
pb.collection(COLLECTION).subscribe('*', () => {
    console.log('Realtime event received!');
    updateDashboard();
});

async function drawPlots() {
    const list = await pb.collection('dataset_distributions').getFullList();
    const el = document.getElementById('plots');
    el.innerHTML = list.map(r => `<div id="p-${r.id}"></div>`).join('');
    list.forEach(r => Plotly.newPlot(`p-${r.id}`, r.plotly_json.data, r.plotly_json.layout));
}
drawPlots();
pb.collection('dataset_distributions').subscribe('*', drawPlots);
