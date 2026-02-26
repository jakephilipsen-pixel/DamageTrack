import { CONFIG, AGENT_PERSONAS } from './config';
import { ApiClient } from './api-client';
import { Agent } from './agent';
import { Reporter } from './reporter';
import { login, createUser } from './actions/auth';

async function main() {
  const agentCount = CONFIG.AGENT_COUNT;
  const durationMin = CONFIG.TEST_DURATION_MINUTES;
  const personas = AGENT_PERSONAS.slice(0, agentCount);

  console.log(`\n  DamageTrack Stress Test`);
  console.log(`  Agents: ${agentCount} | Duration: ${durationMin} min | Target: ${CONFIG.BASE_URL}\n`);

  // 1. Verify server is reachable
  const adminClient = new ApiClient('admin_setup');
  try {
    await login(adminClient, CONFIG.ADMIN_USERNAME, CONFIG.ADMIN_PASSWORD);
    console.log('  [OK] Admin login successful');
  } catch (err: any) {
    console.error(`\n  FATAL: Cannot reach server at ${CONFIG.BASE_URL}`);
    console.error(`  Error: ${err.message}`);
    console.error(`  Make sure the DamageTrack app is running.\n`);
    process.exit(1);
  }

  // 2. Create agent user accounts
  console.log(`  Creating ${personas.length} agent user accounts...`);
  for (const persona of personas) {
    try {
      await createUser(adminClient, {
        username: persona.name,
        email: `${persona.name}@stresstest.local`,
        password: 'Test1234pass',
        firstName: persona.name.replace('agent_', '').replace(/_/g, ' '),
        lastName: 'StressBot',
        role: persona.role,
      });
    } catch (err: any) {
      // 409 = already exists, which is fine
      if (!err.message?.includes('409')) {
        console.warn(`  [WARN] Could not create user ${persona.name}: ${err.message}`);
      }
    }
  }
  console.log('  [OK] Agent accounts ready\n');

  // 3. Setup agents
  const reporter = new Reporter();
  const agents: Agent[] = [];

  for (const persona of personas) {
    const agent = new Agent(persona, reporter);
    try {
      await agent.setup();
      agents.push(agent);
      console.log(`  [OK] ${persona.name} (${persona.role}, ${persona.style}) ready`);
    } catch (err: any) {
      console.error(`  [FAIL] ${persona.name} setup failed: ${err.message}`);
    }
  }

  if (agents.length === 0) {
    console.error('\n  FATAL: No agents could be set up. Aborting.\n');
    process.exit(1);
  }

  console.log(`\n  Starting ${agents.length} agents for ${durationMin} minutes...\n`);

  // 4. Start
  reporter.start();
  reporter.startLiveDisplay();
  const endTime = Date.now() + durationMin * 60 * 1000;

  // Stagger agent starts
  const agentPromises: Promise<void>[] = [];
  for (let i = 0; i < agents.length; i++) {
    const delay = i * CONFIG.AGENT_STAGGER_SECONDS * 1000;
    agentPromises.push(
      sleep(delay).then(() => agents[i].run(endTime))
    );
  }

  await Promise.all(agentPromises);

  // 5. Wrap up
  reporter.stopLiveDisplay();
  const report = reporter.generateReport();

  // Print final summary
  console.log('\n');
  console.log('='.repeat(62));
  console.log('  STRESS TEST COMPLETE');
  console.log('='.repeat(62));
  console.log(`  Result: ${report.passFailResult === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}`);
  console.log(`  Duration: ${report.totalDurationMinutes} minutes`);
  console.log(`  Total Actions: ${report.summary.totalActions}`);
  console.log(`  Success: ${report.summary.successfulActions} | Fail: ${report.summary.failedActions}`);
  console.log(`  Error Rate: ${report.summary.errorRate}%`);
  console.log(`  Actions/min: ${report.summary.actionsPerMinute}`);
  console.log(`  Response: avg ${report.responseTimesMs.mean}ms | p95 ${report.responseTimesMs.p95}ms | p99 ${report.responseTimesMs.p99}ms`);

  if (report.failReasons.length > 0) {
    console.log('\n  Fail reasons:');
    for (const reason of report.failReasons) {
      console.log(`    - ${reason}`);
    }
  }

  console.log('');

  reporter.saveReports(report);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
