import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedItem } from '../../../../core/models/session.model';
import { LocaleService } from '../../../../core/i18n/locale.service';

@Component({
  selector: 'app-pulse-feed',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <h2 class="text-base font-bold tracking-wide uppercase text-slate-200">
            {{ locale.t('pulse.trending') }}
          </h2>
        </div>
        <span class="text-xs text-slate-400 font-mono">{{ items.length }} posts</span>
      </div>

      <!-- Feed List -->
      <div *ngIf="items.length === 0" class="glass-panel p-8 text-center text-slate-400 text-sm">
        {{ locale.t('pulse.empty') }}
      </div>

      <div
        *ngFor="let item of items; trackBy: trackById"
        class="glass-panel p-4 transition-all hover:border-white/20"
        [ngClass]="{ 'border-red-500/60': item.is_amplified, 'glass-panel-glow-red': item.is_amplified }">
        
        <!-- Author Header -->
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300 overflow-hidden">
              <img *ngIf="item.author_avatar" [src]="item.author_avatar" class="w-full h-full object-cover" />
              <span *ngIf="!item.author_avatar">{{ item.author_name.substring(0, 2).toUpperCase() }}</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-sm text-white">{{ item.author_name }}</span>
                <span *ngIf="item.is_verified" class="text-blue-400 text-xs" title="Verified">●</span>
                <span *ngIf="item.is_amplified" class="badge badge-red text-[10px] py-0 px-1.5 animate-pulse">
                  🤖 {{ locale.t('pulse.bot_amplified') }}
                </span>
                <span *ngIf="item.is_debunked" class="badge badge-amber text-[10px] py-0 px-1.5">
                  ⚠️ {{ locale.t('pulse.debunked') }}
                </span>
              </div>
              <span class="text-xs text-slate-400 font-mono">{{ item.author_handle }}</span>
            </div>
          </div>
          <span class="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
            T+{{ item.created_at_tick }}h
          </span>
        </div>

        <!-- Headline & Content -->
        <h3 *ngIf="item.headline" class="text-base font-extrabold text-white mb-1 leading-snug"
            [class.text-amber-400]="item.outrage_score > 0.8">
          {{ item.headline }}
        </h3>
        <p class="text-slate-300 text-sm leading-relaxed mb-3 whitespace-pre-line">
          {{ item.content }}
        </p>

        <!-- Media preview (if exists) -->
        <div *ngIf="item.media_url" class="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/40 h-44 flex items-center justify-center">
          <div class="text-center p-4">
            <span class="text-2xl mb-1 block">🖼️</span>
            <span class="text-xs text-slate-400 font-mono">{{ item.media_url }}</span>
          </div>
        </div>

        <!-- Active Bot Swarm Banner -->
        <div *ngIf="item.is_amplified" class="mb-3 p-2.5 rounded-lg bg-red-950/40 border border-red-500/50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base animate-bounce">🤖</span>
            <div class="text-xs text-red-200">
              <span class="font-bold uppercase tracking-wider text-[10px] text-red-400 block">{{ locale.t('pulse.bot_swarm_active') }}</span>
              {{ locale.t('pulse.bot_swarm_desc') }}
            </div>
          </div>
          <span class="badge badge-red font-mono text-[10px] uppercase animate-pulse">2.5x Velocity</span>
        </div>

        <!-- Prebunk Shield Banner -->
        <div *ngIf="item.prebunk_shield_active" class="mb-3 p-2.5 rounded-lg bg-[#84AA40]/10 border border-[#84AA40]/40 flex items-center gap-2">
          <span class="text-base">🛡️</span>
          <div class="text-xs text-[#A3E635]">
            <span class="font-bold block uppercase tracking-wider text-[10px]">{{ locale.t('pulse.prebunk_active') }}</span>
            {{ locale.t('pulse.prebunk_desc') }}
          </div>
        </div>

        <!-- Fact Check / Debunk Banner -->
        <div *ngIf="item.is_debunked" class="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-start gap-2">
          <span class="text-base">⚠️</span>
          <div class="text-xs text-amber-300">
            <span class="font-bold block uppercase tracking-wider text-[10px]">{{ locale.t('pulse.fact_check_title') }}</span>
            {{ item.fact_check_label || 'This claim has been flagged by verified independent experts as fabricated.' }}
          </div>
        </div>

        <!-- Engagement Metrics & Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
          <div class="flex items-center gap-4">
            <button
              (click)="like(item)"
              class="flex items-center gap-1 hover:text-red-400 transition-colors"
              [class.text-red-400]="item.is_amplified">
              <span>❤️</span>
              <span class="font-mono">{{ item.likes_count }}</span>
            </button>
            <button
              (click)="share(item)"
              class="flex items-center gap-1 hover:text-green-400 transition-colors"
              [class.text-[#A3E635]]="item.is_amplified">
              <span>🔄</span>
              <span class="font-mono">{{ item.shares_count }}</span>
            </button>
            <button
              (click)="toggleComments(item.id)"
              class="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
              <span>💬</span>
              <span class="font-mono">{{ item.comments.length || item.comments_count }}</span>
              <span *ngIf="getBotCount(item) > 0" class="badge badge-red text-[9px] py-0 px-1 font-mono font-bold animate-pulse">
                {{ getBotCount(item) }} BOTS
              </span>
            </button>
          </div>

          <div class="flex items-center gap-2 text-[11px] font-mono">
            <span title="Outrage index" [class.text-red-400]="item.outrage_score > 0.7">
              {{ locale.t('pulse.outrage_label') }}: {{ (item.outrage_score * 100).toFixed(0) }}%
            </span>
          </div>
        </div>

        <!-- Threaded Comments Drawer -->
        <div *ngIf="isExpanded(item)" class="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div
            *ngFor="let comment of item.comments"
            class="p-2.5 rounded bg-black/40 border text-xs"
            [ngClass]="comment.is_bot ? 'border-red-500/40' : 'border-white/5'">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-200">{{ comment.author_name }}</span>
                <span class="text-slate-500 font-mono text-[10px]">{{ comment.author_handle }}</span>
                <span *ngIf="comment.is_bot" class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[9px] font-mono font-bold uppercase tracking-wider">
                  🤖 Bot
                </span>
              </div>
              <span class="text-slate-500 font-mono text-[10px]">❤️ {{ comment.likes_count }}</span>
            </div>
            <p class="text-slate-300 leading-snug" [class.text-red-200]="comment.is_bot">{{ comment.content }}</p>
          </div>

          <!-- Add Organic Reply -->
          <div class="flex gap-2 mt-2">
            <input
              type="text"
              [(ngModel)]="replyInputs[item.id]"
              (keydown.enter)="submitReply(item)"
              [placeholder]="locale.t('pulse.reply_placeholder')"
              class="input-field text-xs py-1.5" />
            <button
              (click)="submitReply(item)"
              class="btn-secondary text-xs px-3 py-1">
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PulseFeedComponent {
  @Input() items: FeedItem[] = [];
  @Output() actionTriggered = new EventEmitter<any>();

  public expandedComments = signal<Record<string, boolean>>({});
  public replyInputs: Record<string, string> = {};

  constructor(public locale: LocaleService) {}

  trackById(index: number, item: FeedItem): string {
    return item.id;
  }

  getBotCount(item: FeedItem): number {
    return (item.comments || []).filter(c => c.is_bot).length;
  }

  isExpanded(item: FeedItem): boolean {
    if (this.expandedComments()[item.id] !== undefined) {
      return this.expandedComments()[item.id];
    }
    // Auto-expand if the post is bot-amplified or has comments
    return item.is_amplified || (item.comments && item.comments.length > 0);
  }

  toggleComments(postId: string) {
    const item = this.items.find(i => i.id === postId);
    const curVal = item ? this.isExpanded(item) : false;
    const current = { ...this.expandedComments() };
    current[postId] = !curVal;
    this.expandedComments.set(current);
  }

  like(item: FeedItem) {
    item.likes_count += 1;
  }

  share(item: FeedItem) {
    item.shares_count += 1;
  }

  submitReply(item: FeedItem) {
    const text = (this.replyInputs[item.id] || '').trim();
    if (!text) return;

    item.comments.push({
      id: 'c-user-' + Math.random().toString(36).substring(2, 6),
      author_name: 'You (Organic User)',
      author_handle: '@citizen_net',
      content: text,
      is_bot: false,
      likes_count: 1
    });
    item.comments_count = item.comments.length;
    this.replyInputs[item.id] = '';
  }
}
