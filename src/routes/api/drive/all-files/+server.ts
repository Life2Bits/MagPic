import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import jwt from 'jsonwebtoken';
import { GoogleDriveClient } from '$lib/server/google-drive';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const env = platform?.env;
	
	if (!env?.SESSION_SECRET || !env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET) {
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	const sessionToken = cookies.get('sid');
	
	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const payload = jwt.verify(sessionToken, env.SESSION_SECRET) as any;
		
		const driveClient = new GoogleDriveClient(
			env.TOKENS,
			env.GOOGLE_CLIENT_ID,
			env.GOOGLE_CLIENT_SECRET,
			payload.sub
		);

		// すべてのファイルとフォルダを取得（フォルダと画像のみ）
		const accessToken = await driveClient['getAccessToken']();
		
		const query = "(mimeType='application/vnd.google-apps.folder' or mimeType contains 'image/') and trashed=false";
		
		const response = await fetch(
			`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
				q: query,
				fields: 'files(id,name,mimeType,parents,size,thumbnailLink,modifiedTime)',
				orderBy: 'folder,name',
				pageSize: '50',
			})}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Drive API error:', errorText);
			return json({ error: 'Failed to list files', details: errorText }, { status: 500 });
		}

		const data = await response.json();
		
		// フォルダと画像を分離
		const folders = data.files?.filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder') || [];
		const images = data.files?.filter((f: any) => f.mimeType?.includes('image/')) || [];
		
		return json({
			folders,
			images,
			total: data.files?.length || 0,
		});
	} catch (error) {
		console.error('Failed to list all files:', error);
		return json({ error: 'Failed to list all files' }, { status: 500 });
	}
};