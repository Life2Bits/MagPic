import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import jwt from 'jsonwebtoken';
import { GoogleDriveClient } from '$lib/server/google-drive';

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
	const env = platform?.env;
	
	if (!env?.SESSION_SECRET || !env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET) {
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	const sessionToken = cookies.get('sid');
	
	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const folderId = url.searchParams.get('folderId');
	if (!folderId) {
		return json({ error: 'Folder ID is required' }, { status: 400 });
	}

	try {
		const payload = jwt.verify(sessionToken, env.SESSION_SECRET) as any;
		
		const driveClient = new GoogleDriveClient(
			env.TOKENS,
			env.GOOGLE_CLIENT_ID,
			env.GOOGLE_CLIENT_SECRET,
			payload.sub
		);

		const result = await driveClient.listImages(folderId);
		
		return json(result);
	} catch (error) {
		console.error('Failed to list images:', error);
		return json({ error: 'Failed to list images' }, { status: 500 });
	}
};