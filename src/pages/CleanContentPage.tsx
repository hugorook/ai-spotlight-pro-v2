import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/types/supabase";

type Company = Pick<Tables<'companies'>, 'id' | 'company_name' | 'industry' | 'description' | 'target_customers' | 'key_differentiators'>;

interface ContentTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  aiOptimized: boolean;
}

interface SavedContent {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

const CleanContentPage = () => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContentType, setSelectedContentType] = useState("blog");
  const [contentTitle, setContentTitle] = useState("");
  const [contentTopic, setContentTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');
  const [contentLibrary, setContentLibrary] = useState<SavedContent[]>([]);

  const contentTemplates: ContentTemplate[] = [
    {
      id: "blog",
      type: "Blog Post",
      title: "Thought Leadership Blog",
      description: "Generate AI-optimized blog posts that position you as an industry expert",
      icon: "✍️",
      aiOptimized: true
    },
    {
      id: "faq",
      type: "FAQ Page",
      title: "Comprehensive FAQ",
      description: "Create detailed FAQ pages that answer common customer questions",
      icon: "❓",
      aiOptimized: true
    },
    {
      id: "case-study",
      type: "Case Study",
      title: "Customer Success Story",
      description: "Showcase customer wins and demonstrate your value proposition",
      icon: "📈",
      aiOptimized: true
    },
    {
      id: "press-release",
      type: "Press Release",
      title: "Company Announcement",
      description: "Professional press releases for company news and achievements",
      icon: "📄",
      aiOptimized: false
    }
  ];

  useEffect(() => {
    if (user) {
      loadCompanyData();
      loadContentLibrary();
    }
  }, [user, loadCompanyData]);

  const loadCompanyData = useCallback(async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error loading company:', error);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadContentLibrary = async () => {
    // Simulate loading saved content - in real implementation, this would load from database
    try {
      // For now, we'll use localStorage to simulate persistence
      const saved = localStorage.getItem('content-library');
      if (saved) {
        setContentLibrary(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading content library:', error);
    }
  };

  const generateContent = async () => {
    if (!contentTopic.trim() || !company) return;

    try {
      setIsGenerating(true);
      
      // Call the edge function to generate AI-optimized content
      const { data: result, error } = await supabase.functions.invoke('generate-content', {
        body: {
          company_id: company.id,
          content_type: selectedContentType,
          topic: contentTopic,
          title: contentTitle,
          company_info: {
            name: company.company_name,
            industry: company.industry,
            description: company.description,
            target_customers: company.target_customers,
            key_differentiators: company.key_differentiators
          }
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        alert('Failed to generate content. Please try again.');
        return;
      }

      if (result?.content) {
        setGeneratedContent(result.content);
        console.log('Content generated successfully');
        alert('Your AI-optimized content is ready for review and publishing.');
      } else {
        throw new Error('No content returned from AI');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      alert('Content copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy content');
    }
  };

  const exportAsMarkdown = () => {
    const template = contentTemplates.find(t => t.id === selectedContentType);
    const title = contentTitle || `${template?.type} - ${contentTopic}`;
    const markdown = `# ${title}\n\n${generatedContent}`;
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Content exported as Markdown file!');
  };

  const saveToLibrary = () => {
    if (!generatedContent) return;
    
    const template = contentTemplates.find(t => t.id === selectedContentType);
    const title = contentTitle || `${template?.type} - ${contentTopic}`;
    
    const newContent: SavedContent = {
      id: Date.now().toString(),
      title,
      content: generatedContent,
      type: selectedContentType,
      createdAt: new Date().toISOString()
    };
    
    const updatedLibrary = [...contentLibrary, newContent];
    setContentLibrary(updatedLibrary);
    localStorage.setItem('content-library', JSON.stringify(updatedLibrary));
    
    alert('Content saved to library!');
  };

  const deleteFromLibrary = (id: string) => {
    const updatedLibrary = contentLibrary.filter(item => item.id !== id);
    setContentLibrary(updatedLibrary);
    localStorage.setItem('content-library', JSON.stringify(updatedLibrary));
    alert('Content deleted from library');
  };

  // Clean Header Component
  const CleanHeader = () => {
    const navItems = [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/geo', label: 'My GEO' },
      { path: '/competitors', label: 'Competitor Positioning' },
      { path: '/content', label: 'Content Assistant' }
    ];

    return (
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 16px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              padding: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Brain style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1a202c'
            }}>
              AI Visibility Hub
            </span>
          </div>

          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => window.location.href = item.path}
                style={{
                  padding: '8px 16px',
                  backgroundColor: window.location.pathname === item.path ? '#3b82f6' : 'transparent',
                  color: window.location.pathname === item.path ? 'white' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (window.location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.color = '#1e293b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (window.location.pathname !== item.path) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              {user?.email}
            </span>
          </div>
        </div>
      </header>
    );
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <CleanHeader />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <div style={{
              height: '32px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              width: '256px'
            }}></div>
            <div style={{
              height: '256px',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <CleanHeader />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px'
        }}>
          <div style={{
            textAlign: 'center',
            paddingTop: '80px',
            paddingBottom: '80px'
          }}>
            <div style={{
              fontSize: '64px',
              margin: '0 auto 16px',
              textAlign: 'center'
            }}>🎯</div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              No Company Profile Found
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '24px'
            }}>
              You need to set up your company profile first to access AI content generation.
            </p>
            <button
              onClick={() => window.location.href = '/geo'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Set Up Company Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <CleanHeader />
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '16px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '30px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Content Assistant
          </h1>
          <p style={{ color: '#6b7280' }}>
            Generate AI-optimized content that improves your visibility in AI responses
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '32px'
        }}>
          {/* Content Templates */}
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '24px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>✨</span>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Content Templates
                  </h3>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  Choose a content type optimized for AI visibility
                </p>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {contentTemplates.map((template) => {
                  const iconEmoji = template.icon;
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedContentType(template.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: selectedContentType === template.id 
                          ? '2px solid #3b82f6' 
                          : '1px solid #e5e7eb',
                        backgroundColor: selectedContentType === template.id 
                          ? '#eff6ff' 
                          : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedContentType !== template.id) {
                          e.currentTarget.style.borderColor = '#93c5fd';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedContentType !== template.id) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <span style={{
                          fontSize: '20px',
                          marginTop: '2px',
                          flexShrink: 0
                        }}>{iconEmoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            <h4 style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#1f2937'
                            }}>
                              {template.title}
                            </h4>
                            {template.aiOptimized && (
                              <span style={{
                                fontSize: '10px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '500'
                              }}>
                                AI Optimized
                              </span>
                            )}
                          </div>
                          <p style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            lineHeight: '1.4'
                          }}>
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Generation */}
          <div>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => setActiveTab('generate')}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: activeTab === 'generate' ? '#ffffff' : 'transparent',
                  color: activeTab === 'generate' ? '#1f2937' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'generate' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                }}
              >
                Generate Content
              </button>
              <button
                onClick={() => setActiveTab('library')}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: activeTab === 'library' ? '#ffffff' : 'transparent',
                  color: activeTab === 'library' ? '#1f2937' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'library' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
                }}
              >
                Content Library
              </button>
            </div>

            {activeTab === 'generate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Content Form */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '24px'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '8px'
                    }}>
                      AI Content Generator
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      Generate content optimized for AI training data inclusion
                    </p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        Content Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={contentTitle}
                        onChange={(e) => setContentTitle(e.target.value)}
                        placeholder="Enter a custom title"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        Content Type
                      </label>
                      <select
                        value={selectedContentType}
                        onChange={(e) => setSelectedContentType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: '#ffffff',
                          outline: 'none'
                        }}
                      >
                        {contentTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      Topic/Subject
                    </label>
                    <input
                      type="text"
                      value={contentTopic}
                      onChange={(e) => setContentTopic(e.target.value)}
                      placeholder="What topic should the content focus on?"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>

                  <button
                    onClick={generateContent}
                    disabled={!contentTopic.trim() || isGenerating}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      backgroundColor: (!contentTopic.trim() || isGenerating) ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: (!contentTopic.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <span style={{
                          fontSize: '16px',
                          display: 'inline-block',
                          animation: 'spin 1s linear infinite'
                        }}>⏰</span>
                        Generating Content...
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '16px' }}>⚡</span>
                        Generate AI-Optimized Content
                      </>
                    )}
                  </button>
                </div>

                {/* Generated Content */}
                {generatedContent && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '24px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#1f2937',
                          marginBottom: '8px'
                        }}>
                          Generated Content
                        </h3>
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          Content optimized for AI training data inclusion and improved visibility
                        </p>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        <span style={{ fontSize: '12px' }}>✅</span>
                        AI Optimized
                      </div>
                    </div>

                    <textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '256px',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        resize: 'vertical',
                        marginBottom: '16px'
                      }}
                    />

                    <div style={{
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        onClick={copyToClipboard}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Copy to Clipboard
                      </button>
                      <button
                        onClick={exportAsMarkdown}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'transparent',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Export as Markdown
                      </button>
                      <button
                        onClick={saveToLibrary}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        Save to Library
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'library' && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '8px'
                  }}>
                    Content Library
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    Your previously generated and saved content pieces
                  </p>
                </div>

                {contentLibrary.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    paddingTop: '32px',
                    paddingBottom: '32px',
                    color: '#9ca3af'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      margin: '0 auto 16px',
                      opacity: 0.5,
                      textAlign: 'center'
                    }}>📄</div>
                    <p style={{ marginBottom: '4px' }}>No saved content yet</p>
                    <p style={{ fontSize: '14px' }}>Generated content will appear here</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {contentLibrary.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          backgroundColor: '#f9fafb'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <div>
                            <h4 style={{
                              fontSize: '16px',
                              fontWeight: '500',
                              color: '#1f2937',
                              marginBottom: '4px'
                            }}>
                              {item.title}
                            </h4>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              <span>{contentTemplates.find(t => t.id === item.type)?.type}</span>
                              <span>•</span>
                              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteFromLibrary(item.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                        <p style={{
                          fontSize: '14px',
                          color: '#4b5563',
                          lineHeight: '1.5',
                          maxHeight: '60px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.content.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CleanContentPage;