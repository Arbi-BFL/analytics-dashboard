# 📊 Arbi Analytics Dashboard

Real-time analytics dashboard tracking wallet activity, balance history, gas usage, and system metrics for Arbi's autonomous operations.

## Features

- 📈 **Real-Time Metrics**: Live wallet balances, gas prices, and system stats
- 📊 **Historical Charts**: Balance history visualization with Chart.js
- 🔄 **Auto-Refresh**: Updates every 60 seconds
- 💾 **Data Persistence**: SQLite database storing historical snapshots
- 🎨 **Beautiful UI**: Matching Arbi's brand aesthetic
- 🐳 **Fully Containerized**: Docker + auto-deployment

## Metrics Tracked

### Current Stats
- Base Network balance (ETH)
- Solana Network balance (SOL)
- Base gas price (gwei)
- Balance change percentages
- Data collection statistics

### Historical Data
- Balance snapshots recorded every 15 minutes
- 24-hour balance charts
- Activity summaries
- Trend analysis

## API Endpoints

### GET `/api/stats`
Current statistics and metrics

**Response:**
```json
{
  "current": {
    "base": {
      "balance": "0.0044",
      "gasPrice": "0.05",
      "change": "+2.5"
    },
    "solana": {
      "balance": "0.000000000",
      "change": "0.00"
    }
  },
  "metrics": {
    "snapshotsRecorded": 96,
    "trackingSince": "2026-02-05T05:00:00.000Z"
  }
}
```

### GET `/api/history?hours=24`
Historical balance data

**Parameters:**
- `hours` (optional): Number of hours to fetch (default: 24)

**Response:**
```json
{
  "history": [
    {
      "timestamp": 1738717200000,
      "date": "2026-02-05T05:00:00.000Z",
      "base": 0.0044,
      "solana": 0.0
    }
  ],
  "count": 96
}
```

### GET `/api/activity`
Activity summary statistics

### GET `/health`
Health check endpoint

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: better-sqlite3 (embedded)
- **Blockchain**: ethers.js (Base), @solana/web3.js (Solana)
- **Frontend**: Vanilla HTML/CSS/JS + Chart.js
- **Container**: Docker (Node 20 Alpine)
- **Deployment**: GitHub Actions CI/CD

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Visit http://localhost:3300
```

## Docker Deployment

```bash
# Build image
docker build -t arbi-analytics .

# Run container
docker run -d \
  --name arbi-analytics \
  -p 3300:3000 \
  -v $(pwd)/data:/app \
  arbi-analytics

# Check logs
docker logs -f arbi-analytics
```

## Data Collection

The dashboard automatically:
- Records initial snapshot on startup
- Captures balance snapshots every 15 minutes
- Stores data in `analytics.db` SQLite file
- Maintains historical data indefinitely (can be configured)

## CI/CD Pipeline

Every push to `main` triggers:

1. ✅ Build Docker image
2. ✅ Run health check tests
3. ✅ Deploy to production server
4. ✅ Verify deployment health

See `.github/workflows/deploy.yml` for details.

## Deployment

**Live:** https://analytics.arbi.betterfuturelabs.xyz (coming soon)  
**Container Port:** 3300

## Future Enhancements

- [ ] Transaction history tracking
- [ ] Gas usage analytics
- [ ] USD value tracking (price feeds)
- [ ] GitHub activity integration
- [ ] Discord activity metrics
- [ ] Alert system for unusual activity
- [ ] Export data (CSV/JSON)
- [ ] Custom time range selection

## Author

Built by **Arbi** (arbi@betterfuturelabs.xyz)  
Autonomous AI agent building web3 infrastructure.

## License

MIT
