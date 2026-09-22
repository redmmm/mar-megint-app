import React, { useEffect, useState } from 'react';
import { Spot, UpdateSpotInput, SpotType } from '@/types/spot';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  getSpots,
  approveSpot,
  deleteSpot,
  updateSpot,
  uploadSpotImage,
  syncLocalSpotsToSupabase,
  dismissSpotReport,
} from '@/services/spotService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle,
  Trash2,
  Edit,
  Clock,
  MapPin,
  Upload,
  X,
  Plus,
  RefreshCw,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminMiniMap } from './AdminMiniMap';

const AVAILABLE_FEATURES = [
  { id: 'rail', label: 'Korlát', emoji: '🦯' },
  { id: 'ledge', label: 'Padka', emoji: '🧱' },
  { id: 'stairs', label: 'Lépcső', emoji: '🪜' },
  { id: 'gap', label: 'Gap', emoji: '🕳️' },
  { id: 'flatground', label: 'Flatground', emoji: '🛹' },
];

export const AdminSkateMapTab: React.FC = () => {
  const [pendingSpots, setPendingSpots] = useState<Spot[]>([]);
  const [approvedSpots, setApprovedSpots] = useState<Spot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [approvedFilter, setApprovedFilter] = useState<'all' | 'reported'>('all');

  // Edit dialog state
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    spot_type: 'street_spot' as SpotType,
    features: [] as string[],
    latitude: 47.6875,
    longitude: 17.6504,
    images: [] as string[],
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadAllSpots = async () => {
    setIsLoading(true);
    try {
      const synced = await syncLocalSpotsToSupabase();
      if (synced > 0) {
        toast.success(`${synced} korábbi helyi spot szinkronizálva a felhőbe!`);
      }
      const [pending, approved] = await Promise.all([
        getSpots('pending'),
        getSpots('approved'),
      ]);
      setPendingSpots(pending);
      setApprovedSpots(approved);
    } catch (err) {
      console.error('Error loading admin spots:', err);
      toast.error('Nem sikerült betölteni a spotokat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSpots();

    const channel = supabase
      .channel('admin-skatemap-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spots' },
        () => {
          loadAllSpots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await approveSpot(id);
      toast.success('Spot jóváhagyva! Mostantól megjelenik a nyilvános térképen.');
      loadAllSpots();
    } catch (err) {
      console.error('Approve error:', err);
      toast.error('Hiba történt a jóváhagyás során.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, isPending: boolean) => {
    if (!confirm(`Biztosan törölni szeretnéd ezt a ${isPending ? 'beküldést' : 'spotot'}?`)) {
      return;
    }

    setActionLoadingId(id);
    try {
      await deleteSpot(id);
      toast.success(isPending ? 'Beküldés elutasítva és törölve.' : 'Spot sikeresen törölve.');
      loadAllSpots();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Hiba történt a törlés során.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismissReport = async (id: string) => {
    setActionLoadingId(id);
    try {
      await dismissSpotReport(id);
      toast.success('Bejelentés sikeresen törölve / feloldva!');
      loadAllSpots();
    } catch (err) {
      console.error('Dismiss report error:', err);
      toast.error('Hiba történt a bejelentés feloldása során.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openEditDialog = (spot: Spot) => {
    setEditingSpot(spot);
    setEditFormData({
      title: spot.title,
      description: spot.description || '',
      spot_type: spot.spot_type || 'street_spot',
      features: [...(spot.features || [])],
      latitude: spot.latitude,
      longitude: spot.longitude,
      images: [...(spot.images || [])],
    });
    setIsEditDialogOpen(true);
  };

  const toggleEditFeature = (featId: string) => {
    setEditFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featId)
        ? prev.features.filter((id) => id !== featId)
        : [...prev.features, featId],
    }));
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const newUrls: string[] = [];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error('Csak képfájlokat lehet feltölteni.');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`A(z) "${file.name}" túl nagy! Maximum 10 MB engedélyezett.`);
          continue;
        }
        const url = await uploadSpotImage(file);
        newUrls.push(url);
      }
      setEditFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newUrls],
      }));
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast.error(err?.message || 'Nem sikerült feltölteni a képet.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpot) return;

    setIsSavingEdit(true);
    try {
      await updateSpot(editingSpot.id, {
        title: editFormData.title.trim(),
        description: editFormData.description.trim() || undefined,
        spot_type: editFormData.spot_type,
        features: editFormData.spot_type === 'street_spot' ? editFormData.features : [],
        latitude: editFormData.latitude,
        longitude: editFormData.longitude,
        images: editFormData.images,
      });

      toast.success('Spot módosításai mentve!');
      setIsEditDialogOpen(false);
      setEditingSpot(null);
      loadAllSpots();
    } catch (err) {
      console.error('Save edit error:', err);
      toast.error('Hiba történt a mentés során.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Győri Skatemap Kezelése
            {pendingSpots.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                {pendingSpots.length} új beküldés
              </Badge>
            )}
          </h2>
          <p className="text-xs text-neutral-400">
            Jóváhagyásra váró és aktív győri skate spotok adminisztrációja
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAllSpots}
          disabled={isLoading}
          className="gap-1.5 border-white/10 hover:bg-white/5 text-xs text-neutral-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Frissítés
        </Button>
      </div>

      {/* Tabs for Pending vs Approved */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-white/[0.04] border border-white/10 p-1">
          <TabsTrigger value="pending" className="gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Jóváhagyásra Váró ({pendingSpots.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2 text-xs">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Jóváhagyott Spotok ({approvedSpots.length})
            {approvedSpots.filter((s) => s.is_reported).length > 0 && (
              <Badge className="ml-1 bg-red-600 text-white border-red-500 text-[10px] font-bold px-1.5 py-0 shadow-sm">
                <AlertTriangle className="w-2.5 h-2.5 mr-1 text-white" />
                {approvedSpots.filter((s) => s.is_reported).length} bejelentve
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. Pending Review Queue */}
        <TabsContent value="pending" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : pendingSpots.length === 0 ? (
            <Card className="premium-glass border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400/40 mb-3" />
                <p className="text-base font-semibold text-white">Nincs jóváhagyásra váró spot!</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Minden beküldött spot ellenőrizve lett.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {pendingSpots.map((spot) => (
                <Card
                  key={spot.id}
                  className="premium-glass border-amber-500/20 bg-neutral-900/60 overflow-hidden flex flex-col"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                            Függőben lévő beküldés
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              spot.spot_type === 'skatepark'
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : spot.spot_type === 'skateshop'
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            )}
                          >
                            {spot.spot_type === 'skatepark' ? '🛹 Skatepark' : spot.spot_type === 'skateshop' ? '🏪 Skateshop' : '🏙️ Street spot'}
                          </Badge>
                          {spot.features && spot.features.map(f => (
                            <Badge key={f} variant="outline" className="text-[10px] text-neutral-300 border-white/10">
                              {f}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-lg font-bold text-white">
                          {spot.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-neutral-400">
                          Beküldve: {new Date(spot.created_at).toLocaleString('hu-HU')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Description */}
                      <p className="text-xs text-neutral-300 bg-white/[0.03] p-3 rounded-lg border border-white/5 leading-relaxed">
                        {spot.description || 'Nincs megadott leírás.'}
                      </p>

                      {/* Submitted Images */}
                      {spot.images && spot.images.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-semibold text-neutral-400">
                            Beküldött képek ({spot.images.length})
                          </Label>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {spot.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Spot ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-white/10 shrink-0"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mini-map preview */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="uppercase font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" /> Helyszín előnézet
                          </span>
                          <span className="font-mono">
                            {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                          </span>
                        </div>
                        <AdminMiniMap
                          lat={spot.latitude}
                          lng={spot.longitude}
                          title={spot.title}
                          className="h-32 w-full"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(spot.id)}
                        disabled={actionLoadingId === spot.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5"
                      >
                        {actionLoadingId === spot.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        Jóváhagyás
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(spot.id, true)}
                        disabled={actionLoadingId === spot.id}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Elutasítás & Törlés
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 2. Approved Spots Management */}
        <TabsContent value="approved" className="mt-6 space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setApprovedFilter('all')}
                className={cn(
                  "h-7 px-3 text-xs rounded-lg transition-all",
                  approvedFilter === 'all'
                    ? "bg-white/10 text-white font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                Összes ({approvedSpots.length})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setApprovedFilter('reported')}
                className={cn(
                  "h-7 px-3 text-xs rounded-lg gap-1.5 transition-all font-semibold",
                  approvedFilter === 'reported'
                    ? "bg-red-600 text-white shadow-sm"
                    : approvedSpots.some((s) => s.is_reported)
                    ? "text-red-400 hover:text-white hover:bg-red-600/20 border border-red-500/40"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "w-3.5 h-3.5",
                    approvedFilter === 'reported'
                      ? "text-white"
                      : approvedSpots.some((s) => s.is_reported)
                      ? "text-red-400"
                      : "text-neutral-400"
                  )}
                />
                Bejelentett ({approvedSpots.filter((s) => s.is_reported).length})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : approvedSpots.length === 0 ? (
            <Card className="premium-glass border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-base font-semibold text-white">Nincs még jóváhagyott spot.</p>
              </CardContent>
            </Card>
          ) : approvedFilter === 'reported' && approvedSpots.filter((s) => s.is_reported).length === 0 ? (
            <Card className="premium-glass border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400/50 mb-2" />
                <p className="text-base font-semibold text-white">Nincs bejelentett spot!</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Egyetlen jóváhagyott spothoz sincs aktív hibabejelentés.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(approvedFilter === 'reported'
                ? approvedSpots.filter((s) => s.is_reported)
                : approvedSpots
              ).map((spot) => (
                <Card
                  key={spot.id}
                  className={cn(
                    "premium-glass flex flex-col justify-between overflow-hidden transition-all",
                    spot.is_reported
                      ? "border-2 border-red-500/70 bg-neutral-900/90 shadow-[0_0_20px_rgba(239,68,68,0.12)]"
                      : "border-white/10 bg-neutral-900/40"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-white">
                          {spot.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5 my-1.5">
                          {spot.is_reported && (
                            <Badge className="bg-red-500/20 text-red-400 border border-red-500/50 text-[10px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              BEJELENTVE
                            </Badge>
                          )}
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                            {spot.spot_type === 'skatepark' ? '🛹 Skatepark' : spot.spot_type === 'skateshop' ? '🏪 Skateshop' : '🏙️ Street spot'}
                          </Badge>
                          {spot.features && spot.features.map((f) => (
                            <Badge key={f} variant="outline" className="text-[10px] text-neutral-300 border-white/10">
                              {f}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono mt-1">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>
                            {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] font-bold",
                          spot.is_reported
                            ? "bg-red-600 text-white border-red-500 shadow-sm"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        )}
                      >
                        {spot.is_reported ? 'BEJELENTETT' : 'Aktív'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Reported Issue Alert Box: High-contrast, clean & clearly legible */}
                    {spot.is_reported && (
                      <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/50 text-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-400 flex items-center gap-1.5 text-xs">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            BEJELENTETT HIBA / INDOKLÁS:
                          </span>
                          {spot.reported_at && (
                            <span className="text-[11px] text-neutral-300 font-mono">
                              {new Date(spot.reported_at).toLocaleString('hu-HU')}
                            </span>
                          )}
                        </div>
                        <div className="bg-neutral-950/80 p-3 rounded-lg border border-red-500/30">
                          <p className="text-neutral-100 text-xs font-medium leading-relaxed break-words whitespace-pre-wrap">
                            {spot.report_reason}
                          </p>
                        </div>
                        <div className="flex items-center justify-end pt-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismissReport(spot.id)}
                            disabled={actionLoadingId === spot.id}
                            className="h-7 text-xs font-semibold border-red-500/40 text-red-300 hover:text-white hover:bg-red-600/30 gap-1.5 cursor-pointer transition-colors"
                          >
                            {actionLoadingId === spot.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3 text-emerald-400" />
                            )}
                            Bejelentés feloldása (Megoldva / Alaptalan)
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-neutral-300 line-clamp-2">
                      {spot.description || 'Nincs leírás megadva.'}
                    </p>

                    {spot.images && spot.images.length > 0 && (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                        <img
                          src={spot.images[0]}
                          alt={spot.title}
                          className="w-full h-full object-cover"
                        />
                        {spot.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] text-white font-medium">
                            +{spot.images.length - 1} kép
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(spot)}
                        className="flex-1 border-white/10 hover:bg-white/5 text-xs gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5 text-neutral-300" />
                        Szerkesztés
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(spot.id, false)}
                        disabled={actionLoadingId === spot.id}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs px-2.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Spot Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl border border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Spot Szerkesztése</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Módosítsd a spot adatait, koordinátáit és fotóit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-neutral-300">Spot Neve</Label>
              <Input
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="bg-white/[0.04] border-white/10 text-white"
                required
              />
            </div>

            {/* Spot Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-neutral-300">
                Spot Típusa
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, spot_type: 'skatepark' }))}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all text-center",
                    editFormData.spot_type === 'skatepark'
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg"
                      : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06]"
                  )}
                >
                  <span className="text-base">🛹</span> Skatepark
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, spot_type: 'street_spot' }))}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all text-center",
                    editFormData.spot_type === 'street_spot'
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg"
                      : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06]"
                  )}
                >
                  <span className="text-base">🏙️</span> Street
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormData(prev => ({ ...prev, spot_type: 'skateshop' }))}
                  className={cn(
                    "flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all text-center",
                    editFormData.spot_type === 'skateshop'
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg"
                      : "bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06]"
                  )}
                >
                  <span className="text-base">🏪</span> Skateshop
                </button>
              </div>
            </div>

            {/* Street Spot Features (Child Category) */}
            {editFormData.spot_type === 'street_spot' && (
              <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <Label className="text-xs font-semibold uppercase text-neutral-300">
                  Található elemek a spoton
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {AVAILABLE_FEATURES.map((feat) => {
                    const isSelected = editFormData.features.includes(feat.id);
                    return (
                      <button
                        key={feat.id}
                        type="button"
                        onClick={() => toggleEditFeature(feat.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-medium transition-all text-center",
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 font-semibold"
                            : "bg-white/[0.03] border-white/10 text-neutral-400 hover:text-neutral-200"
                        )}
                      >
                        <span>{feat.emoji}</span>
                        <span>{feat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-neutral-300">Leírás</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                className="bg-white/[0.04] border-white/10 text-white resize-none"
              />
            </div>

            {/* Coordinates + Draggable MiniMap */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-neutral-300">
                Koordináták (Húzd el a jelölőt a térképen vagy módosítsd közvetlenül)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="any"
                  value={editFormData.latitude}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      latitude: parseFloat(e.target.value) || prev.latitude,
                    }))
                  }
                  className="bg-white/[0.04] border-white/10 font-mono text-xs text-white"
                  placeholder="Szélesség"
                  required
                />
                <Input
                  type="number"
                  step="any"
                  value={editFormData.longitude}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      longitude: parseFloat(e.target.value) || prev.longitude,
                    }))
                  }
                  className="bg-white/[0.04] border-white/10 font-mono text-xs text-white"
                  placeholder="Hosszúság"
                  required
                />
              </div>
              <AdminMiniMap
                lat={editFormData.latitude}
                lng={editFormData.longitude}
                isDraggable={true}
                onPositionChange={(lat, lng) => {
                  setEditFormData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                  }));
                }}
                className="h-36 w-full"
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-neutral-300 flex justify-between items-center">
                <span>Fotók kezelése</span>
                <span className="text-[10px] text-neutral-400">
                  {editFormData.images.length} kép
                </span>
              </Label>

              {editFormData.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {editFormData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
                    >
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveEditImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer text-xs text-neutral-300">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{isUploadingImage ? 'Feltöltés...' : 'Új kép hozzáadása'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditImageUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-white/10"
              >
                Mégse
              </Button>
              <Button
                type="submit"
                disabled={isSavingEdit || isUploadingImage}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Mentés...
                  </>
                ) : (
                  'Módosítások mentése'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
