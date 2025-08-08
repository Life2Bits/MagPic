<script lang="ts">
	import { onMount } from 'svelte';
	
	let user: any = null;
	let loading = true;
	
	onMount(async () => {
		try {
			const response = await fetch('/api/me');
			if (response.ok) {
				const data = await response.json();
				user = data.user;
			}
		} catch (error) {
			console.error('Failed to fetch user info:', error);
		} finally {
			loading = false;
		}
	});
	
	async function logout() {
		try {
			await fetch('/api/me', { method: 'DELETE' });
			user = null;
		} catch (error) {
			console.error('Logout failed:', error);
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
	<div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
		<h1 class="text-3xl font-bold text-center text-gray-900 mb-2">Welcome to MagPic</h1>
		<p class="text-gray-600 text-center mb-6">Powered by SvelteKit and deployed on Cloudflare Workers</p>
		
		{#if loading}
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
				<p class="mt-2 text-gray-600">Loading...</p>
			</div>
		{:else if user}
			<div class="text-center">
				<img src={user.picture} alt={user.name} class="w-16 h-16 rounded-full mx-auto mb-4">
				<h2 class="text-xl font-semibold text-gray-900 mb-1">Hello, {user.name}!</h2>
				<p class="text-gray-600 mb-6">{user.email}</p>
				
				<div class="space-y-3">
					<a 
						href="/drive"
						class="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
					>
						<svg class="inline-block w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
						</svg>
						Browse Google Drive
					</a>
					
					<button 
						on:click={logout}
						class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
					>
						Logout
					</button>
				</div>
			</div>
		{:else}
			<div class="text-center">
				<p class="text-gray-600 mb-6">Please sign in with your Google account to continue</p>
				<a 
					href="/auth/google"
					class="inline-flex items-center justify-center w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
				>
					<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
						<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Sign in with Google
				</a>
			</div>
		{/if}
		
		<div class="mt-6 pt-6 border-t border-gray-200">
			<p class="text-xs text-gray-500 text-center">
				Visit <a href="https://svelte.dev/docs/kit" class="text-blue-500 hover:underline">svelte.dev/docs/kit</a> to read the documentation
			</p>
		</div>
	</div>
</div>
