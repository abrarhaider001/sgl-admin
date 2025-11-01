import React, { useEffect, useState } from 'react';
import { CreatePackRequest } from '@/types/pack';
import firebasePackService from '@/services/firebasePackService';
import ImageUpload from '@/components/ui/ImageUpload';
import { ImageUploadResult } from '@/services/imageService';
import { Album } from '@/types/album';
import { firebaseAlbumService } from '@/services/firebaseAlbumService';

interface Props {
  open: boolean;
  onClose: () => void;
}

const initial: CreatePackRequest = {
  description: '',
  image: '',
  isFeatured: false,
  name: '',
  price: 0,
  rarity: 'common',
  stockNo: '',
  linkedAlbum: '',
};

export default function PackCreateModal({ open, onClose }: Props) {
  const [form, setForm] = useState<CreatePackRequest>(initial);
  const [saving, setSaving] = useState(false);
  const [imageUploadResult, setImageUploadResult] = useState<ImageUploadResult | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'price' ? Number(value) : value }));
  };

  const handleImageUpload = (result: ImageUploadResult | null) => {
    setImageUploadResult(result);
    setForm((f) => ({ ...f, image: result?.url || '' }));
  };

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const response = await firebaseAlbumService.getAlbums();
        if (response.success && response.albums) {
          const byName = [...response.albums].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setAlbums(byName);
        }
      } catch (err) {
        console.error('Error loading albums for pack linking:', err);
      }
    };
    if (open) {
      loadAlbums();
    }
  }, [open]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await firebasePackService.createPack(form);
      onClose();
      setForm(initial);
    } catch (err) {
      console.error('Create pack failed', err);
      alert('Failed to create pack');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create Pack</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Stock No</label>
            <input name="stockNo" value={form.stockNo} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Price</label>
            <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Rarity</label>
            <select name="rarity" value={form.rarity} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
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
              value={form.image}
              context="pack"
              onChange={handleImageUpload}
              showPreview
              dragAndDrop
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">Description</label>
            <input name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" />
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