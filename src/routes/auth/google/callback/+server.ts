import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthorizationCode } from 'simple-oauth2';
import jwt from 'jsonwebtoken';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const env = platform?.env;
	
	if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET || !env?.SESSION_SECRET) {
		throw new Error('Google OAuth credentials not configured');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code) {
		throw redirect(302, '/?error=no_code');
	}

	try {
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
		
		const tokenParams = {
			code,
			redirect_uri: redirectUri,
			scope: 'email profile https://www.googleapis.com/auth/drive.file',
		};

		const accessToken = await client.getToken(tokenParams);
		const token = accessToken.token;

		// Googleユーザー情報を取得
		const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: {
				Authorization: `Bearer ${token.access_token}`,
			},
		});
		
		if (!userResponse.ok) {
			throw new Error('Failed to fetch user info');
		}

		const user = await userResponse.json();

		// KVにトークン情報を保存 (refresh_tokenを含む)
		const tokenData = {
			access_token: token.access_token,
			refresh_token: token.refresh_token,
			expires_in: token.expires_in,
			obtained_at: Date.now(),
			user_info: {
				id: user.id,
				email: user.email,
				name: user.name,
				picture: user.picture,
			}
		};

		await env.TOKENS.put(`g:${user.id}`, JSON.stringify(tokenData));

		// JWTセッションCookieを作成
		const sessionPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			picture: user.picture,
		};

		const sessionToken = jwt.sign(sessionPayload, env.SESSION_SECRET, {
			expiresIn: '30d',
		});

		// セッションCookieを設定
		cookies.set('sid', sessionToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60, // 30 days
		});

		throw redirect(302, '/');
	} catch (error) {
		console.error('OAuth callback error:', error);
		throw redirect(302, '/?error=oauth_failed');
	}
};