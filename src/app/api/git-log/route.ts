import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const format = searchParams.get('format') || 'oneline';
    
    // GitHub repository information
    const owner = 'akibsystems'; // GitHubユーザー名
    const repo = 'showgeki2'; // リポジトリ名
    
    // GitHub API doesn't require authentication for public repos
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Add token if available (increases rate limit from 60 to 5000 requests/hour)
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }
    
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`,
      { headers }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API error:', errorData);
      
      if (response.status === 403 && errorData.message?.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'GitHub API rate limit exceeded. Please add GITHUB_TOKEN to environment variables.' 
        }, { status: 429 });
      }
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'Repository not found. It might be private - please add GITHUB_TOKEN to environment variables.' 
        }, { status: 404 });
      }
      
      throw new Error(`GitHub API returned ${response.status}: ${errorData.message || 'Unknown error'}`);
    }
    
    const githubCommits = await response.json();
    
    // Transform GitHub API response to match our format
    const commits = githubCommits.map((commit: any) => {
      const commitData: any = {
        hash: commit.sha,
        message: commit.commit.message.split('\n')[0] // First line only
      };
      
      // Add full details if requested
      if (format === 'full') {
        commitData.author = commit.commit.author.name;
        commitData.email = commit.commit.author.email;
        commitData.date = commit.commit.author.date;
      }
      
      return commitData;
    });
    
    // Get rate limit info
    const rateLimit = {
      limit: response.headers.get('X-RateLimit-Limit'),
      remaining: response.headers.get('X-RateLimit-Remaining'),
      reset: response.headers.get('X-RateLimit-Reset')
    };
    
    return NextResponse.json({
      commits,
      total: commits.length,
      limit: parseInt(limit),
      source: 'github-api',
      rateLimit
    });
  } catch (error) {
    console.error('Error fetching git log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch git log' },
      { status: 500 }
    );
  }
}