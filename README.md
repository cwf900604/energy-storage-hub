# 全球储能资讯 | Global Energy Storage News

Daily updated energy storage news aggregator. 每日自动更新的全球储能行业资讯聚合站。

## How It Works

- **Data Sources**: 4 public RSS feeds covering energy storage industry news
  - [Energy Storage News](https://www.energy-storage.news/)
  - [PV Magazine](https://www.pv-magazine.com/)
  - [CleanTechnica](https://cleantechnica.com/)
  - [Utility Dive](https://www.utilitydive.com/)
- **Auto-update**: GitHub Actions runs daily at 08:03 UTC, fetching new articles
- **Citations**: Every article links to its original source

## Tech Stack

- Python + feedparser for RSS collection
- Static HTML/CSS/JS frontend
- GitHub Pages for hosting
- GitHub Actions for daily scheduling

## Local Development

```bash
pip install -r scripts/requirements.txt
python scripts/fetch_news.py
# Open index.html in your browser
```

## License

MIT
