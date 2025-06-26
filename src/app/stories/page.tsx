'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout';
import { Button, Card, CardContent, Spinner } from '@/components/ui';
import { useApp, useToast } from '@/contexts';

// ================================================================
// Types
// ================================================================

interface Story {
  id: string;
  title: string;
  text_raw: string;
  status: 'draft' | 'script_generated' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  word_count: number;
}

type StatusFilter = 'all' | 'draft' | 'script_generated' | 'processing' | 'completed' | 'error';

// ================================================================
// Stories List Page Component
// ================================================================

const StoriesPage: React.FC = () => {
  const { state } = useApp();
  const { error } = useToast();
  
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Mock data - will be replaced with API calls
  useEffect(() => {
    const loadStories = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
        
        const mockStories: Story[] = [
          {
            id: 'story1',
            title: 'Product Introduction Video',
            text_raw: 'Welcome to our revolutionary new product that will change the way you work...',
            status: 'completed',
            created_at: '2024-01-25T09:15:00Z',
            updated_at: '2024-01-25T10:30:00Z',
            word_count: 45,
          },
          {
            id: 'story2',
            title: 'Tutorial: Getting Started',
            text_raw: 'In this comprehensive tutorial, we will walk you through the basics...',
            status: 'processing',
            created_at: '2024-01-24T16:45:00Z',
            updated_at: '2024-01-24T17:00:00Z',
            word_count: 120,
          },
          {
            id: 'story3',
            title: 'Customer Testimonial',
            text_raw: 'Our customers love the innovative features and seamless experience...',
            status: 'script_generated',
            created_at: '2024-01-23T11:20:00Z',
            updated_at: '2024-01-23T14:15:00Z',
            word_count: 67,
          },
          {
            id: 'story4',
            title: 'Company Overview',
            text_raw: 'Founded in 2020, our company has been at the forefront of innovation...',
            status: 'draft',
            created_at: '2024-01-22T14:30:00Z',
            updated_at: '2024-01-22T14:30:00Z',
            word_count: 89,
          },
          {
            id: 'story5',
            title: 'Feature Walkthrough',
            text_raw: 'Let us show you the powerful features that make our product stand out...',
            status: 'error',
            created_at: '2024-01-21T10:15:00Z',
            updated_at: '2024-01-21T12:45:00Z',
            word_count: 156,
          }
        ];
        
        setStories(mockStories);
      } catch (err) {
        console.error('Failed to load stories:', err);
        error('Failed to load stories');
      } finally {
        setIsLoading(false);
      }
    };

    loadStories();
  }, [error]);

  // Filter and search stories
  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.text_raw.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || story.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'script_generated':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes}`;
  };

  const getStatusCounts = () => {
    return {
      all: stories.length,
      draft: stories.filter(s => s.status === 'draft').length,
      script_generated: stories.filter(s => s.status === 'script_generated').length,
      processing: stories.filter(s => s.status === 'processing').length,
      completed: stories.filter(s => s.status === 'completed').length,
      error: stories.filter(s => s.status === 'error').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Loading stories...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Stories</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage and create video stories with AI-powered script generation.
              </p>
            </div>
            <Link href="/stories/new">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Story
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: statusCounts.all },
                { key: 'draft', label: 'Draft', count: statusCounts.draft },
                { key: 'script_generated', label: 'Script Ready', count: statusCounts.script_generated },
                { key: 'processing', label: 'Processing', count: statusCounts.processing },
                { key: 'completed', label: 'Completed', count: statusCounts.completed },
                { key: 'error', label: 'Error', count: statusCounts.error },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key as StatusFilter)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    statusFilter === filter.key
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No stories found' : 'No stories yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first story.'
              }
            </p>
            {(!searchQuery && statusFilter === 'all') && (
              <Link href="/stories/new">
                <Button>Create Your First Story</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {story.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(story.status)} ml-2 flex-shrink-0`}>
                        {story.status === 'script_generated' ? 'script ready' : story.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {story.text_raw}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span>{story.word_count} words</span>
                        <span>Updated {formatDate(story.updated_at)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {story.status === 'processing' && (
                          <Spinner size="sm" className="text-blue-600" />
                        )}
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StoriesPage;