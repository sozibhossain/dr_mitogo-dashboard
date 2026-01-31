<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchGhostPostWindows, fetchGhostNames } from '$lib/api';
  import { toast } from '$lib/toast-store';
  import Header from '$lib/components/header.svelte';
  import Skeleton from '$lib/components/skeleton.svelte';
  import type { GhostPostWindow, GhostName } from '$lib/api';

  let ghostWindows = $state([]);
  let ghostNames = $state([]);
  let loading = $state(false);
  let ghostPostsEnabled = $state(true);
  let defaultDuration = $state('24');
  let editingGhostId = $state<string | null>(null);
  let ghostNameDraft = $state('');

  onMount(async () => {
    loading = true;
    ghostWindows = await fetchGhostPostWindows();
    ghostNames = await fetchGhostNames();
    loading = false;
  });

  function handleToggleGhostPosts() {
    ghostPostsEnabled = !ghostPostsEnabled;
    toast.success(`Ghost Posts ${ghostPostsEnabled ? 'enabled' : 'disabled'}`);
  }

  function startRename(ghostName: GhostName) {
    editingGhostId = ghostName.id;
    ghostNameDraft = ghostName.name;
  }

  function cancelRename() {
    editingGhostId = null;
    ghostNameDraft = '';
  }

  function saveRename(id: string) {
    const trimmed = ghostNameDraft.trim();
    if (!trimmed) {
      toast.error('Ghost name cannot be empty');
      return;
    }
    ghostNames = ghostNames.map((ghostName: GhostName) =>
      ghostName.id === id ? { ...ghostName, name: trimmed } : ghostName
    );
    toast.success(`Ghost name updated to ${trimmed}`);
    cancelRename();
  }
</script>

<div class="flex-1">
  <Header title="Ghost System Management" description="Manage ghost posts, windows, and names" />

  <div class="p-8 space-y-8">
    <!-- Ghost Post Settings -->
    <div class="bg-white rounded-lg border border-border p-6">
      <h2 class="text-lg font-bold text-foreground mb-4">Ghost Post Settings</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-foreground">Enable Ghost Posts for Entire App</p>
            <p class="text-xs text-muted-foreground">Allow users to post anonymously</p>
          </div>
          <button
            onclick={handleToggleGhostPosts}
            class={`px-4 py-2 rounded-md text-sm font-medium ${
              ghostPostsEnabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}
          >
            {ghostPostsEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <!-- Removed label and fixed form control association -->
        <div class="border-t border-border pt-4">
          <p class="block text-sm font-medium text-foreground mb-2">Default Ghost Post Duration</p>
          <select bind:value={defaultDuration} class="px-4 py-2 border border-border rounded-md text-sm">
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="360">6 hours</option>
            <option value="1440">24 hours</option>
            <option value="2880">48 hours</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Ghost Post Windows -->
    <div>
      <h2 class="text-lg font-bold text-foreground mb-4">Ghost Post Windows</h2>
      <div class="rounded-lg border border-border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-secondary">
            <tr>
              <th class="px-6 py-3 text-left font-semibold">Start Time</th>
              <th class="px-6 py-3 text-left font-semibold">End Time</th>
              <th class="px-6 py-3 text-left font-semibold">Status</th>
              <th class="px-6 py-3 text-left font-semibold">Notification Sent</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#if loading}
              {#each Array(3) as _}
                <tr class="bg-white">
                  <td class="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                </tr>
              {/each}
            {:else if ghostWindows.length > 0}
              {#each ghostWindows as window (window.id)}
                <tr class="bg-white hover:bg-gray-50">
                  <td class="px-6 py-4 text-muted-foreground">{window.startTime}</td>
                  <td class="px-6 py-4 text-muted-foreground">{window.endTime}</td>
                  <td class="px-6 py-4">
                    <span class={`px-2 py-1 rounded-full text-xs font-medium ${
                      window.status === 'active' ? 'bg-green-100 text-green-700' : 
                      window.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {window.status}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    {#if window.notificationSent}
                      <span class="text-green-600">✓</span>
                    {:else}
                      <span class="text-gray-400">✗</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ghost Names -->
    <div>
      <h2 class="text-lg font-bold text-foreground mb-4">Ghost Names Management</h2>
      <div class="rounded-lg border border-border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-secondary">
            <tr>
              <th class="px-6 py-3 text-left font-semibold">Ghost Name</th>
              <th class="px-6 py-3 text-left font-semibold">Status</th>
              <th class="px-6 py-3 text-left font-semibold">Usage Count</th>
              <th class="px-6 py-3 text-left font-semibold">Last Used</th>
              <th class="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#if loading}
              {#each Array(3) as _}
                <tr class="bg-white">
                  <td class="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td class="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                </tr>
              {/each}
            {:else if ghostNames.length > 0}
              {#each ghostNames as ghostName (ghostName.id)}
                <tr class="bg-white hover:bg-gray-50">
                  <td class="px-6 py-4 font-medium text-foreground">
                    {#if editingGhostId === ghostName.id}
                      <input
                        class="w-full px-2 py-1 border border-border rounded-md text-sm"
                        bind:value={ghostNameDraft}
                      />
                    {:else}
                      {ghostName.name}
                    {/if}
                  </td>
                  <td class="px-6 py-4">
                    <span class={`px-2 py-1 rounded-full text-xs font-medium ${
                      ghostName.status === 'allowed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {ghostName.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-muted-foreground">{ghostName.usageCount}</td>
                  <td class="px-6 py-4 text-muted-foreground">{ghostName.lastUsed}</td>
                  <td class="px-6 py-4">
                    {#if editingGhostId === ghostName.id}
                      <div class="flex gap-3">
                        <button
                          class="text-green-600 hover:underline text-xs font-medium"
                          onclick={() => saveRename(ghostName.id)}
                        >
                          Save
                        </button>
                        <button
                          class="text-muted-foreground hover:underline text-xs font-medium"
                          onclick={cancelRename}
                        >
                          Cancel
                        </button>
                      </div>
                    {:else}
                      <button
                        class="text-blue-600 hover:underline text-xs font-medium"
                        onclick={() => startRename(ghostName)}
                      >
                        Rename
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
