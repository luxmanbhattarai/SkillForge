// src/routes/newsletter/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    if (typeof email !== 'string' || !email.includes('@')) {
      return fail(400, { email: '', error: 'Enter a valid email address.' });
    }
    // Store the subscription on the server here.
    return { success: true };
  },
};
