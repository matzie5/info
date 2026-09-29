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
        No viral posts detected yet in the network.
      </div>

      <div *ngFor="let item of items; trackBy: trackById" class="glass-panel p-4 transition-all hover:border-white/20">
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
                <span *ngIf="item.is_amplified" class="badge badge-red text-[10px] py-0 px-1.5">Amplified</span>
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

        <!-- Prebunk Shield Banner -->
        <div *ngIf="item.prebunk_shield_active" class="mb-3 p-2.5 rounded-lg bg-[#84AA40]/10 border border-[#84AA40]/40 flex items-center gap-2">
          <span class="text-base">🛡️</span>
          <div class="text-xs text-[#A3E635]">
            <span class="font-bold block uppercase tracking-wider text-[10px]">Prebunking Inoculation Active</span>
            Audiences exposed to media literacy alerts show 70% lower transmission velocity.
          </div>
        </div>

        <!-- Fact Check / Debunk Banner -->
        <div *ngIf="item.is_debunked" class="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-start gap-2">
          <span class="text-base">⚠️</span>
          <div class="text-xs text-amber-300">
            <span class="font-bold block uppercase tracking-wider text-[10px]">Official Fact Check Notice</span>
            {{ item.fact_check_label || 'This claim has been flagged by verified independent experts as fabricated.' }}
          </div>
        </div>

        <!-- Engagement Metrics & Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
          <div class="flex items-center gap-4">
            <button
              (click)="like(item)"
              class="flex items-center gap-1 hover:text-red-400 transition-colors">
              <span>❤️</span>
              <span class="font-mono">{{ item.likes_count }}</span>
            </button>
            <button
              (click)="share(item)"
              class="flex items-center gap-1 hover:text-green-400 transition-colors">
              <span>🔄</span>
              <span class="font-mono">{{ item.shares_count }}</span>
            </button>
            <button
              (click)="toggleComments(item.id)"
              class="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <span>💬</span>
              <span class="font-mono">{{ item.comments.length || item.comments_count }}</span>
            </button>
          </div>

          <div class="flex items-center gap-2 text-[11px] font-mono">
            <span title="Outrage index" [class.text-red-400]="item.outrage_score > 0.7">
              Outrage: {{ (item.outrage_score * 100).toFixed(0) }}%
            </span>
          </div>
        </div>

        <!-- Threaded Comments Drawer -->
        <div *ngIf="expandedComments()[item.id]" class="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div *ngFor="let comment of item.comments" class="p-2 rounded bg-black/30 border border-white/5 text-xs">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-200">{{ comment.author_name }}</span>
                <span class="text-slate-500 font-mono text-[10px]">{{ comment.author_handle }}</span>
                <span *ngIf="comment.is_bot" class="badge badge-red text-[9px] py-0 px-1">BOT</span>
              </div>
              <span class="text-slate-500 font-mono text-[10px]">❤️ {{ comment.likes_count }}</span>
            </div>
            <p class="text-slate-300 leading-snug">{{ comment.content }}</p>
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

  toggleComments(postId: string) {
    const current = { ...this.expandedComments() };
    current[postId] = !current[postId];
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
