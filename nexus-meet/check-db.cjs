const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://nexusmeet:nexusmeet_dev@localhost:5433/nexusmeet_db'
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT * FROM meetings');
  console.log('ALL MEETINGS:', res.rows);
  const partRes = await client.query('SELECT * FROM meeting_participants');
  console.log('ALL PARTICIPANTS:', partRes.rows);
  await client.end();
}
main().catch(console.error);
