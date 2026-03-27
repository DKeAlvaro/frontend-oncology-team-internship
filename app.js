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
    // 1. Dataset Distributions
    const distributionList = await pb.collection('dataset_distributions').getFullList();
    const distEl = document.getElementById('plots');
    
    // 2. Evaluation Scatter Plots (Predicted vs Real)
    const evalList = await pb.collection('evaluation_plots').getFullList();
    const evalEl = document.getElementById('eval-plots');
    if (!evalEl) {
         const newSection = document.createElement('div');
         newSection.id = 'eval-plots';
         newSection.style.display = 'grid';
         newSection.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))';
         newSection.style.gap = '30px';
         newSection.style.marginTop = '40px';
         distEl.parentElement.appendChild(newSection);
    }
    const targetEvalEl = document.getElementById('eval-plots');

    // 3. Input Projections (PCA)
    const inputList = await pb.collection('input_projections').getFullList();
    const inputEl = document.getElementById('input-plots');
    if (!inputEl) {
         const inputSection = document.createElement('div');
         inputSection.id = 'input-plots';
         inputSection.style.marginTop = '40px';
         distEl.parentElement.insertBefore(inputSection, distEl); // Put it before distributions
    }
    const targetInputEl = document.getElementById('input-plots');

    // Render Distributions
    distEl.innerHTML = distributionList.map(r => `<div id="p-${r.id}" class="plot-card"></div>`).join('');
    distributionList.forEach(r => Plotly.newPlot(`p-${r.id}`, r.plotly_json.data, r.plotly_json.layout, { responsive: true }));

    // Render Evaluations
    targetEvalEl.innerHTML = '<h2 style="grid-column: 1 / -1; font-size:1rem; font-weight:600; margin-top:60px; margin-bottom:1.5rem; letter-spacing:-0.01em;">Model Evaluation (Predicted vs Real)</h2>' + evalList.map(r => `<div id="e-${r.id}" class="plot-card"></div>`).join('');
    evalList.forEach(r => Plotly.newPlot(`e-${r.id}`, r.plotly_json.data, r.plotly_json.layout, { responsive: true }));

    // Render Input Projections
    targetInputEl.innerHTML = '<h2 style="font-size:1rem; font-weight:600; margin-bottom:1.5rem; letter-spacing:-0.01em;">Input Space Visualization (PCA)</h2>' + inputList.map(r => `<div id="i-${r.id}" class="plot-card"></div>`).join('');
    inputList.forEach(r => Plotly.newPlot(`i-${r.id}`, r.plotly_json.data, r.plotly_json.layout, { responsive: true }));
}
drawPlots();
pb.collection('dataset_distributions').subscribe('*', drawPlots);
pb.collection('evaluation_plots').subscribe('*', drawPlots);
pb.collection('input_projections').subscribe('*', drawPlots);
