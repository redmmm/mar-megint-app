import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getNews, addNews, updateNews, deleteNews, type NewsPost, type CreateNewsPost } from '@/services/newsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Edit, Trash2, LogOut, Newspaper, Map } from 'lucide-react';
import { Header } from '@/components/Header';
import { AdminSkateMapTab } from '@/components/admin/AdminSkateMapTab';

interface AdminProps {
  defaultTab?: 'news' | 'skatemap';
}

const Admin = ({ defaultTab }: AdminProps) => {
  const location = useLocation();
  const initialTab = defaultTab || (location.pathname.includes('skatemap') ? 'skatemap' : 'news');
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const [user, setUser] = useState<any>(null);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    category: 'marmegint' as 'marmegint' | 'jatszunk'
  });

  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      loadNews();
    };

    checkAuth();
  }, [navigate]);

  const loadNews = async () => {
    setIsLoading(true);
    const newsData = await getNews('all');
    setNews(newsData);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image_url: '',
      category: 'marmegint'
    });
    setEditingPost(null);
  };

  const openDialog = (post?: NewsPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content,
        image_url: post.image_url || '',
        category: post.category
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingPost) {
        // Update existing post
        const result = await updateNews({
          id: editingPost.id,
          ...formData
        });

        if (result) {
          setSuccess('News post updated successfully!');
          loadNews();
          closeDialog();
        } else {
          setError('Failed to update news post');
        }
      } else {
        // Create new post
        const result = await addNews(formData);

        if (result) {
          setSuccess('News post created successfully!');
          loadNews();
          closeDialog();
        } else {
          setError('Failed to create news post');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news post?')) return;

    const success = await deleteNews(id);
    if (success) {
      setSuccess('News post deleted successfully!');
      loadNews();
    } else {
      setError('Failed to delete news post');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/80" />
      </div>

      <Header showBack={false} />

      <main className="relative z-10 pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gradient mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Kezeld a csatorna híreket és a Győri Skatemap spotokat</p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'news' && (
                <Button onClick={() => openDialog()} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add News
                </Button>
              )}
              <Button variant="outline" onClick={handleLogout} className="gap-2 border-white/10">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/[0.04] border border-white/10 p-1 mb-8">
              <TabsTrigger value="news" className="gap-2 px-6">
                <Newspaper className="w-4 h-4 text-primary" />
                Hírek kezelése
              </TabsTrigger>
              <TabsTrigger value="skatemap" className="gap-2 px-6">
                <Map className="w-4 h-4 text-emerald-400" />
                Győri Skatemap
              </TabsTrigger>
            </TabsList>

            {/* News Tab Content */}
            <TabsContent value="news" className="space-y-6">
              {/* Messages */}
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="mb-6">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* News List */}
              <div className="grid gap-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : news.length === 0 ? (
                  <Card className="premium-glass">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Newspaper className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No news posts yet</p>
                      <Button onClick={() => openDialog()} className="mt-4 gap-2">
                        <Plus className="w-4 h-4" />
                        Create First Post
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  news.map((post) => (
                    <Card key={post.id} className="premium-glass">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                post.category === 'marmegint'
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-secondary/20 text-secondary'
                              }`}>
                                {post.category === 'marmegint' ? 'Már megint?' : 'Már megint játszunk?'}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                            <p className="text-muted-foreground line-clamp-2">{post.content}</p>
                            {post.image_url && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Image: {post.image_url}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(post)}
                              className="gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(post.id)}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Skatemap Tab Content */}
            <TabsContent value="skatemap">
              <AdminSkateMapTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? 'Edit News Post' : 'Add News Post'}
            </DialogTitle>
            <DialogDescription>
              {editingPost ? 'Update the news post details.' : 'Create a new news post for your channel.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter news title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter news content"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: 'marmegint' | 'jatszunk') =>
                  setFormData(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marmegint">Már megint?</SelectItem>
                  <SelectItem value="jatszunk">Már megint játszunk?</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingPost ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingPost ? 'Update Post' : 'Create Post'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
