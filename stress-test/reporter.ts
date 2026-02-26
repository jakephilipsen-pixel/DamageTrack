import { writeFileSync } from 'fs';
import { CONFIG } from './config';
import { ActionMetric, TestReport } from './types';

export class Reporter {
  private metrics: ActionMetric[] = [];
  private startTime: number = 0;
  private activeAgents = new Set<string>();
  private liveInterval: ReturnType<typeof setInterval> | null = null;

  // Per-agent counters
  private agentCounters: Record<string, {
    damageReportsCreated: number;
    photosUploaded: number;
    statusTransitions: number;
    commentsAdded: number;
  }> = {};

  start() {
    this.startTime = Date.now();
  }

  registerAgent(name: string) {
    this.activeAgents.add(name);
    this.agentCounters[name] = {
      damageReportsCreated: 0,
      photosUploaded: 0,
      statusTransitions: 0,
      commentsAdded: 0,
    };
  }

  deregisterAgent(name: string) {
    this.activeAgents.delete(name);
  }

  record(metric: ActionMetric) {
    this.metrics.push(metric);

    // Update counters
    const c = this.agentCounters[metric.agent];
    if (c && metric.success) {
      if (metric.action === 'CREATE_DAMAGE_REPORT') c.damageReportsCreated++;
      if (metric.action === 'UPLOAD_PHOTOS') c.photosUploaded++;
      if (metric.action === 'TRANSITION_STATUS') c.statusTransitions++;
      if (metric.action === 'ADD_COMMENT') c.commentsAdded++;
    }
  }

  startLiveDisplay() {
    this.liveInterval = setInterval(() => this.printLive(), 5000);
  }

  stopLiveDisplay() {
    if (this.liveInterval) {
      clearInterval(this.liveInterval);
      this.liveInterval = null;
    }
  }

  private printLive() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = Math.floor(elapsed % 60);
    const totalMin = CONFIG.TEST_DURATION_MINUTES;

    const total = this.metrics.length;
    const ok = this.metrics.filter((m) => m.success).length;
    const fail = total - ok;
    const errRate = total > 0 ? ((fail / total) * 100).toFixed(1) : '0.0';

    const durations = this.metrics.map((m) => m.durationMs).sort((a, b) => a - b);
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const p95 = percentile(durations, 0.95);
    const p99 = percentile(durations, 0.99);

    const reports = Object.values(this.agentCounters).reduce((s, c) => s + c.damageReportsCreated, 0);
    const photos = Object.values(this.agentCounters).reduce((s, c) => s + c.photosUploaded, 0);
    const comments = Object.values(this.agentCounters).reduce((s, c) => s + c.commentsAdded, 0);
    const transitions = Object.values(this.agentCounters).reduce((s, c) => s + c.statusTransitions, 0);

    const lines: string[] = [];
    lines.push('');
    lines.push(`\x1b[36m${'='.repeat(62)}\x1b[0m`);
    lines.push(`\x1b[1m  DamageTrack Stress Test — ${this.activeAgents.size} Agents — ${pad(elapsedMin)}:${pad(elapsedSec)} / ${totalMin}:00\x1b[0m`);
    lines.push(`\x1b[36m${'='.repeat(62)}\x1b[0m`);
    lines.push(`  Actions: ${total} total | ${ok} ok | ${fail} fail (${errRate}%)`);
    lines.push(`  Response: avg ${avg}ms | p95 ${formatMs(p95)} | p99 ${formatMs(p99)}`);
    lines.push(`  Reports: ${reports} | Photos: ${photos} | Comments: ${comments} | Transitions: ${transitions}`);
    lines.push(`\x1b[36m${'-'.repeat(62)}\x1b[0m`);
    lines.push(`  ${'AGENT'.padEnd(22)} ${'ACTIONS'.padEnd(9)} ${'ERRORS'.padEnd(9)} ${'AVG MS'.padEnd(9)} STATUS`);

    for (const name of Object.keys(this.agentCounters)) {
      const agentMetrics = this.metrics.filter((m) => m.agent === name);
      const agentFail = agentMetrics.filter((m) => !m.success).length;
      const agentAvg = agentMetrics.length > 0
        ? Math.round(agentMetrics.reduce((s, m) => s + m.durationMs, 0) / agentMetrics.length)
        : 0;
      const status = this.activeAgents.has(name) ? '\x1b[32m● RUNNING\x1b[0m' : '\x1b[33m● DONE\x1b[0m';
      const shortName = name.replace('agent_', '');
      lines.push(`  ${shortName.padEnd(22)} ${String(agentMetrics.length).padEnd(9)} ${String(agentFail).padEnd(9)} ${String(agentAvg + 'ms').padEnd(9)} ${status}`);
    }

    lines.push(`\x1b[36m${'='.repeat(62)}\x1b[0m`);

    // Clear screen and print
    process.stdout.write('\x1b[2J\x1b[H');
    console.log(lines.join('\n'));
  }

  generateReport(): TestReport {
    const endTime = Date.now();
    const durationMin = (endTime - this.startTime) / 60000;

    const total = this.metrics.length;
    const ok = this.metrics.filter((m) => m.success).length;
    const fail = total - ok;
    const errorRate = total > 0 ? (fail / total) * 100 : 0;

    const durations = this.metrics.filter((m) => m.success).map((m) => m.durationMs).sort((a, b) => a - b);

    // By action
    const actionTypes = [...new Set(this.metrics.map((m) => m.action))];
    const byAction: TestReport['byAction'] = {};
    for (const action of actionTypes) {
      const am = this.metrics.filter((m) => m.action === action);
      const amOk = am.filter((m) => m.success);
      const amDurations = amOk.map((m) => m.durationMs).sort((a, b) => a - b);
      byAction[action] = {
        count: am.length,
        successCount: amOk.length,
        failCount: am.length - amOk.length,
        avgDurationMs: amDurations.length > 0 ? Math.round(amDurations.reduce((a, b) => a + b, 0) / amDurations.length) : 0,
        p95DurationMs: percentile(amDurations, 0.95),
        errorRate: am.length > 0 ? ((am.length - amOk.length) / am.length) * 100 : 0,
      };
    }

    // By agent
    const byAgent: TestReport['byAgent'] = {};
    for (const name of Object.keys(this.agentCounters)) {
      const am = this.metrics.filter((m) => m.agent === name);
      const amOk = am.filter((m) => m.success);
      byAgent[name] = {
        totalActions: am.length,
        successRate: am.length > 0 ? (amOk.length / am.length) * 100 : 100,
        avgDurationMs: amOk.length > 0 ? Math.round(amOk.reduce((s, m) => s + m.durationMs, 0) / amOk.length) : 0,
        ...this.agentCounters[name],
      };
    }

    // Errors
    const errors = this.metrics
      .filter((m) => !m.success)
      .map((m) => ({
        timestamp: new Date(m.timestamp).toISOString(),
        agent: m.agent,
        action: m.action,
        httpStatus: m.httpStatus,
        message: m.errorMessage || 'Unknown error',
      }));

    // Timeline (per-minute buckets)
    const timeline: TestReport['timeline'] = [];
    const totalMinutes = Math.ceil(durationMin);
    for (let min = 0; min < totalMinutes; min++) {
      const bucketStart = this.startTime + min * 60000;
      const bucketEnd = bucketStart + 60000;
      const bucket = this.metrics.filter((m) => m.timestamp >= bucketStart && m.timestamp < bucketEnd);
      const bucketErrors = bucket.filter((m) => !m.success);
      const bucketDurations = bucket.filter((m) => m.success).map((m) => m.durationMs);
      timeline.push({
        minuteMark: min + 1,
        activeAgents: this.activeAgents.size,
        actionsThisMinute: bucket.length,
        errorsThisMinute: bucketErrors.length,
        avgResponseMs: bucketDurations.length > 0
          ? Math.round(bucketDurations.reduce((a, b) => a + b, 0) / bucketDurations.length)
          : 0,
      });
    }

    // Pass/fail
    const failReasons: string[] = [];
    if (errorRate > CONFIG.MAX_ERROR_RATE_PERCENT) {
      failReasons.push(`Error rate ${errorRate.toFixed(1)}% exceeds threshold ${CONFIG.MAX_ERROR_RATE_PERCENT}%`);
    }
    const p95 = percentile(durations, 0.95);
    const p99 = percentile(durations, 0.99);
    if (p95 > CONFIG.MAX_P95_RESPONSE_MS) {
      failReasons.push(`P95 response ${p95}ms exceeds threshold ${CONFIG.MAX_P95_RESPONSE_MS}ms`);
    }
    if (p99 > CONFIG.MAX_P99_RESPONSE_MS) {
      failReasons.push(`P99 response ${p99}ms exceeds threshold ${CONFIG.MAX_P99_RESPONSE_MS}ms`);
    }

    return {
      testStartTime: new Date(this.startTime).toISOString(),
      testEndTime: new Date(endTime).toISOString(),
      totalDurationMinutes: Math.round(durationMin * 100) / 100,
      agentCount: CONFIG.AGENT_COUNT,

      summary: {
        totalActions: total,
        successfulActions: ok,
        failedActions: fail,
        errorRate: Math.round(errorRate * 100) / 100,
        actionsPerMinute: durationMin > 0 ? Math.round((total / durationMin) * 100) / 100 : 0,
      },

      responseTimesMs: {
        min: durations.length > 0 ? durations[0] : 0,
        max: durations.length > 0 ? durations[durations.length - 1] : 0,
        mean: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        median: percentile(durations, 0.5),
        p95,
        p99,
      },

      byAction,
      byAgent,
      errors,
      timeline,

      passFailResult: failReasons.length === 0 ? 'PASS' : 'FAIL',
      failReasons,
    };
  }

  saveReports(report: TestReport) {
    // JSON
    writeFileSync('report.json', JSON.stringify(report, null, 2));

    // HTML
    const html = generateHtml(report);
    writeFileSync('report.html', html);

    console.log('\nReports saved: report.json, report.html');
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function generateHtml(report: TestReport): string {
  const passColor = report.passFailResult === 'PASS' ? '#2ecc71' : '#e74c3c';
  const passLabel = report.passFailResult;

  const actionRows = Object.entries(report.byAction)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([action, stats]) => `
      <tr>
        <td>${action}</td>
        <td>${stats.count}</td>
        <td>${stats.successCount}</td>
        <td>${stats.failCount}</td>
        <td>${stats.avgDurationMs}ms</td>
        <td>${stats.p95DurationMs}ms</td>
        <td>${stats.errorRate.toFixed(1)}%</td>
      </tr>
    `).join('');

  const agentRows = Object.entries(report.byAgent)
    .sort((a, b) => b[1].totalActions - a[1].totalActions)
    .map(([agent, stats]) => `
      <tr>
        <td>${agent.replace('agent_', '')}</td>
        <td>${stats.totalActions}</td>
        <td>${stats.successRate.toFixed(1)}%</td>
        <td>${stats.avgDurationMs}ms</td>
        <td>${stats.damageReportsCreated}</td>
        <td>${stats.photosUploaded}</td>
        <td>${stats.statusTransitions}</td>
        <td>${stats.commentsAdded}</td>
      </tr>
    `).join('');

  const errorRows = report.errors.slice(0, 100).map((e) => `
    <tr>
      <td>${e.timestamp.slice(11, 19)}</td>
      <td>${e.agent.replace('agent_', '')}</td>
      <td>${e.action}</td>
      <td>${e.httpStatus}</td>
      <td>${escapeHtml(e.message).slice(0, 120)}</td>
    </tr>
  `).join('');

  const timelineLabels = JSON.stringify(report.timeline.map((t) => t.minuteMark));
  const timelineActions = JSON.stringify(report.timeline.map((t) => t.actionsThisMinute));
  const timelineErrors = JSON.stringify(report.timeline.map((t) => t.errorsThisMinute));
  const timelineAvgMs = JSON.stringify(report.timeline.map((t) => t.avgResponseMs));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DamageTrack Stress Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.3rem; margin: 2rem 0 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    .verdict { display: inline-block; padding: 0.3rem 1rem; border-radius: 6px; font-weight: bold; font-size: 1.2rem; color: white; background: ${passColor}; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .card { background: #1e293b; border-radius: 8px; padding: 1.2rem; }
    .card .label { font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; }
    .card .value { font-size: 1.6rem; font-weight: bold; margin-top: 0.3rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.8rem; border-bottom: 1px solid #334155; font-size: 0.85rem; }
    th { color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
    .chart-container { background: #1e293b; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    canvas { width: 100% !important; }
    .fail-reasons { background: #3b1111; border: 1px solid #e74c3c; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
    .fail-reasons li { margin: 0.3rem 0 0.3rem 1.5rem; }
    .meta { color: #64748b; font-size: 0.85rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>DamageTrack Stress Test Report</h1>
  <p class="meta">${report.testStartTime} — ${report.testEndTime} | ${report.agentCount} agents | ${report.totalDurationMinutes} minutes</p>
  <div style="margin-top:1rem"><span class="verdict">${passLabel}</span></div>
  ${report.failReasons.length > 0 ? `<div class="fail-reasons"><strong>Fail reasons:</strong><ul>${report.failReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>` : ''}

  <div class="summary">
    <div class="card"><div class="label">Total Actions</div><div class="value">${report.summary.totalActions}</div></div>
    <div class="card"><div class="label">Success / Fail</div><div class="value">${report.summary.successfulActions} / ${report.summary.failedActions}</div></div>
    <div class="card"><div class="label">Error Rate</div><div class="value">${report.summary.errorRate}%</div></div>
    <div class="card"><div class="label">Actions / Min</div><div class="value">${report.summary.actionsPerMinute}</div></div>
    <div class="card"><div class="label">Avg Response</div><div class="value">${report.responseTimesMs.mean}ms</div></div>
    <div class="card"><div class="label">P95 / P99</div><div class="value">${report.responseTimesMs.p95}ms / ${report.responseTimesMs.p99}ms</div></div>
  </div>

  <h2>Timeline</h2>
  <div class="chart-container">
    <canvas id="timelineChart" height="80"></canvas>
  </div>
  <div class="chart-container">
    <canvas id="responseChart" height="80"></canvas>
  </div>

  <h2>By Action</h2>
  <table>
    <thead><tr><th>Action</th><th>Count</th><th>OK</th><th>Fail</th><th>Avg</th><th>P95</th><th>Error%</th></tr></thead>
    <tbody>${actionRows}</tbody>
  </table>

  <h2>By Agent</h2>
  <table>
    <thead><tr><th>Agent</th><th>Actions</th><th>Success%</th><th>Avg ms</th><th>Reports</th><th>Photos</th><th>Transitions</th><th>Comments</th></tr></thead>
    <tbody>${agentRows}</tbody>
  </table>

  <h2>Errors (first 100)</h2>
  <table>
    <thead><tr><th>Time</th><th>Agent</th><th>Action</th><th>HTTP</th><th>Message</th></tr></thead>
    <tbody>${errorRows}</tbody>
  </table>

  <script>
    const labels = ${timelineLabels};
    new Chart(document.getElementById('timelineChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Actions/min', data: ${timelineActions}, backgroundColor: '#3b82f6', borderRadius: 3 },
          { label: 'Errors/min', data: ${timelineErrors}, backgroundColor: '#ef4444', borderRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Minute', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
          y: { title: { display: true, text: 'Count', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        },
        plugins: { legend: { labels: { color: '#e2e8f0' } } },
      },
    });
    new Chart(document.getElementById('responseChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Avg Response (ms)', data: ${timelineAvgMs}, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'Minute', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
          y: { title: { display: true, text: 'ms', color: '#94a3b8' }, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
        },
        plugins: { legend: { labels: { color: '#e2e8f0' } } },
      },
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
