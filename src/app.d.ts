// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: {
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
				SESSION_SECRET: string;
				TOKENS: KVNamespace;
			};
		}
	}
}

export {};
