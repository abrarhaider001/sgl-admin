import React, { useEffect, useState } from 'react';
import { Pack, UpdatePackRequest } from '@/types/pack';
import firebasePackService from '@/services/firebasePackService';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageUploadResult } from '@/services/imageService';
import { Album } from '@/types/album';
import { firebaseAlbumService } from '@/services/firebaseAlbumService';

interface Props {
  open: boolean;
  pack: Pack | null;
  onClose: () => void;
}

export default function PackEditModal({ open, pack, onClose }: Props) {
  const [form, setForm] = useState<UpdatePackRequest>({ packId: '' });
  const [saving, setSaving] = useState(false);
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    if (pack) {
      setForm({
        packId: pack.packId,
        name: pack.name,
        description: pack.description,
        price: pack.price,
        rarity: pack.rarity as any,
        stockNo: pack.stockNo,
        image: pack.image,
        isFeatured: pack.isFeatured,
        linkedAlbum: pack.linkedAlbum || '',
      });
    }
  }, [pack]);

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const response = await firebaseAlbumService.getAlbums();
        if (response.success && response.albums) {
          const byName = [...response.albums].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setAlbums(byName);
        }
      } catch (err) {
        console.error('Error loading albums for pack editing:', err);
      }
    };
    if (open) {
      loadAlbums();
    }
  }, [open]);

  if (!open || !pack) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name } = target as { name: keyof UpdatePackRequest };
    const value = (target as HTMLInputElement).type === 'checkbox'
      ? (target as HTMLInputElement).checked
      : (name === 'price' ? Number((target as HTMLInputElement).value) : (target as HTMLInputElement).value);

    setForm((f) => ({
      ...f,
      [name]: value as any,
    }));
  };

  const handleSave = async () => {
    if (!form.packId) return;
    try {
      setSaving(true);
      await firebasePackService.updatePack(form.packId, form);
      onClose();
    } catch (err) {
      console.error('Update pack failed', err);
      alert('Failed to update pack');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Pack</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input name="name" value={form.name || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Stock No</label>
            <input name="stockNo" value={form.stockNo || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Price</label>
            <input name="price" type="number" value={form.price ?? 0} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rarity</label>
            <select name="rarity" value={form.rarity || 'common'} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <input
              id="isFeatured"
              name="isFeatured"
              type="checkbox"
              checked={!!form.isFeatured}
              onChange={handleChange}
              className="h-4 w-4 border rounded"
            />
            <label htmlFor="isFeatured" className="text-sm text-gray-700">Featured</label>
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">Linked Album</label>
            <select
              name="linkedAlbum"
              value={form.linkedAlbum || ''}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">No Album</option>
              {albums.map((album) => (
                <option key={album.albumId} value={album.albumId}>{album.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">Pack Image</label>
            <ImageUpload
              value={form.image || ''}
              context="pack"
              onChange={(res) => {
                setImageUploadResult(res);
                setForm((f) => ({ ...f, image: res?.url || '' }));
              }}
              showPreview
              dragAndDrop
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">Description</label>
            <input name="description" value={form.description || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white rounded py-2 disabled:opacity-50">Save</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 rounded py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}