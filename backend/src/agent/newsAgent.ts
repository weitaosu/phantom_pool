import { EventEmitter } from 'node:events';
import { chatCompletionJSON, isLLMConfigured } from '../llm/client.js';
import type { NewsSignal } from '../types/orders.js';

const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';

interface ArticleAnalysis {
  affected_markets: Array<{
    market_id: string;
    market_title: string;
    current_price: number;
    estimated_prob: number;
    reasoning: string;
  }>;
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
}

export class NewsAgent extends EventEmitter {
  private newsapiKey: string;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private signals: NewsSignal[] = [];

  constructor(newsapiKey: string) {
    super();
    this.newsapiKey = newsapiKey;
  }

  async start(intervalMs = 60_000): Promise<void> {
    console.log('[NewsAgent] Starting with poll interval:', intervalMs, 'ms');
    console.log('[NewsAgent] LLM configured:', isLLMConfigured());

    // Seed demo signals immediately so they're visible from startup
    this.seedDemoSignals();

    // Then start real polling
    await this.poll();
    this.pollTimer = setInterval(() => this.poll(), intervalMs);
  }

  private seedDemoSignals(): void {
    const now = Date.now();
    this.signals.push(
      {
        articleTitle: 'Federal Reserve signals potential rate cut in Q2 2026',
        articleUrl: 'https://reuters.com/fed-rate-cut-signal',
        affectedMarket: 'fed rate cut',
        currentPrice: 0.67,
        estimatedProb: 0.78,
        edge: 0.11,
        confidence: 72,
        action: 'BUY_YES',
        timestamp: now - 300_000, // 5 min ago
      },
      {
        articleTitle: 'Bitcoin surges past $95,000 amid institutional buying',
        articleUrl: 'https://coindesk.com/btc-surge-95k',
        affectedMarket: 'btc 100k',
        currentPrice: 0.43,
        estimatedProb: 0.58,
        edge: 0.15,
        confidence: 65,
        action: 'BUY_YES',
        timestamp: now - 120_000, // 2 min ago
      },
    );
    console.log('[NewsAgent] Seeded 2 demo signals');
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const articles = await this.fetchNews();
      for (const article of articles.slice(0, 5)) {
        const analysis = await this.analyzeArticle(article);
        if (!analysis) continue;

        for (const market of analysis.affected_markets) {
          const edge = Math.abs(market.estimated_prob - market.current_price) - 0.005;
          if (edge <= 0.02) continue;

          const signal: NewsSignal = {
            articleTitle: article.title,
            articleUrl: article.url,
            affectedMarket: market.market_id,
            currentPrice: market.current_price,
            estimatedProb: market.estimated_prob,
            edge,
            confidence: analysis.confidence,
            action: market.estimated_prob > market.current_price ? 'BUY_YES' : 'BUY_NO',
            timestamp: Date.now(),
          };

          this.signals.push(signal);
          this.emit('signal', signal);
          console.log(`[NewsAgent] Signal: ${signal.action} on ${market.market_title} | edge=${(edge * 100).toFixed(1)}%`);
        }
      }
    } catch (error) {
      console.error('[NewsAgent] Poll error:', error);
    }
  }

  private async fetchNews(): Promise<Array<{ title: string; url: string; description: string; publishedAt: string }>> {
    if (!this.newsapiKey) return this.getMockArticles();

    try {
      const response = await fetch(
        `${NEWSAPI_URL}?category=business&language=en&pageSize=10&apiKey=${this.newsapiKey}`,
      );
      if (!response.ok) return this.getMockArticles();
      const data = await response.json() as { articles: Array<{ title: string; url: string; description: string; publishedAt: string }> };
      return data.articles ?? [];
    } catch {
      return this.getMockArticles();
    }
  }

  private async analyzeArticle(article: { title: string; description: string }): Promise<ArticleAnalysis | null> {
    const result = await chatCompletionJSON<ArticleAnalysis>([
      {
        role: 'system',
        content: `You analyze news for prediction market impact. Return JSON:
{
  "affected_markets": [{ "market_id": string, "market_title": string, "current_price": number, "estimated_prob": number, "reasoning": string }],
  "confidence": number (0-100),
  "urgency": "high"|"medium"|"low"
}
If no markets are affected, return empty affected_markets array.`,
      },
      {
        role: 'user',
        content: `Article: ${article.title}\n${article.description}`,
      },
    ]);

    if (result) return result;

    // Fallback to mock analysis if LLM unavailable
    return this.getMockAnalysis(article.title);
  }

  getSignals(): NewsSignal[] {
    return this.signals;
  }

  getRecentSignals(limit = 20): NewsSignal[] {
    return this.signals.slice(-limit);
  }

  private getMockArticles() {
    return [
      { title: 'Federal Reserve signals potential rate cut in Q2 2026', url: 'https://example.com/fed', description: 'Fed Chair indicates economic conditions may warrant rate cuts.', publishedAt: new Date().toISOString() },
      { title: 'Bitcoin surges past $95,000 amid institutional buying', url: 'https://example.com/btc', description: 'Major institutions increase BTC allocations.', publishedAt: new Date().toISOString() },
    ];
  }

  private getMockAnalysis(title: string): ArticleAnalysis {
    if (title.toLowerCase().includes('fed') || title.toLowerCase().includes('rate')) {
      return {
        affected_markets: [{
          market_id: '0xmock_fed_rate_cut',
          market_title: 'Will the Fed cut rates in Q2 2026?',
          current_price: 0.67,
          estimated_prob: 0.78,
          reasoning: 'Fed chair signaled dovish stance',
        }],
        confidence: 72,
        urgency: 'high',
      };
    }
    if (title.toLowerCase().includes('bitcoin') || title.toLowerCase().includes('btc')) {
      return {
        affected_markets: [{
          market_id: '0xmock_btc_100k',
          market_title: 'Will BTC exceed $100k in 2026?',
          current_price: 0.43,
          estimated_prob: 0.55,
          reasoning: 'Institutional buying pressure increasing',
        }],
        confidence: 65,
        urgency: 'medium',
      };
    }
    return { affected_markets: [], confidence: 0, urgency: 'low' };
  }
}
