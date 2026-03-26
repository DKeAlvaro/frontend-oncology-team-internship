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

        // Heatmap ranges
        const columns = ['mean_score', 'ceviche', 'mixseq', 'sciplex', 'tpw_hi', 'freiburg'];
        const ranges = {};
        columns.forEach(col => {
            const vals = records.items.map(r => Number(r[col])).filter(v => !isNaN(v));
            ranges[col] = vals.length > 0
                ? { min: Math.min(...vals), max: Math.max(...vals) }
                : { min: 0, max: 0 };
        });

        const getStyle = (val, col) => {
            const range = ranges[col];
            const num = Number(val);
            if (isNaN(num) || !range || range.max === range.min) return "";
            const ratio = (num - range.min) / (range.max - range.min);
            const hue = ratio * 120; // 0=red, 120=green
            return `style="background-color: hsla(${hue}, 70%, 50%, 0.15)"`;
        };

        let rowsHtml = '';
        records.items.forEach(run => {
            const fmt = (val, col) => {
                const num = Number(val);
                const isMax = col && ranges[col] && num === ranges[col].max && ranges[col].max !== ranges[col].min;
                const formatted = !isNaN(num) && val !== null && val !== "" ? num.toFixed(3) : "0.000";
                return isMax ? `<strong>${formatted}</strong>` : formatted;
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
                    <td ${getStyle(run.mean_score, 'mean_score')}>${fmt(run.mean_score, 'mean_score')}</td>
                    <td ${getStyle(run.ceviche, 'ceviche')}>${fmt(run.ceviche, 'ceviche')}</td>
                    <td ${getStyle(run.mixseq, 'mixseq')}>${fmt(run.mixseq, 'mixseq')}</td>
                    <td ${getStyle(run.sciplex, 'sciplex')}>${fmt(run.sciplex, 'sciplex')}</td>
                    <td ${getStyle(run.tpw_hi, 'tpw_hi')}>${fmt(run.tpw_hi, 'tpw_hi')}</td>
                    <td ${getStyle(run.freiburg, 'freiburg')}>${fmt(run.freiburg, 'freiburg')}</td>
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
    list.forEach(r => Plotly.newPlot(`p-${r.id}`, r.plotly_json.data, r.plotly_json.layout, { responsive: true }));
}
drawPlots();
pb.collection('dataset_distributions').subscribe('*', drawPlots);
