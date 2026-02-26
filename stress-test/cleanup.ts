import { CONFIG } from './config';
import { ApiClient } from './api-client';
import { login } from './actions/auth';

async function main() {
  console.log('\n  DamageTrack Stress Test — Cleanup\n');

  const client = new ApiClient('cleanup');

  try {
    await login(client, CONFIG.ADMIN_USERNAME, CONFIG.ADMIN_PASSWORD);
    console.log('  [OK] Admin login successful');
  } catch (err: any) {
    console.error(`  FATAL: Cannot login as admin: ${err.message}`);
    process.exit(1);
  }

  // 1. Find all agent users
  const usersRes = await client.get('/users', { limit: 100, search: 'agent_' });
  const users = (usersRes.data?.data || usersRes.data || []).filter((u: any) =>
    u.username?.startsWith('agent_')
  );
  console.log(`  Found ${users.length} agent user(s)`);

  // 2. Find all damage reports by agent users
  let deletedReports = 0;
  for (const user of users) {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const res = await client.get('/damages', { reportedById: user.id, limit: 50, page });
      const reports = res.data?.data || res.data || [];
      const pagination = res.data?.pagination;

      for (const report of reports) {
        try {
          await client.delete(`/damages/${report.id}`);
          deletedReports++;
        } catch {
          // May fail if not admin or report already deleted
        }
      }

      hasMore = pagination && page < pagination.totalPages;
      page++;
    }
  }
  console.log(`  Deleted ${deletedReports} damage report(s)`);

  // 3. Keep agent users active (so future runs don't need to recreate them)
  console.log(`  Agent user accounts kept active for future runs`);

  console.log('\n  Cleanup complete.\n');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
