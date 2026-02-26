import FormData from 'form-data';
import { ApiClient } from '../api-client';
import { generateFakePhoto } from '../generators/fake-photo';

export async function uploadPhotos(client: ApiClient, damageId: string, count: number, agentName: string) {
  const form = new FormData();

  for (let i = 0; i < count; i++) {
    const buffer = await generateFakePhoto(agentName, i);
    form.append('photos', buffer, {
      filename: `damage-${Date.now()}-${i}.jpg`,
      contentType: 'image/jpeg',
    });
  }

  const res = await client.postForm(`/photos/upload/${damageId}`, form as any);
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Photo upload failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data?.data ?? res.data;
}
