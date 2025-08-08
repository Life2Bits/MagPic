import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import jwt from 'jsonwebtoken';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const env = platform?.env;
	
	if (!env?.SESSION_SECRET) {
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	const sessionToken = cookies.get('sid');
	
	if (!sessionToken) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const payload = jwt.verify(sessionToken, env.SESSION_SECRET) as any;
		
		return json({
			user: {
				id: payload.sub,
				email: payload.email,
				name: payload.name,
				picture: payload.picture,
			},
			authenticated: true,
		});
	} catch (error) {
		console.error('JWT verification failed:', error);
		return json({ error: 'Invalid session' }, { status: 401 });
	}
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	// ログアウト機能
	cookies.delete('sid', { path: '/' });
	return json({ message: 'Logged out successfully' });
};