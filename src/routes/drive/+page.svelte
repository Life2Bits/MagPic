<script lang="ts">
	import { onMount } from 'svelte';
	
	interface Folder {
		id: string;
		name: string;
		mimeType: string;
		parents?: string[];
	}
	
	interface ImageFile {
		id: string;
		name: string;
		mimeType: string;
		size?: string;
		thumbnailLink?: string;
		webContentLink?: string;
		modifiedTime?: string;
	}
	
	let folders: Folder[] = [];
	let images: ImageFile[] = [];
	let selectedFolder: Folder | null = null;
	let selectedImage: ImageFile | null = null;
	let loading = false;
	let error: string | null = null;
	let breadcrumbs: Folder[] = [];
	let currentParentId: string | undefined = undefined;
	let authenticated = false;
	let showAllFiles = false;
	let allFilesData: any = null;

	onMount(async () => {
		// Check authentication
		try {
			const response = await fetch('/api/me');
			if (response.ok) {
				authenticated = true;
				await loadFolders();
			} else {
				window.location.href = '/';
			}
		} catch (err) {
			window.location.href = '/';
		}
	});

	async function loadFolders(parentId?: string) {
		loading = true;
		error = null;
		
		try {
			const url = parentId 
				? `/api/drive/folders?parentId=${parentId}`
				: '/api/drive/folders';
				
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error('Failed to load folders');
			}
			
			const data = await response.json();
			folders = data.files || [];
			currentParentId = parentId;
			
			// Clear images when changing folders
			images = [];
			selectedImage = null;
		} catch (err) {
			error = 'Failed to load folders. Please try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function selectFolder(folder: Folder) {
		selectedFolder = folder;
		loading = true;
		error = null;
		
		// Update breadcrumbs
		if (folder) {
			const existingIndex = breadcrumbs.findIndex(b => b.id === folder.id);
			if (existingIndex >= 0) {
				breadcrumbs = breadcrumbs.slice(0, existingIndex + 1);
			} else {
				breadcrumbs = [...breadcrumbs, folder];
			}
		}
		
		try {
			// Load subfolders
			await loadFolders(folder.id);
			
			// Load images in this folder
			const response = await fetch(`/api/drive/images?folderId=${folder.id}`);
			
			if (!response.ok) {
				throw new Error('Failed to load images');
			}
			
			const data = await response.json();
			images = data.files || [];
		} catch (err) {
			error = 'Failed to load folder contents. Please try again.';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function goToRoot() {
		breadcrumbs = [];
		selectedFolder = null;
		await loadFolders();
	}

	async function goToBreadcrumb(index: number) {
		const folder = breadcrumbs[index];
		breadcrumbs = breadcrumbs.slice(0, index);
		
		if (index === 0) {
			await loadFolders();
			selectedFolder = null;
		} else {
			await selectFolder(folder);
		}
	}

	function selectImage(image: ImageFile) {
		selectedImage = image;
	}

	function formatFileSize(bytes?: string): string {
		if (!bytes) return 'Unknown size';
		const size = parseInt(bytes);
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(dateStr?: string): string {
		if (!dateStr) return 'Unknown date';
		return new Date(dateStr).toLocaleDateString();
	}

	async function loadAllFiles() {
		loading = true;
		error = null;
		showAllFiles = true;
		
		try {
			const response = await fetch('/api/drive/all-files');
			
			if (!response.ok) {
				throw new Error('Failed to load all files');
			}
			
			allFilesData = await response.json();
		} catch (err) {
			error = 'Failed to load all files. Please check your permissions.';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto p-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<h1 class="text-2xl font-bold text-gray-900">Google Drive Explorer</h1>
				<div class="flex items-center space-x-4">
					<button 
						on:click={loadAllFiles}
						class="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
					>
						Debug: Show All Files
					</button>
					<a href="/" class="text-blue-500 hover:underline">← Back to Home</a>
				</div>
			</div>

			<!-- Breadcrumbs -->
			<div class="flex items-center space-x-2 mb-4 text-sm">
				<button 
					on:click={goToRoot}
					class="text-blue-500 hover:underline"
				>
					My Drive
				</button>
				{#each breadcrumbs as crumb, i}
					<span class="text-gray-500">/</span>
					<button 
						on:click={() => goToBreadcrumb(i)}
						class="text-blue-500 hover:underline"
					>
						{crumb.name}
					</button>
				{/each}
			</div>

			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading...</p>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			{:else if showAllFiles && allFilesData}
				<!-- Debug View: All Files -->
				<div class="space-y-4">
					<button 
						on:click={() => { showAllFiles = false; loadFolders(); }}
						class="text-blue-500 hover:underline"
					>
						← Back to Normal View
					</button>
					
					<div class="border rounded-lg p-4">
						<h3 class="font-semibold mb-2">Summary</h3>
						<p class="text-sm text-gray-600">Total items: {allFilesData.total}</p>
						<p class="text-sm text-gray-600">Folders: {allFilesData.folders?.length || 0}</p>
						<p class="text-sm text-gray-600">Images: {allFilesData.images?.length || 0}</p>
					</div>
					
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<div class="border rounded-lg p-4">
							<h3 class="font-semibold mb-2">All Folders</h3>
							{#if allFilesData.folders?.length > 0}
								<div class="space-y-1 max-h-64 overflow-y-auto">
									{#each allFilesData.folders as folder}
										<div class="text-sm p-1 hover:bg-gray-100 rounded">
											📁 {folder.name}
											<span class="text-xs text-gray-500 ml-2">ID: {folder.id.substring(0, 8)}...</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-gray-500">No folders in your Drive</p>
							{/if}
						</div>
						
						<div class="border rounded-lg p-4">
							<h3 class="font-semibold mb-2">All Images</h3>
							{#if allFilesData.images?.length > 0}
								<div class="space-y-1 max-h-64 overflow-y-auto">
									{#each allFilesData.images as image}
										<div class="text-sm p-1 hover:bg-gray-100 rounded">
											🖼️ {image.name}
											<span class="text-xs text-gray-500 ml-2">{formatFileSize(image.size)}</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-gray-500">No images in your Drive</p>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Folders Column -->
					<div class="border rounded-lg p-4">
						<h2 class="text-lg font-semibold mb-3">Folders</h2>
						{#if folders.length === 0}
							<p class="text-gray-500 text-sm">No folders found. Try creating a folder in your Google Drive first.</p>
						{:else}
							<div class="space-y-2 max-h-96 overflow-y-auto">
								{#each folders as folder}
									<button
										on:click={() => selectFolder(folder)}
										class="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center space-x-2 {selectedFolder?.id === folder.id ? 'bg-blue-50' : ''}"
									>
										<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
											<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
										</svg>
										<span class="truncate">{folder.name}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Images Column -->
					<div class="border rounded-lg p-4">
						<h2 class="text-lg font-semibold mb-3">Images</h2>
						{#if !selectedFolder}
							<p class="text-gray-500 text-sm">Select a folder to view images</p>
						{:else if images.length === 0}
							<p class="text-gray-500 text-sm">No images in this folder</p>
						{:else}
							<div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
								{#each images as image}
									<button
										on:click={() => selectImage(image)}
										class="relative group cursor-pointer border rounded overflow-hidden hover:shadow-lg transition-shadow {selectedImage?.id === image.id ? 'ring-2 ring-blue-500' : ''}"
									>
										<img 
											src="/api/drive/file/{image.id}"
											alt={image.name}
											class="w-full h-32 object-cover"
											loading="lazy"
										/>
										<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
											<p class="text-white text-xs truncate">{image.name}</p>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Selected Image Details -->
				{#if selectedImage}
					<div class="mt-6 border-t pt-6">
						<h3 class="text-lg font-semibold mb-3">Selected Image</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<img 
									src="/api/drive/file/{selectedImage.id}"
									alt={selectedImage.name}
									class="w-full rounded-lg shadow-md"
								/>
							</div>
							<div class="space-y-2">
								<div>
									<span class="font-semibold">Name:</span>
									<p class="text-gray-700">{selectedImage.name}</p>
								</div>
								<div>
									<span class="font-semibold">Size:</span>
									<p class="text-gray-700">{formatFileSize(selectedImage.size)}</p>
								</div>
								<div>
									<span class="font-semibold">Type:</span>
									<p class="text-gray-700">{selectedImage.mimeType}</p>
								</div>
								<div>
									<span class="font-semibold">Modified:</span>
									<p class="text-gray-700">{formatDate(selectedImage.modifiedTime)}</p>
								</div>
								<div class="pt-4">
									<a 
										href="/api/drive/file/{selectedImage.id}"
										target="_blank"
										class="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
									>
										<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
										</svg>
										View Full Size
									</a>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>