/**
 * SupabaseProvider — Custom Yjs transport over Supabase Realtime
 *
 * Uses Supabase Realtime channels as the transport layer for Yjs CRDT updates,
 * since Vercel does not support persistent WebSocket connections.
 *
 * Architecture:
 * - Each editor session joins channel `article-collab-{articleId}`
 * - Yjs document diffs are broadcast via channel messages (base64-encoded binary)
 * - Awareness state (user info, cursor) is synced via Supabase Presence
 * - On join: broadcasts a sync-request so the oldest peer responds with full state
 * - Yjs CRDT automatically handles merge conflicts
 *
 * Message types:
 *   'yjs-update'       — incremental doc update (debounced 50ms)
 *   'yjs-full-sync'    — full document state (response to sync requests)
 *   'yjs-sync-request' — new peer requesting full state from peers
 */

'use client';

import * as Y from 'yjs';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AwarenessState {
  userId: string;
  userName: string;
  color: string;
  cursor: { anchor: number; head: number } | null;
  lastSeen: number;
}

export interface CollabUser {
  id: string;
  name: string;
  color: string;
}

export interface SupabaseProviderConfig {
  doc: Y.Doc;
  articleId: string;
  supabaseClient: SupabaseClient;
  user: CollabUser;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';
type AwarenessListener = (states: AwarenessState[]) => void;

// ─── Base64 helpers (Edge-compatible — no Buffer) ────────────────────────────

function uint8ToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export class SupabaseProvider {
  readonly doc: Y.Doc;
  readonly user: CollabUser;
  readonly articleId: string;

  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private _status: ConnectionStatus = 'disconnected';

  // Presence state — map of presenceKey -> AwarenessState
  private presenceStates = new Map<string, AwarenessState>();
  private awarenessListeners: Set<AwarenessListener> = new Set();

  // Debounce timer for broadcasting incremental updates
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpdate: Uint8Array | null = null;

  // Whether we have already applied the initial full sync from a peer
  private syncReceived = false;

  constructor(config: SupabaseProviderConfig) {
    this.doc = config.doc;
    this.articleId = config.articleId;
    this.supabase = config.supabaseClient;
    this.user = config.user;
  }

  // ── Status ──────────────────────────────────────────────────────────────

  get status(): ConnectionStatus {
    return this._status;
  }

  // ── Awareness ───────────────────────────────────────────────────────────

  /** Returns all awareness states from other connected users */
  getAwarenessStates(): AwarenessState[] {
    return Array.from(this.presenceStates.values()).filter(
      (s) => s.userId !== this.user.id
    );
  }

  /** Subscribe to awareness state changes */
  onAwareness(fn: AwarenessListener): void {
    this.awarenessListeners.add(fn);
  }

  offAwareness(fn: AwarenessListener): void {
    this.awarenessListeners.delete(fn);
  }

  private emitAwareness(): void {
    const states = this.getAwarenessStates();
    this.awarenessListeners.forEach((fn) => fn(states));
  }

  /** Update local awareness state (cursor position etc.) */
  setLocalState(state: Partial<AwarenessState> | null): void {
    if (!this.channel || this._status !== 'connected') return;
    const payload: AwarenessState = {
      userId: this.user.id,
      userName: this.user.name,
      color: this.user.color,
      cursor: state?.cursor ?? null,
      lastSeen: Date.now(),
    };
    // Supabase Presence track update
    void this.channel.track(payload);
  }

  // ── Connection ──────────────────────────────────────────────────────────

  connect(): void {
    if (this._status !== 'disconnected') return;
    this._status = 'connecting';

    const channelName = `article-collab-${this.articleId}`;
    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: this.user.id },
      },
    });

    // ── Listen: incremental update from a peer ──────────────────────────
    this.channel.on(
      'broadcast',
      { event: 'yjs-update' },
      (payload: { payload: { update: string } }) => {
        try {
          const update = base64ToUint8(payload.payload.update);
          // Apply with origin='remote' to avoid re-broadcasting
          Y.applyUpdate(this.doc, update, 'remote');
        } catch (err) {
          console.warn('[SupabaseProvider] Failed to apply yjs-update:', err);
        }
      }
    );

    // ── Listen: full state sync (response to our sync-request) ──────────
    this.channel.on(
      'broadcast',
      { event: 'yjs-full-sync' },
      (payload: { payload: { state: string } }) => {
        try {
          const state = base64ToUint8(payload.payload.state);
          Y.applyUpdate(this.doc, state, 'remote');
          this.syncReceived = true;
        } catch (err) {
          console.warn('[SupabaseProvider] Failed to apply yjs-full-sync:', err);
        }
      }
    );

    // ── Listen: a new peer joined and requests full state ───────────────
    this.channel.on(
      'broadcast',
      { event: 'yjs-sync-request' },
      () => {
        // Only respond if we have real content
        const state = Y.encodeStateAsUpdate(this.doc);
        if (state.length > 2) {
          void this.channel?.send({
            type: 'broadcast',
            event: 'yjs-full-sync',
            payload: { state: uint8ToBase64(state) },
          });
        }
      }
    );

    // ── Presence: track who is online ───────────────────────────────────
    this.channel.on('presence', { event: 'sync' }, () => {
      const presenceState = this.channel?.presenceState<AwarenessState>() ?? {};
      this.presenceStates.clear();
      for (const [key, entries] of Object.entries(presenceState)) {
        // Supabase presence returns array — take the most recent entry
        const entry = Array.isArray(entries) ? entries[entries.length - 1] : entries;
        if (entry && typeof entry === 'object' && 'userId' in entry) {
          this.presenceStates.set(key, entry as AwarenessState);
        }
      }
      this.emitAwareness();
    });

    this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      if (!Array.isArray(newPresences)) return;
      for (const presence of newPresences) {
        const p = presence as unknown as AwarenessState;
        if (p && typeof p === 'object' && 'userId' in p) {
          this.presenceStates.set(p.userId, p);
        }
      }
      this.emitAwareness();
    });

    this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (!Array.isArray(leftPresences)) return;
      for (const presence of leftPresences) {
        const p = presence as unknown as AwarenessState;
        if (p && typeof p === 'object' && 'userId' in p) {
          this.presenceStates.delete(p.userId);
        }
      }
      this.emitAwareness();
    });

    // ── Subscribe ────────────────────────────────────────────────────────
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this._status = 'connected';

        // Track own presence
        const myState: AwarenessState = {
          userId: this.user.id,
          userName: this.user.name,
          color: this.user.color,
          cursor: null,
          lastSeen: Date.now(),
        };
        await this.channel?.track(myState);

        // Request full doc state from any existing peers
        await this.channel?.send({
          type: 'broadcast',
          event: 'yjs-sync-request',
          payload: {},
        });

        // Start listening to local doc changes
        this.doc.on('update', this.handleDocUpdate);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this._status = 'disconnected';
        console.warn('[SupabaseProvider] Channel error:', status);
      } else if (status === 'CLOSED') {
        this._status = 'disconnected';
      }
    });
  }

  disconnect(): void {
    if (this.broadcastTimer !== null) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    this.doc.off('update', this.handleDocUpdate);
    if (this.channel) {
      void this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.presenceStates.clear();
    this._status = 'disconnected';
    this.awarenessListeners.clear();
  }

  // ── Doc update handler (debounced) ──────────────────────────────────────

  private handleDocUpdate = (update: Uint8Array, origin: unknown): void => {
    // Don't re-broadcast updates that came from remote peers
    if (origin === 'remote') return;

    // Accumulate into pendingUpdate
    if (this.pendingUpdate) {
      this.pendingUpdate = Y.mergeUpdates([this.pendingUpdate, update]);
    } else {
      this.pendingUpdate = update;
    }

    // Debounce broadcast by 50ms
    if (this.broadcastTimer !== null) {
      clearTimeout(this.broadcastTimer);
    }
    this.broadcastTimer = setTimeout(() => {
      this.flushUpdate();
    }, 50);
  };

  private flushUpdate(): void {
    if (!this.pendingUpdate || !this.channel || this._status !== 'connected') return;
    const update = this.pendingUpdate;
    this.pendingUpdate = null;
    this.broadcastTimer = null;

    void this.channel.send({
      type: 'broadcast',
      event: 'yjs-update',
      payload: { update: uint8ToBase64(update) },
    });
  }
}
