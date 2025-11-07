import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BookOpen, MessageSquare, BarChart3, GraduationCap, Plus, Search, Edit, Trash2, TrendingUp } from "lucide-react";

export default function KnowledgeBank() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch knowledge articles
  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["knowledge-articles", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("knowledge_articles")
        .select("*")
        .order("priority", { ascending: false });
      
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch quick replies
  const { data: quickReplies, isLoading: repliesLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_quick_replies")
        .select("*")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ["conversation-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversation_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Delete article mutation
  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_articles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      toast.success("Article deleted successfully");
    },
  });

  // Toggle article active status
  const toggleArticle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("knowledge_articles")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      toast.success("Article updated");
    },
  });

  const filteredArticles = articles?.filter((article) =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ["all", "getting_started", "homeowners", "providers", "troubleshooting", "features", "billing", "technical"];

  // Calculate analytics metrics
  const totalConversations = analytics?.length || 0;
  const resolvedConversations = analytics?.filter((a) => a.resolved).length || 0;
  const resolutionRate = totalConversations > 0 ? ((resolvedConversations / totalConversations) * 100).toFixed(1) : "0";
  const avgFeedback = analytics?.filter((a) => a.feedback_score).reduce((acc, a) => acc + (a.feedback_score || 0), 0) / (analytics?.filter((a) => a.feedback_score).length || 1);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Bank</h1>
          <p className="text-muted-foreground">Manage AI knowledge articles, quick replies, and training data</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Knowledge Article</DialogTitle>
            </DialogHeader>
            <ArticleForm />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="articles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="replies" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Quick Replies
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Training
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace("_", " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {articlesLoading ? (
            <div className="text-center py-8">Loading articles...</div>
          ) : (
            <div className="grid gap-4">
              {filteredArticles?.map((article) => (
                <Card key={article.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {article.title}
                          <Badge variant={article.is_active ? "default" : "secondary"}>
                            {article.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">Priority {article.priority}</Badge>
                        </CardTitle>
                        <CardDescription>
                          Category: {article.category} • Views: {article.view_count} • Used: {article.usage_count} times
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Switch
                          checked={article.is_active}
                          onCheckedChange={(checked) =>
                            toggleArticle.mutate({ id: article.id, is_active: checked })
                          }
                        />
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteArticle.mutate(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {article.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Quick Replies Tab */}
        <TabsContent value="replies" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Quick Reply
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Quick Reply</DialogTitle>
                </DialogHeader>
                <QuickReplyForm />
              </DialogContent>
            </Dialog>
          </div>

          {repliesLoading ? (
            <div className="text-center py-8">Loading quick replies...</div>
          ) : (
            <div className="grid gap-4">
              {quickReplies?.map((reply) => (
                <Card key={reply.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {reply.category}
                          <Badge variant={reply.is_active ? "default" : "secondary"}>
                            {reply.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">Used {reply.use_count} times</Badge>
                        </CardTitle>
                        <CardDescription>
                          Keywords: {reply.trigger_keywords?.join(", ")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{reply.response_text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalConversations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolutionRate}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Feedback</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgFeedback.toFixed(1)} / 5</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Articles Used</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.reduce((acc, a) => acc + (a.knowledge_articles_used?.length || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.slice(0, 10).map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between border-b pb-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{conv.conversation_topic || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.message_count} messages • {conv.user_role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {conv.resolved && <Badge variant="default">Resolved</Badge>}
                      {conv.feedback_score && (
                        <Badge variant="outline">{conv.feedback_score}/5</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Training Examples</CardTitle>
              <CardDescription>
                Review and improve AI responses based on user feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ArticleForm() {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "getting_started",
    tags: "",
    priority: "5",
  });
  const queryClient = useQueryClient();

  const createArticle = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("knowledge_articles").insert({
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
        priority: parseInt(data.priority),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      toast.success("Article created successfully");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createArticle.mutate(formData);
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={6}
          required
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
            <SelectItem value="getting_started">Getting Started</SelectItem>
            <SelectItem value="homeowners">Homeowners</SelectItem>
            <SelectItem value="providers">Providers</SelectItem>
            <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
            <SelectItem value="features">Features</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="booking, scheduling, payment"
        />
      </div>
      <div>
        <Label htmlFor="priority">Priority (1-10)</Label>
        <Input
          id="priority"
          type="number"
          min="1"
          max="10"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full">
        Create Article
      </Button>
    </form>
  );
}

function QuickReplyForm() {
  const [formData, setFormData] = useState({
    keywords: "",
    response: "",
    category: "general",
    priority: "5",
  });
  const queryClient = useQueryClient();

  const createReply = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("ai_quick_replies").insert({
        trigger_keywords: data.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        response_text: data.response,
        category: data.category,
        priority: parseInt(data.priority),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      toast.success("Quick reply created successfully");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createReply.mutate(formData);
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="keywords">Trigger Keywords (comma-separated)</Label>
        <Input
          id="keywords"
          value={formData.keywords}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="help, support, contact"
          required
        />
      </div>
      <div>
        <Label htmlFor="response">Response Text</Label>
        <Textarea
          id="response"
          value={formData.response}
          onChange={(e) => setFormData({ ...formData, response: e.target.value })}
          rows={4}
          required
        />
      </div>
      <div>
        <Label htmlFor="reply-category">Category</Label>
        <Input
          id="reply-category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="reply-priority">Priority (1-10)</Label>
        <Input
          id="reply-priority"
          type="number"
          min="1"
          max="10"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full">
        Create Quick Reply
      </Button>
    </form>
  );
}
