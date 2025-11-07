import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, BookOpen, Zap, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const categories = [
  { value: 'getting_started', label: 'Getting Started' },
  { value: 'homeowners', label: 'Homeowners' },
  { value: 'providers', label: 'Providers' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'features', label: 'Features' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' }
];

export default function KnowledgeBank() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "getting_started",
    tags: "",
    priority: 0
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['knowledge-articles', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_knowledge_articles', {
        search_query: searchQuery || '',
        max_results: 100
      });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: quickReplies = [] } = useQuery({
    queryKey: ['ai-quick-replies'],
    queryFn: async () => {
      const { data } = await supabase.rpc('exec_sql', { 
        sql: 'SELECT * FROM ai_quick_replies ORDER BY priority DESC' 
      });
      return data || [];
    }
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ['ai-analytics'],
    queryFn: async () => {
      const { data } = await supabase.rpc('exec_sql', {
        sql: 'SELECT * FROM ai_conversation_analytics ORDER BY created_at DESC LIMIT 100'
      });
      return data || [];
    }
  });

  const createArticleMutation = useMutation({
    mutationFn: async (article: any) => {
      const tags = article.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/knowledge_articles`, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ ...article, tags })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success("Article created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ title: "", content: "", category: "getting_started", tags: "", priority: 0 });
    },
    onError: () => toast.error("Failed to create article")
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, ...article }: any) => {
      const { error } = await supabase
        .from('knowledge_articles')
        .update({
          title: article.title,
          content: article.content,
          category: article.category,
          tags: article.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          priority: article.priority
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success("Article updated successfully");
      setEditingArticle(null);
    },
    onError: () => toast.error("Failed to update article")
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success("Article deleted successfully");
    },
    onError: () => toast.error("Failed to delete article")
  });

  const handleSubmit = () => {
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, ...formData });
    } else {
      createArticleMutation.mutate(formData);
    }
  };

  const handleEdit = (article: any) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags?.join(', ') || '',
      priority: article.priority
    });
    setIsCreateDialogOpen(true);
  };

  const ArticleForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="How to create a booking"
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="booking, scheduling, calendar"
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority (0-10)</Label>
        <Input
          id="priority"
          type="number"
          min="0"
          max="10"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Detailed explanation..."
          className="min-h-[200px]"
        />
      </div>

      <Button onClick={handleSubmit} className="w-full">
        {editingArticle ? 'Update Article' : 'Create Article'}
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Knowledge Bank</h1>
          <p className="text-muted-foreground">Train HomeBase AI with curated knowledge</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingArticle(null);
              setFormData({ title: "", content: "", category: "getting_started", tags: "", priority: 0 });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
              <DialogDescription>
                Add knowledge that HomeBase AI can use to help users
              </DialogDescription>
            </DialogHeader>
            <ArticleForm />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList>
          <TabsTrigger value="articles">
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge Articles
          </TabsTrigger>
          <TabsTrigger value="quick-replies">
            <Zap className="h-4 w-4 mr-2" />
            Quick Replies
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <Card><CardContent className="p-6">Loading...</CardContent></Card>
            ) : articles.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No articles found. Create your first knowledge article!
                </CardContent>
              </Card>
            ) : (
              articles.map((article: any) => (
                <Card key={article.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{article.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="secondary">{categories.find(c => c.value === article.category)?.label}</Badge>
                          {article.tags?.map((tag: string) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteArticleMutation.mutate(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {article.content}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Priority: {article.priority}</span>
                      <span>Views: {article.view_count}</span>
                      <span>Helpful: {article.helpful_count}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="quick-replies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Replies</CardTitle>
              <CardDescription>Pre-configured responses for common queries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quickReplies.length === 0 ? (
                  <p className="text-center text-muted-foreground">No quick replies configured yet</p>
                ) : (
                  quickReplies.map((reply: any) => (
                    <div key={reply.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            {reply.trigger_keywords?.map((kw: string) => (
                              <Badge key={kw} variant="outline">{kw}</Badge>
                            ))}
                          </div>
                          <p className="text-sm">{reply.response_text}</p>
                          <p className="text-xs text-muted-foreground">
                            Used {reply.use_count} times • {reply.category}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{analytics.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {analytics.filter((a: any) => a.resolved).length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escalated</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {analytics.filter((a: any) => a.escalated_to_human).length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {Math.round(
                    analytics.reduce((sum: number, a: any) => sum + (a.average_response_time_ms || 0), 0) / 
                    (analytics.length || 1)
                  )}ms
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.slice(0, 10).map((session: any) => (
                  <div key={session.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.resolved ? "default" : "secondary"}>
                            {session.resolved ? 'Resolved' : 'Ongoing'}
                          </Badge>
                          <Badge variant="outline">{session.user_role}</Badge>
                          {session.sentiment && (
                            <Badge variant={
                              session.sentiment === 'positive' ? 'default' :
                              session.sentiment === 'frustrated' ? 'destructive' : 'secondary'
                            }>
                              {session.sentiment}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.message_count} messages • {session.tools_used?.length || 0} tools used
                        </p>
                        {session.conversation_summary && (
                          <p className="text-sm mt-2">{session.conversation_summary}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}