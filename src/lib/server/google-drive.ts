import type { KVNamespace } from '@cloudflare/workers-types';

interface TokenData {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	obtained_at: number;
	user_info: {
		id: string;
		email: string;
		name: string;
		picture: string;
	};
}

export class GoogleDriveClient {
	private tokens: KVNamespace;
	private clientId: string;
	private clientSecret: string;
	private userId: string;

	constructor(tokens: KVNamespace, clientId: string, clientSecret: string, userId: string) {
		this.tokens = tokens;
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.userId = userId;
	}

	private async getAccessToken(): Promise<string> {
		const tokenDataStr = await this.tokens.get(`g:${this.userId}`);
		if (!tokenDataStr) {
			throw new Error('No token data found');
		}

		const tokenData: TokenData = JSON.parse(tokenDataStr);
		
		// Check if token is expired
		const now = Date.now();
		const expiresAt = tokenData.obtained_at + (tokenData.expires_in || 3600) * 1000;
		
		if (now < expiresAt - 60000) { // 1 minute buffer
			return tokenData.access_token;
		}

		// Refresh token if expired
		if (!tokenData.refresh_token) {
			throw new Error('No refresh token available');
		}

		const response = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: this.clientId,
				client_secret: this.clientSecret,
				refresh_token: tokenData.refresh_token,
				grant_type: 'refresh_token',
			}),
		});

		if (!response.ok) {
			throw new Error('Failed to refresh token');
		}

		const newTokenData = await response.json();
		
		// Update stored token
		tokenData.access_token = newTokenData.access_token;
		tokenData.expires_in = newTokenData.expires_in;
		tokenData.obtained_at = Date.now();
		
		await this.tokens.put(`g:${this.userId}`, JSON.stringify(tokenData));
		
		return newTokenData.access_token;
	}

	async listFolders(parentId?: string): Promise<any> {
		const accessToken = await this.getAccessToken();
		
		let query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
		if (parentId) {
			query = `'${parentId}' in parents and ${query}`;
		}

		const response = await fetch(
			`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
				q: query,
				fields: 'files(id,name,mimeType,parents)',
				orderBy: 'name',
			})}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error('Failed to list folders');
		}

		return response.json();
	}

	async listImages(folderId: string): Promise<any> {
		const accessToken = await this.getAccessToken();
		
		const query = `'${folderId}' in parents and (mimeType contains 'image/') and trashed=false`;

		const response = await fetch(
			`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({
				q: query,
				fields: 'files(id,name,mimeType,size,thumbnailLink,webContentLink,modifiedTime)',
				orderBy: 'name',
				pageSize: '100',
			})}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error('Failed to list images');
		}

		return response.json();
	}

	async getFileContent(fileId: string): Promise<Response> {
		const accessToken = await this.getAccessToken();
		
		const response = await fetch(
			`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error('Failed to get file content');
		}

		return response;
	}

	async getFileMetadata(fileId: string): Promise<any> {
		const accessToken = await this.getAccessToken();
		
		const response = await fetch(
			`https://www.googleapis.com/drive/v3/files/${fileId}?${new URLSearchParams({
				fields: 'id,name,mimeType,size,thumbnailLink,webContentLink,modifiedTime,parents',
			})}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!response.ok) {
			throw new Error('Failed to get file metadata');
		}

		return response.json();
	}
}