import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthorizationCode } from 'simple-oauth2';

export const GET: RequestHandler = async ({ platform, url }) => {
	const env = platform?.env;
	
	if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET) {
		throw new Error('Google OAuth credentials not configured');
	}

	const client = new AuthorizationCode({
		client: {
			id: env.GOOGLE_CLIENT_ID,
			secret: env.GOOGLE_CLIENT_SECRET,
		},
		auth: {
			tokenHost: 'https://accounts.google.com',
			tokenPath: '/o/oauth2/token',
			authorizePath: '/o/oauth2/v2/auth'
		},
	});

	const redirectUri = new URL('/auth/google/callback', url.origin).toString();
	
	const authorizationUri = client.authorizeURL({
		redirect_uri: redirectUri,
		scope: 'email profile https://www.googleapis.com/auth/drive.file',
		state: crypto.randomUUID(), // CSRF protection
		access_type: 'offline',
		prompt: 'consent', // refresh_tokenを確実に取得
	});

	throw redirect(302, authorizationUri);
};