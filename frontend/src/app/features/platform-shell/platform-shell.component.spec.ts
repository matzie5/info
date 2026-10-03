import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PlatformShellComponent } from './platform-shell.component';

describe('PlatformShellComponent', () => {
  let component: PlatformShellComponent;
  let fixture: ComponentFixture<PlatformShellComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformShellComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the platform shell component with initial signals', () => {
    expect(component).toBeTruthy();
    expect(component.overallScore()).toBe(52.0);
    expect(component.maturityTier()).toBe('AWARE_OPERATOR');

    // Flush initial ngOnInit request
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    expect(req.request.method).toBe('GET');
    req.flush({ overall_hygiene_index: 52.0, maturity_tier: 'AWARE_OPERATOR' });
  });

  it('should render platform header brand and title', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    req.flush({ overall_hygiene_index: 52.0, maturity_tier: 'AWARE_OPERATOR' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('INFOSPHERE v3.0');
    expect(compiled.textContent).toContain('Digital Hygiene & Cognitive Defense Platform');
  });

  it('should render navigation links for all 5 modular labs', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    req.flush({ overall_hygiene_index: 52.0, maturity_tier: 'AWARE_OPERATOR' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('nav a'));
    const hrefs = links.map(el => el.getAttribute('routerlink') || el.getAttribute('href'));

    expect(links.length).toBe(5);
    expect(compiled.textContent).toContain('M1: Disinfo ABM');
    expect(compiled.textContent).toContain('M2: Scam Lab (Vertex + DeepSeek)');
    expect(compiled.textContent).toContain('M3: Deepfake Forensics');
    expect(compiled.textContent).toContain('M4: OSINT & DLP');
    expect(compiled.textContent).toContain('M5: Echo Chamber');
  });

  it('should update hygiene passport signals upon successful API response', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    req.flush({
      overall_hygiene_index: 87.5,
      maturity_tier: 'COGNITIVE_DEFENDER'
    });
    fixture.detectChanges();

    expect(component.overallScore()).toBe(87.5);
    expect(component.maturityTier()).toBe('COGNITIVE_DEFENDER');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('87.5 / 100');
    expect(compiled.textContent).toContain('COGNITIVE_DEFENDER');
  });

  it('should handle passport endpoint HTTP failure gracefully without unhandled throw', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    req.error(new ProgressEvent('Network error'));
    fixture.detectChanges();

    // Default signal values should remain intact
    expect(component.overallScore()).toBe(52.0);
    expect(component.maturityTier()).toBe('AWARE_OPERATOR');
  });

  it('should support dynamic language switching across default and added languages', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    req.flush({ overall_hygiene_index: 52.0, maturity_tier: 'AWARE_OPERATOR' });

    // Test default languages
    expect(component.locale.availableLanguages().map(l => l.code)).toEqual(['pl', 'en', 'de', 'uk']);

    // Switch to English
    component.setLanguage('en');
    expect(component.locale.language()).toBe('en');
    expect(component.locale.t('theme.dark')).toBe('Dark');

    // Switch to Polish
    component.setLanguage('pl');
    expect(component.locale.language()).toBe('pl');
    expect(component.locale.t('theme.dark')).toBe('Ciemny');

    // Extensibility: register a new language (e.g. Spanish 'es') dynamically
    component.locale.registerLanguage(
      { code: 'es', label: 'Español', flag: '🇪🇸', nativeName: 'Español' },
      { 'theme.dark': 'Oscuro', 'theme.light': 'Claro' }
    );
    expect(component.locale.availableLanguages().some(l => l.code === 'es')).toBeTrue();
    component.setLanguage('es');
    expect(component.locale.language()).toBe('es');
    expect(component.locale.t('theme.dark')).toBe('Oscuro');
  });

  it('should toggle between dark and light themes and update DOM classes', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/v1/platform/passport/demo_user');
    req.flush({ overall_hygiene_index: 52.0, maturity_tier: 'AWARE_OPERATOR' });

    // Ensure initial mode is set
    component.theme.setTheme('dark');
    expect(component.theme.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();

    // Toggle to light mode
    component.toggleTheme();
    expect(component.theme.theme()).toBe('light');
    expect(component.theme.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('light')).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeFalse();

    // Toggle back to dark mode
    component.toggleTheme();
    expect(component.theme.theme()).toBe('dark');
    expect(component.theme.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
  });
});
