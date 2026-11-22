<!-- src/routes/newsletter/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
  let subscribed = $state(false);
</script>

{#if form?.success}
  <p role="status">Subscribed — check your inbox.</p>
{:else}
  <form
    method="POST"
    use:enhance={() => {
      return async ({ update }) => {
        await update();
        subscribed = true;
      };
    }}
  >
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" required />
    {#if form?.error}
      <p role="alert">{form.error}</p>
    {/if}
    <button type="submit" disabled={subscribed}>Subscribe</button>
  </form>
{/if}
