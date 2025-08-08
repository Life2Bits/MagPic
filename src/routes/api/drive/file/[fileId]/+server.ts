import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import jwt from 'jsonwebtoken';
import { GoogleDriveClient } from '$lib/server/google-drive';

export const GET: RequestHandler = async ({ cookies, platform, params }) => {
	const env = platform?.env;
	
	if (!env?.SESSION_SECRET || !env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET) {
		throw error(500, 'Server configuration error');
	}

	const sessionToken = cookies.get('sid');
	
	if (!sessionToken) {
		throw error(401, 'Not authenticated');
	}

	try {
		const payload = jwt.verify(sessionToken, env.SESSION_SECRET) as any;
		
		const driveClient = new GoogleDriveClient(
			env.TOKENS,
			env.GOOGLE_CLIENT_ID,
			env.GOOGLE_CLIENT_SECRET,
			payload.sub
		);

		const fileResponse = await driveClient.getFileContent(params.fileId);
		
		// パススルーでファイルコンテンツを返す
		return new Response(fileResponse.body, {
			headers: {
				'Content-Type': fileResponse.headers.get('Content-Type') || 'application/octet-stream',
				'Cache-Control': 'private, max-age=3600',
			},
		});
	} catch (err) {
		console.error('Failed to get file:', err);
		throw error(500, 'Failed to get file');
	}
};