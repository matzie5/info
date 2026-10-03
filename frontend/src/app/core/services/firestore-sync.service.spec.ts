import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FirestoreSyncService } from './firestore-sync.service';
import { LabApiService } from './lab-api.service';
import { Session, FeedItem } from '../models/session.model';

describe('FirestoreSyncService', () => {
  let service: FirestoreSyncService;
  let apiMock: jasmine.SpyObj<LabApiService>;

  const mockSession: Session = {
    session_id: 'sess-test-123',
    title: 'Test Cyber Exercise',
    scenario_id: 'poland-grid-panic-2026',
    status: 'ACTIVE',
    current_tick: 5,
    max_ticks: 40,
    language: 'pl',
    created_at: '2026-10-03T08:00:00Z',
    updated_at: '2026-10-03T08:10:00Z',
    metrics: {
      virality_index: 85,
      polarization_score: 70,
      institutional_trust: 25,
      disinformation_reach: 30,
      debunk_effectiveness: 60
    }
  } as unknown as Session;

  const mockFeed: FeedItem[] = [
    {
      post_id: 'post-01',
      session_id: 'sess-test-123',
      headline: 'Substation update confirmed',
      content: 'Official status update from transmission operator',
      outrage_score: 0.1,
      bias_score: 0.05,
      virality_velocity: 1.2
    } as unknown as FeedItem
  ];

  beforeEach(() => {
    apiMock = jasmine.createSpyObj<LabApiService>('LabApiService', ['getSession', 'getFeed']);
    apiMock.getSession.and.returnValue(Promise.resolve(mockSession));
    apiMock.getFeed.and.returnValue(Promise.resolve(mockFeed));

    TestBed.configureTestingModule({
      providers: [
        FirestoreSyncService,
        { provide: LabApiService, useValue: apiMock }
      ]
    });

    localStorage.clear();
    service = TestBed.inject(FirestoreSyncService);
  });

  afterEach(() => {
    service.stopSync();
    localStorage.clear();
  });

  it('should initialize with default empty/null signals', () => {
    expect(service).toBeTruthy();
    expect(service.session()).toBeNull();
    expect(service.feed()).toEqual([]);
    expect(service.currentUser()).toBeNull();
    expect(service.isSyncing()).toBeFalse();
  });

  it('should store and retrieve current user from localStorage via setCurrentUser and initUserFromStorage', () => {
    const testUser = {
      userId: 'user-defense-01',
      role: 'DEFENDER' as any,
      handle: 'cyber_sentinel'
    };

    service.setCurrentUser(testUser);
    expect(service.currentUser()).toEqual(testUser);
    expect(localStorage.getItem('infosphere_user')).toBe(JSON.stringify(testUser));

    // Reset signal and reload from storage
    service.currentUser.set(null);
    expect(service.currentUser()).toBeNull();

    service.initUserFromStorage();
    expect(service.currentUser()).toEqual(testUser);
  });

  it('should handle malformed JSON gracefully in initUserFromStorage', () => {
    localStorage.setItem('infosphere_user', 'invalid-json-{broken}');
    expect(() => service.initUserFromStorage()).not.toThrow();
    expect(service.currentUser()).toBeNull();
  });

  it('should update session and feed signals when fetchData is invoked', async () => {
    expect(service.isSyncing()).toBeFalse();
    const fetchPromise = service.fetchData('sess-test-123');
    expect(service.isSyncing()).toBeTrue();

    await fetchPromise;
    expect(service.isSyncing()).toBeFalse();
    expect(apiMock.getSession).toHaveBeenCalledWith('sess-test-123');
    expect(apiMock.getFeed).toHaveBeenCalledWith('sess-test-123');
    expect(service.session()).toEqual(mockSession);
    expect(service.feed()).toEqual(mockFeed);
  });

  it('should handle API errors gracefully in fetchData without unhandled exceptions', async () => {
    apiMock.getSession.and.returnValue(Promise.reject(new Error('Network failure')));
    await expectAsync(service.fetchData('sess-test-123')).toBeResolved();
    expect(service.isSyncing()).toBeFalse();
  });

  it('should attach realtime snapshot listener and stream live updates directly into session Signal', fakeAsync(() => {
    let capturedCallback: ((data: Session) => void) | null = null;
    let unsubscribeCalled = false;

    const mockFactory = jasmine.createSpy('onSnapshotFactory').and.callFake(
      (sessionId: string, cb: (data: Session) => void) => {
        expect(sessionId).toBe('sess-test-123');
        capturedCallback = cb;
        return () => {
          unsubscribeCalled = true;
        };
      }
    );

    const unsubscribe = service.attachRealtimeSnapshotListener('sess-test-123', mockFactory);
    expect(mockFactory).toHaveBeenCalled();
    expect(capturedCallback).toBeTruthy();

    // Trigger snapshot update
    const updatedSession: Session = {
      ...mockSession,
      current_tick: 12,
      metrics: { ...mockSession.metrics, institutional_trust: 92 }
    };

    capturedCallback!(updatedSession);
    expect(service.session()).toEqual(updatedSession);

    // Call returned unsubscribe function
    unsubscribe();
    expect(unsubscribeCalled).toBeTrue();
  }));

  it('should fall back to polling when onSnapshotFactory throws an error or is omitted', fakeAsync(() => {
    const errorFactory = () => {
      throw new Error('Firestore SDK unavailable in environment');
    };

    spyOn(service, 'startSync').and.callThrough();
    service.attachRealtimeSnapshotListener('sess-test-123', errorFactory as any);

    expect(service.startSync).toHaveBeenCalledWith('sess-test-123', 2500);
    service.stopSync();
  }));

  it('should poll at configured interval in startSync and terminate on stopSync', fakeAsync(() => {
    spyOn(service, 'fetchData');

    service.startSync('sess-test-123', 1000);
    expect(service.fetchData).toHaveBeenCalledWith('sess-test-123');
    (service.fetchData as jasmine.Spy).calls.reset();

    tick(1000);
    expect(service.fetchData).toHaveBeenCalledTimes(1);

    tick(1000);
    expect(service.fetchData).toHaveBeenCalledTimes(2);

    service.stopSync();
    tick(2000);
    expect(service.fetchData).toHaveBeenCalledTimes(2);
  }));
});
