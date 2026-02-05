const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const BASE_ADDRESS = '0x75f39d9Bff76d376F3960028d98F324aAbB6c5e6';
const SOLANA_ADDRESS = 'FeB1jqjCFKyQ2vVTPLgYmZu1yLvBWhsGoudP46fhhF8z';

// Database setup
const db = new Database('analytics.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    base_balance REAL NOT NULL,
    solana_balance REAL NOT NULL,
    base_usd REAL,
    solana_usd REAL
  );
  
  CREATE INDEX IF NOT EXISTS idx_timestamp ON balance_history(timestamp);
`);

// Middleware
app.use(cors());
app.use(express.static('public'));

// Providers
const baseProvider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const solanaConnection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Helper: Record balance snapshot
async function recordBalanceSnapshot() {
  try {
    const baseBalance = await baseProvider.getBalance(BASE_ADDRESS);
    const baseEth = parseFloat(ethers.formatEther(baseBalance));
    
    const solanaPublicKey = new PublicKey(SOLANA_ADDRESS);
    const solanaBalance = await solanaConnection.getBalance(solanaPublicKey);
    const solanaSol = solanaBalance / LAMPORTS_PER_SOL;
    
    const stmt = db.prepare(`
      INSERT INTO balance_history (timestamp, base_balance, solana_balance)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(Date.now(), baseEth, solanaSol);
    console.log(`📊 Recorded snapshot: ${baseEth} ETH, ${solanaSol} SOL`);
  } catch (error) {
    console.error('Error recording snapshot:', error.message);
  }
}

// API: Current stats
app.get('/api/stats', async (req, res) => {
  try {
    // Fetch current balances
    const baseBalance = await baseProvider.getBalance(BASE_ADDRESS);
    const baseEth = ethers.formatEther(baseBalance);
    
    const solanaPublicKey = new PublicKey(SOLANA_ADDRESS);
    const solanaBalance = await solanaConnection.getBalance(solanaPublicKey);
    const solanaSol = solanaBalance / LAMPORTS_PER_SOL;
    
    // Get gas price
    const feeData = await baseProvider.getFeeData();
    const gasPrice = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0';
    
    // Get historical data count
    const historyCount = db.prepare('SELECT COUNT(*) as count FROM balance_history').get();
    
    // Get first and latest snapshots for trends
    const firstSnapshot = db.prepare('SELECT * FROM balance_history ORDER BY timestamp ASC LIMIT 1').get();
    const latestSnapshot = db.prepare('SELECT * FROM balance_history ORDER BY timestamp DESC LIMIT 1').get();
    
    let baseChange = 0;
    let solanaChange = 0;
    
    if (firstSnapshot && latestSnapshot) {
      baseChange = ((latestSnapshot.base_balance - firstSnapshot.base_balance) / firstSnapshot.base_balance) * 100;
      solanaChange = ((latestSnapshot.solana_balance - firstSnapshot.solana_balance) / firstSnapshot.solana_balance) * 100;
    }
    
    res.json({
      current: {
        base: {
          balance: baseEth,
          gasPrice: gasPrice,
          change: baseChange.toFixed(2)
        },
        solana: {
          balance: solanaSol.toFixed(9),
          change: solanaChange.toFixed(2)
        }
      },
      metrics: {
        snapshotsRecorded: historyCount.count,
        trackingSince: firstSnapshot ? new Date(firstSnapshot.timestamp).toISOString() : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Balance history
app.get('/api/history', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = Date.now() - (hours * 60 * 60 * 1000);
    
    const history = db.prepare(`
      SELECT timestamp, base_balance, solana_balance
      FROM balance_history
      WHERE timestamp > ?
      ORDER BY timestamp ASC
    `).all(since);
    
    res.json({
      history: history.map(row => ({
        timestamp: row.timestamp,
        date: new Date(row.timestamp).toISOString(),
        base: row.base_balance,
        solana: row.solana_balance
      })),
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Activity summary
app.get('/api/activity', (req, res) => {
  try {
    const stats = {
      last24h: db.prepare(`
        SELECT COUNT(*) as count FROM balance_history 
        WHERE timestamp > ?
      `).get(Date.now() - 24*60*60*1000).count,
      
      last7d: db.prepare(`
        SELECT COUNT(*) as count FROM balance_history 
        WHERE timestamp > ?
      `).get(Date.now() - 7*24*60*60*1000).count,
      
      total: db.prepare('SELECT COUNT(*) as count FROM balance_history').get().count,
      
      avgBaseBalance: db.prepare(`
        SELECT AVG(base_balance) as avg FROM balance_history
        WHERE timestamp > ?
      `).get(Date.now() - 7*24*60*60*1000).avg,
      
      avgSolanaBalance: db.prepare(`
        SELECT AVG(solana_balance) as avg FROM balance_history
        WHERE timestamp > ?
      `).get(Date.now() - 7*24*60*60*1000).avg
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Record initial snapshot and start periodic recording
recordBalanceSnapshot();
setInterval(recordBalanceSnapshot, 15 * 60 * 1000); // Every 15 minutes

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📊 Analytics Dashboard running on port ${PORT}`);
  console.log(`📈 Tracking wallets:`);
  console.log(`   Base: ${BASE_ADDRESS}`);
  console.log(`   Solana: ${SOLANA_ADDRESS}`);
  console.log(`📁 Database snapshots: ${db.prepare('SELECT COUNT(*) as count FROM balance_history').get().count}`);
});
