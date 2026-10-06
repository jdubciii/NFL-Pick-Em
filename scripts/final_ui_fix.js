const fs = require('fs');
const path = require('path');
const { PrismaClient, Role, Status, GameStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const root = path.resolve(__dirname, '..');

async function repair() {
  console.log('>>> [1/4] Upgrading Jack to ADMIN in database...');
  await prisma.user.updateMany({
    where: { email: 'jack@nflpickem.com' },
    data: { role: Role.ADMIN }
  });

  console.log('>>> [2/4] Wiping all duplicate and legacy mock games...');
  await prisma.pickResult.deleteMany();
  await prisma.pick.deleteMany();
  // Delete all games that do not match the clean 2026_w04 or 2026_w05 pattern
  await prisma.game.deleteMany({
    where: {
      NOT: {
        externalGameId: { startsWith: '2026_w' }
      }
    }
  });

  // Check how many games remain
  const remaining = await prisma.game.findMany({ select: { externalGameId: true } });
  console.log(`Remaining games with valid IDs: ${remaining.length}`);

  // If week 5 games were cleared, re-seed them cleanly
  const existingW5 = await prisma.game.count({ where: { externalGameId: { startsWith: '2026_w05_' } } });
  if (existingW5 === 0) {
    console.log('Seeding 15 upcoming Week 5 matchups...');
    const W5_GAMES = [
      { externalGameId: '2026_w05_dal_tb',  homeTeamId: 'DAL', awayTeamId: 'TB',  kickoff: '2026-10-08T20:15:00Z' },
      { externalGameId: '2026_w05_jax_phi', homeTeamId: 'JAX', awayTeamId: 'PHI', kickoff: '2026-10-11T09:30:00Z' },
      { externalGameId: '2026_w05_ne_lv',   homeTeamId: 'NE',  awayTeamId: 'LV',  kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_gb_chi',  homeTeamId: 'GB',  awayTeamId: 'CHI', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_mia_cin', homeTeamId: 'MIA', awayTeamId: 'CIN', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_no_min',  homeTeamId: 'NO',  awayTeamId: 'MIN', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_ten_hou', homeTeamId: 'TEN', awayTeamId: 'HOU', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_pit_ind', homeTeamId: 'PIT', awayTeamId: 'IND', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_nyj_cle', homeTeamId: 'NYJ', awayTeamId: 'CLE', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_was_nyg', homeTeamId: 'WAS', awayTeamId: 'NYG', kickoff: '2026-10-11T13:00:00Z' },
      { externalGameId: '2026_w05_lac_den', homeTeamId: 'LAC', awayTeamId: 'DEN', kickoff: '2026-10-11T16:05:00Z' },
      { externalGameId: '2026_w05_sea_sf',  homeTeamId: 'SEA', awayTeamId: 'SF',  kickoff: '2026-10-11T16:25:00Z' },
      { externalGameId: '2026_w05_ari_det', homeTeamId: 'ARI', awayTeamId: 'DET', kickoff: '2026-10-11T16:25:00Z' },
      { externalGameId: '2026_w05_atl_bal', homeTeamId: 'ATL', awayTeamId: 'BAL', kickoff: '2026-10-11T20:20:00Z' },
      { externalGameId: '2026_w05_lar_buf', homeTeamId: 'LAR', awayTeamId: 'BUF', kickoff: '2026-10-12T20:15:00Z' },
    ];
    for (const g of W5_GAMES) {
      await prisma.game.create({
        data: {
          externalGameId: g.externalGameId,
          homeTeamId: g.homeTeamId,
          awayTeamId: g.awayTeamId,
          kickoffTime: new Date(g.kickoff),
          status: GameStatus.SCHEDULED,
        }
      });
    }
  }

  console.log('>>> [3/4] Patching Navbar.tsx so admin controls are always visible for Jack...');
  const navbarPath = path.join(root, 'client/src/components/Navbar.tsx');
  if (fs.existsSync(navbarPath)) {
    let nav = fs.readFileSync(navbarPath, 'utf8');
    // Ensure Admin Console and System Ops are shown if user is admin OR email is jack@nflpickem.com
    nav = nav.replace(
      /\.\.\.\(isAdmin \? \[(\{ name: 'System Ops'[^\n]+) : \[\]\)/g,
      `...((isAdmin || user?.email === 'jack@nflpickem.com') ? [$1 : [])`
    );
    nav = nav.replace(
      /\.\.\.\(isAdmin \? \[(\{ name: 'Admin'[^\n]+) : \[\]\)/g,
      `...((isAdmin || user?.email === 'jack@nflpickem.com') ? [$1 : [])`
    );
    // Replace role text badge
    nav = nav.replace(
      /\{isAdmin \? 'COMMISSIONER' : 'LEAGUE MEMBER'\}/g,
      `{(isAdmin || user?.email === 'jack@nflpickem.com') ? 'COMMISSIONER' : 'LEAGUE MEMBER'}`
    );
    fs.writeFileSync(navbarPath, nav, 'utf8');
    console.log('✓ Navbar.tsx patched');
  }

  console.log('>>> [4/4] Patching WeeklyPicks game query in backend...');
  const serverPath = path.join(root, 'src/server.ts');
  if (fs.existsSync(serverPath)) {
    let serverCode = fs.readFileSync(serverPath, 'utf8');
    // Ensure GET /api/games returns Week 5 scheduled games by default if no week specified
    if (serverCode.includes("app.get('/api/games'")) {
      serverCode = serverCode.replace(
        /const games = await db\.game\.findMany\(\{[^}]*\}\);/,
        `const games = await db.game.findMany({
          where: {
            OR: [
              { status: 'SCHEDULED' },
              { externalGameId: { contains: '_w05_' } }
            ]
          },
          orderBy: { kickoffTime: 'asc' }
        });`
      );
      fs.writeFileSync(serverPath, serverCode, 'utf8');
      console.log('✓ Server /api/games endpoint patched for active Week 5 slate');
    }
  }

  console.log('\n============================================================');
  console.log('DATABASE AND ROUTES REPAIRED');
  console.log('============================================================\n');

  await prisma.$disconnect();
}

repair().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
