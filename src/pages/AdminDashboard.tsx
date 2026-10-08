import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Header } from '@/components/Header';
import PremiumBackground from '@/components/PremiumBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useNews, useCreateNews, useUpdateNews, useDeleteNews, NewsPost, CreateNewsPost } from '@/hooks/useNews';
import { ChannelTag } from '@/lib/youtube';
import { Loader2, Plus, Pencil, Trash2, LogOut, Newspaper, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: news, isLoading: newsLoading } = useNews('all');
  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();

  // Form state
  const [formData, setFormData] = useState<CreateNewsPost>({
    title: '',
    content: '',
    image_url: '',
    channel_tag: 'marmegint',
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }
      setUser(session.user);
      setIsLoading(false);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/admin/login');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image_url: '',
      channel_tag: 'marmegint',
    });
    setEditingPost(null);
    setIsFormOpen(false);
  };

  const handleEdit = (post: NewsPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      image_url: post.image_url || '',
      channel_tag: post.channel_tag,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Hiba',
        description: 'A cím és a tartalom megadása kötelező!',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingPost) {
        await updateNews.mutateAsync({
          id: editingPost.id,
          ...formData,
          image_url: formData.image_url || undefined,
        });
        toast({
          title: 'Sikeres mentés!',
          description: 'A hír frissítve lett.',
        });
      } else {
        await createNews.mutateAsync({
          ...formData,
          image_url: formData.image_url || undefined,
        });
        toast({
          title: 'Sikeres létrehozás!',
          description: 'Az új hír létrejött.',
        });
      }
      resetForm();
    } catch (error: any) {
      console.error('Error saving news:', error);
      toast({
        title: 'Hiba',
        description: error.message || 'Nem sikerült menteni a hírt.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a hírt?')) return;
    
    try {
      await deleteNews.mutateAsync(id);
      toast({
        title: 'Törölve!',
        description: 'A hír sikeresen törölve lett.',
      });
    } catch (error: any) {
      console.error('Error deleting news:', error);
      toast({
        title: 'Hiba',
        description: error.message || 'Nem sikerült törölni a hírt.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <PremiumBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <PremiumBackground />
      <Header showBack />
      
      <main className="relative z-10 pt-20 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-accent text-accent-foreground mb-6">
              <Shield className="w-4 h-4" />
              <span>ADMIN</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gradient mb-4">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Bejelentkezve: {user?.email}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-8 animate-fade-in">
            <Button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="gap-2 rounded-full"
            >
              <Plus className="w-4 h-4" />
              Új hír
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2 rounded-full">
              <LogOut className="w-4 h-4" />
              Kijelentkezés
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            {isFormOpen && (
              <div className="lg:col-span-1 premium-glass p-6 animate-fade-in">
                <h2 className="text-xl font-bold text-gradient mb-2">
                  {editingPost ? 'Hír szerkesztése' : 'Új hír'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {editingPost ? 'Módosítsd a hír adatait' : 'Hozz létre egy új hírt'}
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Cím *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Hír címe"
                      required
                      className="bg-accent/50 border-border/20 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Tartalom *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Hír tartalma..."
                      rows={5}
                      required
                      className="bg-accent/50 border-border/20 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Kép URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                      className="bg-accent/50 border-border/20 rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="channel">Csatorna *</Label>
                    <Select
                      value={formData.channel_tag}
                      onValueChange={(value: ChannelTag) => setFormData({ ...formData, channel_tag: value })}
                    >
                      <SelectTrigger className="bg-accent/50 border-border/20 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marmegint">Már megint?</SelectItem>
                        <SelectItem value="marmegint_jatszunk">Már megint játszunk?</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 rounded-xl transition-all duration-350 hover:scale-[1.02] active:scale-95" disabled={createNews.isPending || updateNews.isPending}>
                      {(createNews.isPending || updateNews.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingPost ? 'Mentés' : 'Létrehozás'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl transition-all duration-350 hover:scale-[1.02] active:scale-95">
                      Mégse
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* News List */}
            <div className={isFormOpen ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <h2 className="text-xl font-bold text-gradient mb-4">Hírek ({news?.length || 0})</h2>
              
              {newsLoading ? (
                <div className="premium-glass flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : news && news.length > 0 ? (
                <div className="space-y-4">
                  {news.map((post, idx) => (
                    <div 
                      key={post.id} 
                      className="premium-glass p-4 animate-fade-in-up"
                      style={{ animationDelay: `${0.05 * idx}s` }}
                    >
                      <div className="flex gap-4">
                        {post.image_url && (
                          <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0">
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold line-clamp-1">{post.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">{post.content}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(post)}
                                className="rounded-xl"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(post.id)}
                                disabled={deleteNews.isPending}
                                className="rounded-xl"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full',
                              post.channel_tag === 'marmegint' 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-secondary/20 text-secondary'
                            )}>
                              {post.channel_tag === 'marmegint' ? 'Már megint?' : 'Már megint játszunk?'}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: hu })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-glass text-center py-12 text-muted-foreground">
                  <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Még nincsenek hírek</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;